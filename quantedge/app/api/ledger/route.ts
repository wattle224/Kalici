import { NextResponse } from "next/server";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAMS = [
  "http://127.0.0.1:8000/api/ledger",
  "http://127.0.0.1:8000/ledger",
  "http://127.0.0.1:8000/api/trading",
];

const SCHEMA_VERSION = 9;
const DEFAULT_MARK = 1.1611;

function ledgerPaths(): string[] {
  return [
    join(process.cwd(), "..", "backend", "data", "ledger.json"),
    join(process.cwd(), "backend", "data", "ledger.json"),
  ];
}

function repoRoot(): string {
  // Next cwd is quantedge/ when launched via Launch-QuantEdge.bat
  const cwd = process.cwd();
  if (existsSync(join(cwd, "backend", "server.mjs"))) return cwd;
  if (existsSync(join(cwd, "..", "backend", "server.mjs"))) {
    return join(cwd, "..");
  }
  if (existsSync(join(cwd, "backend", "server.ts"))) return cwd;
  return join(cwd, "..");
}

async function ledgerHealthy(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:8000/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let startingLedger: Promise<boolean> | null = null;

/** Spawn backend/server.mjs (or tsx server.ts) if :8000 is down. */
async function ensureLedgerRunning(): Promise<boolean> {
  if (await ledgerHealthy()) return true;
  if (startingLedger) return startingLedger;

  startingLedger = (async () => {
    const root = repoRoot();
    const mjs = join(root, "backend", "server.mjs");
    const ts = join(root, "backend", "server.ts");

    try {
      if (existsSync(mjs)) {
        const child = spawn(process.execPath, [mjs], {
          cwd: root,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          env: { ...process.env, LEDGER_PORT: "8000" },
        });
        child.unref();
      } else if (existsSync(ts)) {
        const child = spawn(
          process.platform === "win32" ? "npx.cmd" : "npx",
          ["tsx", "backend/server.ts"],
          {
            cwd: root,
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            shell: process.platform === "win32",
            env: { ...process.env, LEDGER_PORT: "8000" },
          }
        );
        child.unref();
      } else {
        return false;
      }
    } catch {
      return false;
    }

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await ledgerHealthy()) return true;
    }
    return false;
  })().finally(() => {
    startingLedger = null;
  });

  return startingLedger;
}

async function fetchUpstream(
  init?: RequestInit
): Promise<{ res: Response; url: string } | null> {
  for (const url of UPSTREAMS) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        ...init,
      });
      const ctype = res.headers.get("content-type") ?? "";
      if (ctype.includes("application/json") || res.ok) {
        return { res, url };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function settledFills(trades: unknown[]) {
  return (
    trades as {
      status?: string;
      executionPrice?: number;
      quantity?: number;
      executedAt?: string;
      realizedPnL?: number | null;
    }[]
  )
    .filter(
      (t) =>
        t.status === "filled" &&
        (t.executionPrice ?? 0) > 0 &&
        (t.quantity ?? 0) > 0
    )
    .sort(
      (a, b) =>
        new Date(b.executedAt ?? 0).getTime() -
        new Date(a.executedAt ?? 0).getTime()
    );
}

function payloadFromSnapshot(
  snapshot: {
    trades?: unknown[];
    openPositions?: {
      unrealizedPnL?: number;
      quantity: number;
      averageEntryPrice: number;
      symbol: string;
    }[];
    pendingAutomations?: unknown[];
    executionState?: string;
    capital?: {
      deposit: number;
      cash: number;
      markPrice: number;
      decisions?: unknown[];
    };
  },
  source: string,
  note?: string
) {
  const history = settledFills(snapshot.trades ?? []);
  const realized =
    (snapshot.trades as { realizedPnL?: number | null }[] | undefined)?.reduce(
      (s, t) => s + (t.realizedPnL ?? 0),
      0
    ) ?? 0;
  const capital = snapshot.capital;
  const mark = capital?.markPrice ?? DEFAULT_MARK;
  const cash = capital?.cash ?? 0;
  const deposit = capital?.deposit ?? 0;
  const positions = snapshot.openPositions ?? [];
  const equity =
    cash +
    positions.reduce(
      (s, p) =>
        s +
        p.quantity *
          (p.symbol?.startsWith("XRP") ? mark : p.averageEntryPrice),
      0
    );
  const unrealized = positions.reduce(
    (s, p) => s + (p.unrealizedPnL ?? 0),
    0
  );
  return {
    ok: true,
    source,
    snapshot,
    execution: {
      label: snapshot.executionState === "running" ? "ONLINE" : "OFFLINE",
      state: snapshot.executionState,
      isOnline: snapshot.executionState === "running",
    },
    executionState: snapshot.executionState,
    openPositions: positions,
    tradeHistory: history,
    orders: history,
    pendingAutomations: snapshot.pendingAutomations ?? [],
    totalRealizedPnL: realized,
    realisedPnL: realized,
    unrealizedPnL: unrealized,
    capital,
    deposit,
    cash,
    equity,
    returnPct: deposit
      ? Math.round(((equity - deposit) / deposit) * 10000) / 100
      : 0,
    markPrice: mark,
    lastDecision: capital?.decisions?.[0] ?? null,
    decisions: capital?.decisions ?? [],
    ...(note ? { note } : {}),
  };
}

function readLedgerFile() {
  for (const path of ledgerPaths()) {
    if (!existsSync(path)) continue;
    try {
      const snapshot = JSON.parse(readFileSync(path, "utf8"));
      return payloadFromSnapshot(
        snapshot,
        "file",
        "Served from backend/data/ledger.json — start the ledger API on :8000 for live model ticks."
      );
    } catch {
      /* try next */
    }
  }
  return null;
}

function fundedSnapshot(amount: number) {
  const deposit = Math.round(Math.max(10, amount) * 100) / 100;
  const at = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    executionState: "running" as const,
    openPositions: [],
    trades: [],
    pendingAutomations: [],
    capital: {
      deposit,
      cash: deposit,
      currency: "GBP",
      markPrice: DEFAULT_MARK,
      lastDecisionAt: at,
      decisions: [
        {
          id: `fund-${Date.now()}`,
          at,
          action: "HOLD" as const,
          symbol: "XRP-USD",
          reason: `Account funded with £${deposit.toFixed(2)}. Model waiting for opportunity.`,
          score: 0,
          cashAfter: deposit,
        },
      ],
    },
  };
}

/** Persist deposit even when :8000 is down or running an outdated build. */
function writeDepositToFile(amount: number) {
  const snapshot = fundedSnapshot(amount);
  for (const path of ledgerPaths()) {
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(snapshot, null, 2));
      return payloadFromSnapshot(
        snapshot,
        "file-fund",
        "Deposit saved to ledger.json. If the model does not tick, close any old ledger window and re-run Launch-QuantEdge.bat."
      );
    } catch {
      /* try next path */
    }
  }
  return null;
}

export async function GET() {
  try {
    let upstream = await fetchUpstream();
    if (!upstream) {
      await ensureLedgerRunning();
      upstream = await fetchUpstream();
    }
    if (upstream) {
      const body = await upstream.res.json();
      // Prefer live API when it understands the capital account.
      if (
        upstream.res.ok &&
        (typeof body?.deposit === "number" ||
          typeof body?.capital?.deposit === "number")
      ) {
        return NextResponse.json(
          { ...body, source: "api:8000" },
          { status: 200 }
        );
      }
      // Live server is outdated / missing capital — prefer on-disk funded account.
      const file = readLedgerFile();
      if (file && typeof file.deposit === "number" && file.deposit >= 10) {
        return NextResponse.json(file);
      }
      return NextResponse.json(
        { ...body, source: "api:8000" },
        { status: upstream.res.status }
      );
    }

    const file = readLedgerFile();
    if (file) {
      return NextResponse.json(file);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Ledger unreachable on :8000. Double-click Update-And-Launch-QuantEdge.bat and keep both KEEP OPEN windows running.",
      },
      { status: 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Ledger proxy GET failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    let parsed: {
      action?: string;
      amount?: number;
      deposit?: number;
    } = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const isFund =
      parsed.action === "set-deposit" || parsed.action === "clean-restart";
    const amount = Number(parsed.amount ?? parsed.deposit);

    if (parsed.action === "start-ledger") {
      const ok = await ensureLedgerRunning();
      return NextResponse.json(
        ok
          ? { ok: true, started: true, source: "api:8000" }
          : {
              ok: false,
              error:
                "Could not start ledger on :8000. Double-click Start-Ledger.bat in the repo root.",
            },
        { status: ok ? 200 : 503 }
      );
    }

    if (parsed.action === "set-deposit") {
      if (!Number.isFinite(amount) || amount < 10) {
        return NextResponse.json(
          {
            ok: false,
            error: "Deposit must be at least £10 (e.g. 100, 500, 1000).",
          },
          { status: 400 }
        );
      }
    }

    // If ledger is down, start it before attempting fund — this is the usual
    // Windows failure mode (Next UI up, ledger window closed).
    let upstream = await fetchUpstream({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });

    if (!upstream && (isFund || parsed.action === "start-ledger")) {
      await ensureLedgerRunning();
      upstream = await fetchUpstream({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
      });
    }

    if (upstream) {
      const data = (await upstream.res.json()) as {
        ok?: boolean;
        deposit?: number;
        capital?: { deposit?: number };
        error?: string;
        hint?: string;
      };
      const funded =
        upstream.res.ok &&
        (typeof data.deposit === "number" ||
          typeof data.capital?.deposit === "number");
      if (funded) {
        return NextResponse.json(
          { ...data, source: "api:8000" },
          { status: 200 }
        );
      }

      // Outdated ledger build (no set-deposit) or validation error from :8000.
      const outdated =
        /unknown action/i.test(data.error ?? "") ||
        /unknown action/i.test(data.hint ?? "");
      if (isFund && Number.isFinite(amount) && amount >= 10 && outdated) {
        const file = writeDepositToFile(amount);
        if (file) {
          return NextResponse.json({
            ...file,
            warning:
              "Ledger on :8000 is outdated. Deposit was saved to disk — re-run Update-And-Launch-QuantEdge.bat.",
          });
        }
      }

      if (!isFund || !Number.isFinite(amount) || amount < 10) {
        return NextResponse.json(
          { ...data, source: "api:8000" },
          { status: upstream.res.status }
        );
      }
      // Fall through to file fund for set-deposit when upstream rejected oddly.
    }

    // Always persist the deposit even if :8000 never came up.
    if (isFund && Number.isFinite(amount) && amount >= 10) {
      const file = writeDepositToFile(amount);
      if (file) {
        return NextResponse.json({
          ...file,
          warning:
            "Ledger :8000 was not reachable — deposit saved locally. Click Start Ledger or run Start-Ledger.bat for live trades.",
        });
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Cannot set deposit — ledger :8000 is not running. Double-click Start-Ledger.bat (or Update-And-Launch-QuantEdge.bat) and keep that window open.",
      },
      { status: 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Ledger proxy POST failed",
      },
      { status: 500 }
    );
  }
}

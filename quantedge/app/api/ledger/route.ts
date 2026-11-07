import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAMS = [
  "http://127.0.0.1:8000/api/ledger",
  "http://127.0.0.1:8000/ledger",
  "http://127.0.0.1:8000/api/trading",
];

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
      // Accept any JSON response (incl. 400 validation errors) from a live ledger.
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

function readLedgerFile() {
  const candidates = [
    join(process.cwd(), "..", "backend", "data", "ledger.json"),
    join(process.cwd(), "backend", "data", "ledger.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const snapshot = JSON.parse(readFileSync(path, "utf8")) as {
        trades?: unknown[];
        openPositions?: { unrealizedPnL?: number; quantity: number; averageEntryPrice: number; symbol: string }[];
        pendingAutomations?: unknown[];
        executionState?: string;
        capital?: {
          deposit: number;
          cash: number;
          markPrice: number;
          decisions?: unknown[];
        };
      };
      const history = settledFills(snapshot.trades ?? []);
      const realized = (
        snapshot.trades as { realizedPnL?: number | null }[] | undefined
      )?.reduce((s, t) => s + (t.realizedPnL ?? 0), 0) ?? 0;
      const capital = snapshot.capital;
      const mark = capital?.markPrice ?? 1.1611;
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
        source: "file",
        snapshot,
        execution: {
          label:
            snapshot.executionState === "running" ? "ONLINE" : "OFFLINE",
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
        note: "Served from backend/data/ledger.json — start the ledger API on :8000 for live model ticks.",
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function GET() {
  try {
    const upstream = await fetchUpstream();
    if (upstream) {
      const body = await upstream.res.json();
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
          "Ledger unreachable on :8000 and no backend/data/ledger.json found. Start Launch-QuantEdge.bat.",
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
    const body = await request.text();
    const upstream = await fetchUpstream({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (upstream) {
      const data = await upstream.res.json();
      return NextResponse.json(
        { ...data, source: "api:8000" },
        { status: upstream.res.status }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          "Cannot set deposit — ledger API on :8000 is not running. Start Launch-QuantEdge.bat (keep the ledger window open).",
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

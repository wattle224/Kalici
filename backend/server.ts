/**
 * Ledger API — port 8000 (Investment Management desktop app expects this).
 * Run: npx tsx backend/server.ts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { activitySummary } from "../web/lib/automation";
import { getExecutionStatus } from "../web/lib/executionStatus";
import { hydrateSnapshot } from "../web/lib/hydrate";
import { totalRealizedPnL } from "../web/lib/realization";
import {
  cleanBootstrap,
  settledFills,
  skippedWhilePaused,
  type TradingSnapshotWithAutomation,
} from "../web/lib/trading";

const PORT = Number(process.env.LEDGER_PORT ?? 8000);
const HOST = process.env.LEDGER_HOST ?? "127.0.0.1";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const LEDGER_FILE = join(DATA_DIR, "ledger.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore(): TradingSnapshotWithAutomation {
  ensureDataDir();
  if (!existsSync(LEDGER_FILE)) {
    const fresh = hydrateSnapshot(cleanBootstrap());
    writeFileSync(LEDGER_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  try {
    const raw = readFileSync(LEDGER_FILE, "utf8");
    return hydrateSnapshot(JSON.parse(raw) as TradingSnapshotWithAutomation);
  } catch {
    const fresh = hydrateSnapshot(cleanBootstrap());
    saveStore(fresh);
    return fresh;
  }
}

function saveStore(snapshot: TradingSnapshotWithAutomation): void {
  ensureDataDir();
  writeFileSync(LEDGER_FILE, JSON.stringify(snapshot, null, 2));
}

function refreshStore(): TradingSnapshotWithAutomation {
  const next = hydrateSnapshot(loadStore());
  saveStore(next);
  return next;
}

function buildLedgerPayload(snapshot: TradingSnapshotWithAutomation, now = Date.now()) {
  const history = settledFills(snapshot.trades);
  const activity = activitySummary(snapshot.trades, now);
  const execution = getExecutionStatus(
    snapshot.executionState,
    snapshot.trades,
    snapshot.pendingAutomations,
    now
  );
  return {
    ok: true,
    execution,
    executionState: snapshot.executionState,
    openPositions: snapshot.openPositions,
    tradeHistory: history,
    orders: history,
    last2Hours: activity,
    skippedWhilePaused: skippedWhilePaused(snapshot.trades),
    pendingAutomations: snapshot.pendingAutomations ?? [],
    totalRealizedPnL: totalRealizedPnL(snapshot.trades),
    realisedPnL: totalRealizedPnL(snapshot.trades),
    symbols: [...new Set(history.map((t) => t.symbol))].sort(),
    snapshot,
  };
}

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function route(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const path = route(url.pathname);
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/health" || path === "/api/health") {
    json(res, 200, { ok: true, service: "kalici-ledger", port: PORT });
    return;
  }

  if (
    (path === "/api/ledger" || path === "/ledger" || path === "/api/trading") &&
    method === "GET"
  ) {
    const snapshot = refreshStore();
    json(res, 200, buildLedgerPayload(snapshot));
    return;
  }

  if (
    (path === "/api/ledger" || path === "/ledger" || path === "/api/trading") &&
    method === "POST"
  ) {
    let body: { action?: string; snapshot?: TradingSnapshotWithAutomation } = {};
    try {
      const raw = await readBody(req);
      if (raw) body = JSON.parse(raw);
    } catch {
      json(res, 400, { ok: false, error: "Invalid JSON" });
      return;
    }

    if (body.action === "clean-restart") {
      const snapshot = hydrateSnapshot(cleanBootstrap());
      saveStore(snapshot);
      json(res, 200, { ok: true, ...buildLedgerPayload(snapshot) });
      return;
    }

    if (body.snapshot) {
      const snapshot = hydrateSnapshot(body.snapshot);
      saveStore(snapshot);
      json(res, 200, { ok: true, ...buildLedgerPayload(snapshot) });
      return;
    }

    json(res, 400, { ok: false, error: "Unknown action" });
    return;
  }

  json(res, 404, {
    ok: false,
    error: "Not found",
    hint: "GET /api/ledger or GET /health",
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Kalici ledger API http://${HOST}:${PORT}`);
  console.log(`  GET  /api/ledger`);
  console.log(`  POST /api/ledger  { "action": "clean-restart" }`);
  console.log(`  GET  /health`);
});

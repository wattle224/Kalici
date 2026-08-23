/**
 * Standalone ledger API — port 8000. Pure Node.js (no tsx). IAM app requires this.
 * Start: node backend/server.mjs
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.LEDGER_PORT ?? 8000);
const HOST = process.env.LEDGER_HOST ?? "127.0.0.1";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const LEDGER_FILE = join(DATA_DIR, "ledger.json");

const XRP_LOT = 6.388578;

function cleanBootstrap() {
  const now = Date.now();
  const buyPrice = 1.1611;
  const sellPrice = 1.1454;
  const realized = Math.round((sellPrice - buyPrice) * XRP_LOT * 10000) / 10000;
  return {
    schemaVersion: 8,
    executionState: "running",
    openPositions: [],
    trades: [
      {
        id: "xrp-buy-1",
        symbol: "XRP-USD",
        side: "buy",
        orderType: "MARKET",
        quantity: XRP_LOT,
        executionPrice: buyPrice,
        executedAt: new Date(now - 3 * 3600_000).toISOString(),
        orderReference: "LOCAL-134807",
        source: "local",
        status: "filled",
        realizedPnL: null,
      },
      {
        id: "xrp-sell-1",
        symbol: "XRP-USD",
        side: "sell",
        orderType: "MARKET",
        quantity: XRP_LOT,
        executionPrice: sellPrice,
        executedAt: new Date(new Date(now - 2.5 * 3600_000)).toISOString(),
        orderReference: "LOCAL-141913",
        source: "local",
        status: "filled",
        realizedPnL: realized,
      },
    ],
    pendingAutomations: [],
  };
}

function settledFills(trades) {
  return trades
    .filter((t) => t.status === "filled" && t.executionPrice > 0 && t.quantity > 0)
    .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
}

function totalRealizedPnL(trades) {
  return trades.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);
}

function loadStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(LEDGER_FILE)) {
    const fresh = cleanBootstrap();
    writeFileSync(LEDGER_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  try {
    return JSON.parse(readFileSync(LEDGER_FILE, "utf8"));
  } catch {
    const fresh = cleanBootstrap();
    writeFileSync(LEDGER_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function saveStore(snapshot) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LEDGER_FILE, JSON.stringify(snapshot, null, 2));
}

function buildPayload(snapshot) {
  const history = settledFills(snapshot.trades ?? []);
  const realized = totalRealizedPnL(snapshot.trades ?? []);
  return {
    ok: true,
    snapshot,
    execution: {
      label: snapshot.executionState === "running" ? "ONLINE" : "OFFLINE",
      state: snapshot.executionState,
      isOnline: snapshot.executionState === "running",
    },
    executionState: snapshot.executionState,
    openPositions: snapshot.openPositions ?? [],
    tradeHistory: history,
    orders: history,
    totalRealizedPnL: realized,
    realisedPnL: realized,
    symbols: [...new Set(history.map((t) => t.symbol))].sort(),
  };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const LEDGER_PATHS = new Set([
  "/api/ledger",
  "/ledger",
  "/api/trading",
  "/api/orders",
  "/orders",
]);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
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

  if (LEDGER_PATHS.has(path) && method === "GET") {
    json(res, 200, buildPayload(loadStore()));
    return;
  }

  if (LEDGER_PATHS.has(path) && method === "POST") {
    let body = {};
    try {
      const raw = await readBody(req);
      if (raw) body = JSON.parse(raw);
    } catch {
      json(res, 400, { ok: false, error: "Invalid JSON" });
      return;
    }
    if (body.action === "clean-restart") {
      const snapshot = cleanBootstrap();
      saveStore(snapshot);
      json(res, 200, buildPayload(snapshot));
      return;
    }
    if (body.snapshot) {
      saveStore(body.snapshot);
      json(res, 200, buildPayload(body.snapshot));
      return;
    }
    json(res, 400, { ok: false, error: "Unknown action" });
    return;
  }

  json(res, 404, { ok: false, error: "Not found", hint: "GET /api/ledger" });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  Kalici Ledger API — RUNNING");
  console.log(`  http://${HOST}:${PORT}/health`);
  console.log(`  http://${HOST}:${PORT}/api/ledger`);
  console.log("");
  console.log("  Keep this window open while using Investment Management.");
  console.log("");
});

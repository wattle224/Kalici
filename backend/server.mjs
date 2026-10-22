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

  if ((path === "/api/coinbase" || path === "/coinbase") && method === "GET") {
    try {
      const products = (url.searchParams.get("products") || "XRP-USD,ETH-USD,BTC-USD")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const started = Date.now();
      const tickers = [];
      const errors = [];
      for (const product of products) {
        try {
          const r = await fetch(
            `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/ticker`
          );
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          const price = Number(data.price);
          if (!Number.isFinite(price) || price <= 0) throw new Error("bad price");
          tickers.push({
            symbol: product,
            price,
            bid: Number(data.bid) || null,
            ask: Number(data.ask) || null,
            volume: Number(data.volume) || null,
            time: data.time || null,
            source: "exchange",
          });
        } catch (err) {
          errors.push(`${product}: ${err.message || err}`);
        }
      }
      json(res, tickers.length ? 200 : 503, {
        ok: tickers.length > 0,
        connected: tickers.length > 0,
        service: "coinbase",
        message: tickers.length
          ? `Connected to Coinbase — ${tickers.length} product(s)`
          : "Could not reach Coinbase APIs",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
        products: tickers,
        ...(errors.length ? { error: errors.join("; ") } : {}),
      });
    } catch (err) {
      json(res, 503, {
        ok: false,
        connected: false,
        service: "coinbase",
        message: "Coinbase check failed",
        checkedAt: new Date().toISOString(),
        latencyMs: 0,
        products: [],
        error: err.message || String(err),
      });
    }
    return;
  }

  if ((path === "/api/coinbase/market" || path === "/coinbase/market") && method === "GET") {
    const product = (url.searchParams.get("product") || "XRP-USD").toUpperCase();
    const granularity = Number(url.searchParams.get("granularity") || 3600);
    const limit = Number(url.searchParams.get("limit") || 48);
    const depth = Number(url.searchParams.get("depth") || 20);
    try {
      const [candlesRes, bookRes] = await Promise.all([
        fetch(
          `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles?granularity=${granularity}`
        ),
        fetch(
          `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/book?level=2`
        ),
      ]);
      if (!candlesRes.ok) throw new Error(`candles HTTP ${candlesRes.status}`);
      if (!bookRes.ok) throw new Error(`book HTTP ${bookRes.status}`);
      const rawCandles = await candlesRes.json();
      const rawBook = await bookRes.json();
      const candles = (Array.isArray(rawCandles) ? rawCandles : [])
        .map((row) => ({
          time: Number(row[0]),
          low: Number(row[1]),
          high: Number(row[2]),
          open: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
        }))
        .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
        .sort((a, b) => a.time - b.time)
        .slice(-Math.max(2, limit));
      const parseSide = (rows) =>
        (Array.isArray(rows) ? rows : [])
          .map((row) => ({
            price: Number(row[0]),
            size: Number(row[1]),
            numOrders: Number(row[2]) || 0,
          }))
          .filter((l) => l.price > 0 && l.size > 0)
          .slice(0, depth);
      const bids = parseSide(rawBook.bids);
      const asks = parseSide(rawBook.asks);
      const bestBid = bids[0]?.price ?? null;
      const bestAsk = asks[0]?.price ?? null;
      json(res, 200, {
        ok: true,
        product,
        candles,
        book: {
          symbol: product,
          bids,
          asks,
          time: rawBook.time || null,
          mid: bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null,
          spread: bestBid != null && bestAsk != null ? bestAsk - bestBid : null,
        },
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      json(res, 503, {
        ok: false,
        product,
        candles: [],
        book: null,
        error: err.message || String(err),
        fetchedAt: new Date().toISOString(),
      });
    }
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

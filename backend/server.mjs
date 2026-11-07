/**
 * Deposit-funded simulation ledger — port 8000.
 * Pure Node.js (no tsx). Start: node backend/server.mjs
 *
 * Supports:
 *   GET  /api/ledger
 *   POST /api/ledger { "action": "set-deposit", "amount": 1000 }
 *   POST /api/ledger { "action": "clean-restart", "amount": 1000 }
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

const SCHEMA_VERSION = 9;
const DEFAULT_DEPOSIT = 1000;
const PRIMARY = "XRP-USD";
const DECISION_INTERVAL_MS = 18_000;
const CASH_RESERVE_FRAC = 0.08;
const MAX_EXPOSURE_FRAC = 0.55;
const BUY_FRAC = 0.18;
const TAKE_PROFIT = 0.028;
const STOP_LOSS = 0.022;
const MIN_NOTIONAL = 15;

const round4 = (n) => Math.round(n * 10000) / 10000;
const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function freshCapital(deposit = DEFAULT_DEPOSIT) {
  const d = Math.max(10, round2(deposit));
  return {
    deposit: d,
    cash: d,
    currency: "GBP",
    markPrice: 1.1611,
    lastDecisionAt: new Date().toISOString(),
    decisions: [
      {
        id: `fund-${Date.now()}`,
        at: new Date().toISOString(),
        action: "HOLD",
        symbol: PRIMARY,
        reason: `Account funded with £${d.toFixed(2)}. Model waiting for opportunity.`,
        score: 0,
        cashAfter: d,
      },
    ],
  };
}

function cleanBootstrap(deposit = DEFAULT_DEPOSIT) {
  return {
    schemaVersion: SCHEMA_VERSION,
    executionState: "running",
    openPositions: [],
    trades: [],
    pendingAutomations: [],
    capital: freshCapital(deposit),
  };
}

function settledFills(trades) {
  return (trades ?? [])
    .filter((t) => t.status === "filled" && t.executionPrice > 0 && t.quantity > 0)
    .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
}

function positionValue(positions, mark) {
  return (positions ?? []).reduce((s, p) => {
    const px = p.symbol?.startsWith("XRP") ? mark : p.averageEntryPrice;
    return s + p.quantity * px;
  }, 0);
}

function equityValue(cash, positions, mark) {
  return cash + positionValue(positions, mark);
}

function returnPct(equity, deposit) {
  if (!deposit) return 0;
  return round2(((equity - deposit) / deposit) * 100);
}

function nextMark(prev, now) {
  const t = (now % 10000) / 10000;
  const wave = Math.sin(now / 40000) * 0.006;
  const noise = (t - 0.5) * 0.008;
  return round4(clamp(prev * (1 + wave + noise), 0.4, 5));
}

function scoreOpportunity(capital, positions, trades, mark, now) {
  const reasons = [];
  let score = 0;
  const recent = settledFills(trades).filter(
    (t) => now - new Date(t.executedAt).getTime() <= 30 * 60_000
  );
  if (recent.length >= 2) {
    const newest = recent[0].executionPrice;
    const older = recent[Math.min(3, recent.length - 1)].executionPrice;
    const mom = (newest - older) / older;
    score += clamp(mom * 25, -0.45, 0.45);
    reasons.push(`momentum ${(mom * 100).toFixed(2)}%`);
  } else {
    const dist = (mark - 1.1611) / 1.1611;
    score -= clamp(dist * 8, -0.25, 0.25);
    reasons.push(`thin history — mean-reversion ${(dist * 100).toFixed(2)}%`);
  }

  const position = (positions ?? []).find((p) => p.symbol === PRIMARY);
  const equity = equityValue(capital.cash, positions, mark);
  const exposure = equity > 0 ? positionValue(positions, mark) / equity : 0;

  if (position && position.quantity > 0) {
    const upnlPct = (mark - position.averageEntryPrice) / position.averageEntryPrice;
    if (upnlPct >= TAKE_PROFIT) {
      score -= 0.55;
      reasons.push(`take-profit +${(upnlPct * 100).toFixed(2)}%`);
    } else if (upnlPct <= -STOP_LOSS) {
      score -= 0.65;
      reasons.push(`stop-loss ${(upnlPct * 100).toFixed(2)}%`);
    } else {
      reasons.push(`open ${(upnlPct * 100).toFixed(2)}% · exposure ${(exposure * 100).toFixed(0)}%`);
    }
  } else {
    const cashFrac = equity > 0 ? capital.cash / equity : 1;
    if (cashFrac > 0.85) {
      score += 0.35;
      reasons.push(`high cash ${(cashFrac * 100).toFixed(0)}%`);
    }
  }
  if (exposure > MAX_EXPOSURE_FRAC) {
    score -= 0.4;
    reasons.push(`exposure cap`);
  }
  score += Math.sin(now / 90000) * 0.12;
  return { score: clamp(score, -1, 1), reasons };
}

function upsertPosition(positions, trade, mark) {
  const list = [...(positions ?? [])];
  const idx = list.findIndex((p) => p.symbol === trade.symbol);
  if (idx < 0 && trade.side === "buy") {
    list.push({
      symbol: trade.symbol,
      quantity: trade.quantity,
      averageEntryPrice: trade.executionPrice,
      unrealizedPnL: round4((mark - trade.executionPrice) * trade.quantity),
      quoteCurrency: "GBP",
    });
    return list;
  }
  if (idx < 0) return list;
  const p = list[idx];
  if (trade.side === "buy") {
    const newQty = p.quantity + trade.quantity;
    const avg =
      (p.averageEntryPrice * p.quantity + trade.executionPrice * trade.quantity) /
      newQty;
    list[idx] = {
      ...p,
      quantity: round4(newQty),
      averageEntryPrice: round4(avg),
      unrealizedPnL: round4((mark - avg) * newQty),
    };
  } else {
    const newQty = Math.max(0, p.quantity - trade.quantity);
    if (newQty < 1e-8) list.splice(idx, 1);
    else {
      list[idx] = {
        ...p,
        quantity: round4(newQty),
        unrealizedPnL: round4((mark - p.averageEntryPrice) * newQty),
      };
    }
  }
  return list;
}

function pushDecision(snapshot, decision) {
  const decisions = [decision, ...(snapshot.capital.decisions ?? [])].slice(0, 40);
  return {
    ...snapshot,
    capital: {
      ...snapshot.capital,
      lastDecisionAt: decision.at,
      decisions,
      markPrice: decision.price ?? snapshot.capital.markPrice,
      cash: decision.cashAfter ?? snapshot.capital.cash,
    },
  };
}

function tick(snapshot, now = Date.now()) {
  if (!snapshot.capital) snapshot = { ...snapshot, capital: freshCapital() };
  if (snapshot.executionState !== "running") return snapshot;

  const lastAt = snapshot.capital.lastDecisionAt
    ? new Date(snapshot.capital.lastDecisionAt).getTime()
    : 0;
  const mark = nextMark(snapshot.capital.markPrice || 1.1611, now);

  // Refresh unrealised between decisions
  let positions = (snapshot.openPositions ?? []).map((p) =>
    p.symbol?.startsWith("XRP")
      ? { ...p, unrealizedPnL: round4((mark - p.averageEntryPrice) * p.quantity) }
      : p
  );

  if (now - lastAt < DECISION_INTERVAL_MS) {
    return {
      ...snapshot,
      openPositions: positions,
      capital: { ...snapshot.capital, markPrice: mark },
    };
  }

  const { score, reasons } = scoreOpportunity(
    snapshot.capital,
    positions,
    snapshot.trades,
    mark,
    now
  );
  const reason = reasons.join("; ");
  const position = positions.find((p) => p.symbol === PRIMARY);
  const equity = equityValue(snapshot.capital.cash, positions, mark);
  const reserve = snapshot.capital.deposit * CASH_RESERVE_FRAC;
  const spendable = Math.max(0, snapshot.capital.cash - reserve);
  const exposure = equity > 0 ? positionValue(positions, mark) / equity : 0;

  // SELL
  if (position && position.quantity > 0) {
    const upnlPct =
      (mark - position.averageEntryPrice) / position.averageEntryPrice;
    if (upnlPct >= TAKE_PROFIT || upnlPct <= -STOP_LOSS || score < -0.25) {
      const sellFrac = upnlPct <= -STOP_LOSS || score < -0.45 ? 1 : 0.5;
      const qty = round4(position.quantity * sellFrac);
      const notional = round2(qty * mark);
      const realized = round4((mark - position.averageEntryPrice) * qty);
      const cash = round2(snapshot.capital.cash + notional);
      const trade = {
        id: `mdl-sell-${now}`,
        symbol: PRIMARY,
        side: "sell",
        orderType: "MARKET",
        quantity: qty,
        executionPrice: mark,
        executedAt: new Date(now).toISOString(),
        orderReference: `LOCAL-${String(now).slice(-6)}`,
        source: "model",
        status: "filled",
        realizedPnL: realized,
      };
      positions = upsertPosition(positions, trade, mark);
      return pushDecision(
        {
          ...snapshot,
          trades: [...(snapshot.trades ?? []), trade],
          openPositions: positions,
          capital: { ...snapshot.capital, cash, markPrice: mark },
        },
        {
          id: `dec-${now}`,
          at: new Date(now).toISOString(),
          action: "SELL",
          symbol: PRIMARY,
          reason: `Model SELL — score ${score.toFixed(2)} (${reason}) · realised ${realized >= 0 ? "+" : ""}${realized.toFixed(4)}`,
          score: round4(score),
          quantity: qty,
          price: mark,
          notional,
          cashAfter: cash,
        }
      );
    }
  }

  // BUY
  if (score > 0.22 && spendable >= MIN_NOTIONAL && exposure < MAX_EXPOSURE_FRAC) {
    const buyCash = Math.min(
      spendable * (BUY_FRAC + Math.min(0.12, score * 0.15)),
      spendable,
      equity * (MAX_EXPOSURE_FRAC - exposure)
    );
    if (buyCash >= MIN_NOTIONAL) {
      const qty = round4(buyCash / mark);
      const notional = round2(qty * mark);
      if (notional <= snapshot.capital.cash + 1e-9) {
        const cash = round2(snapshot.capital.cash - notional);
        const trade = {
          id: `mdl-buy-${now}`,
          symbol: PRIMARY,
          side: "buy",
          orderType: "MARKET",
          quantity: qty,
          executionPrice: mark,
          executedAt: new Date(now).toISOString(),
          orderReference: `LOCAL-${String(now).slice(-6)}`,
          source: "model",
          status: "filled",
          realizedPnL: null,
        };
        positions = upsertPosition(positions, trade, mark);
        return pushDecision(
          {
            ...snapshot,
            trades: [...(snapshot.trades ?? []), trade],
            openPositions: positions,
            capital: { ...snapshot.capital, cash, markPrice: mark },
          },
          {
            id: `dec-${now}`,
            at: new Date(now).toISOString(),
            action: "BUY",
            symbol: PRIMARY,
            reason: `Model BUY — score ${score.toFixed(2)} (${reason})`,
            score: round4(score),
            quantity: qty,
            price: mark,
            notional,
            cashAfter: cash,
          }
        );
      }
    }
  }

  return pushDecision(
    {
      ...snapshot,
      openPositions: positions,
      capital: { ...snapshot.capital, markPrice: mark },
    },
    {
      id: `dec-${now}`,
      at: new Date(now).toISOString(),
      action: "HOLD",
      symbol: PRIMARY,
      reason: `Model HOLD — score ${score.toFixed(2)} (${reason})`,
      score: round4(score),
      cashAfter: snapshot.capital.cash,
    }
  );
}

function loadStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(LEDGER_FILE)) {
    const fresh = cleanBootstrap();
    writeFileSync(LEDGER_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  try {
    const parsed = JSON.parse(readFileSync(LEDGER_FILE, "utf8"));
    if (
      !parsed.capital ||
      typeof parsed.capital.deposit !== "number" ||
      (parsed.schemaVersion ?? 0) < SCHEMA_VERSION
    ) {
      const fresh = cleanBootstrap();
      writeFileSync(LEDGER_FILE, JSON.stringify(fresh, null, 2));
      return fresh;
    }
    return parsed;
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

function refreshStore() {
  const next = tick(loadStore());
  saveStore(next);
  return next;
}

function setDeposit(amount) {
  const snapshot = cleanBootstrap(amount);
  saveStore(snapshot);
  return tick(snapshot);
}

function buildPayload(snapshot) {
  const history = settledFills(snapshot.trades ?? []);
  const capital = snapshot.capital ?? freshCapital();
  const mark = capital.markPrice ?? 1.1611;
  const cash = capital.cash ?? 0;
  const deposit = capital.deposit ?? 0;
  const equity = equityValue(cash, snapshot.openPositions ?? [], mark);
  const realized = (snapshot.trades ?? []).reduce(
    (s, t) => s + (t.realizedPnL ?? 0),
    0
  );
  const unrealized = (snapshot.openPositions ?? []).reduce(
    (s, p) => s + (p.unrealizedPnL ?? 0),
    0
  );
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
    pendingAutomations: snapshot.pendingAutomations ?? [],
    totalRealizedPnL: realized,
    realisedPnL: realized,
    unrealizedPnL: unrealized,
    capital,
    deposit,
    cash,
    equity,
    returnPct: returnPct(equity, deposit),
    markPrice: mark,
    lastDecision: capital.decisions?.[0] ?? null,
    decisions: capital.decisions ?? [],
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
  try {
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
      json(res, 200, buildPayload(refreshStore()));
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

      if (body.action === "set-deposit" || body.action === "clean-restart") {
        const amount = Number(body.amount ?? body.deposit);
        if (body.action === "set-deposit" && (!Number.isFinite(amount) || amount < 10)) {
          json(res, 400, { ok: false, error: "amount must be a number >= 10" });
          return;
        }
        const funded = Number.isFinite(amount) && amount >= 10 ? amount : DEFAULT_DEPOSIT;
        const snapshot = setDeposit(funded);
        saveStore(snapshot);
        json(res, 200, buildPayload(snapshot));
        return;
      }

      if (body.snapshot) {
        const snapshot = tick(body.snapshot);
        saveStore(snapshot);
        json(res, 200, buildPayload(snapshot));
        return;
      }

      json(res, 400, {
        ok: false,
        error: "Unknown action",
        hint: 'Use { "action": "set-deposit", "amount": 1000 }',
      });
      return;
    }

    json(res, 404, { ok: false, error: "Not found", hint: "GET /api/ledger" });
  } catch (err) {
    console.error("Ledger error:", err);
    json(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : "Internal ledger error",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  Kalici Ledger API — RUNNING (deposit model)");
  console.log(`  http://${HOST}:${PORT}/health`);
  console.log(`  http://${HOST}:${PORT}/api/ledger`);
  console.log('  Fund: POST { "action": "set-deposit", "amount": 1000 }');
  console.log("");
});

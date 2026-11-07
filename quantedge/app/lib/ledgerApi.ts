/** Client for the Kalici ledger API (deposit-funded simulation) on :8000. */

export type LedgerTrade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "MARKET" | "LIMIT" | string;
  quantity: number;
  executionPrice: number;
  executedAt: string;
  orderReference: string;
  source: string;
  status: "filled" | "skipped" | "pending" | string;
  realizedPnL: number | null;
};

export type LedgerPosition = {
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
  unrealizedPnL: number;
  quoteCurrency?: string;
};

export type PendingAutomation = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executeAt: string;
  source: string;
};

export type ModelDecision = {
  id: string;
  at: string;
  action: "BUY" | "SELL" | "HOLD";
  symbol: string;
  reason: string;
  score: number;
  quantity?: number;
  price?: number;
  notional?: number;
  cashAfter?: number;
};

export type CapitalAccount = {
  deposit: number;
  cash: number;
  currency: string;
  markPrice: number;
  lastDecisionAt?: string;
  decisions?: ModelDecision[];
};

export type LedgerPayload = {
  ok?: boolean;
  executionState?: "running" | "paused" | string;
  execution?: {
    label?: "ONLINE" | "OFFLINE" | string;
    state?: string;
    isOnline?: boolean;
    pendingCount?: number;
  };
  openPositions?: LedgerPosition[];
  tradeHistory?: LedgerTrade[];
  orders?: LedgerTrade[];
  pendingAutomations?: PendingAutomation[];
  totalRealizedPnL?: number;
  realisedPnL?: number;
  unrealizedPnL?: number;
  capital?: CapitalAccount;
  deposit?: number;
  cash?: number;
  equity?: number;
  returnPct?: number;
  markPrice?: number;
  lastDecision?: ModelDecision | null;
  decisions?: ModelDecision[];
  last2Hours?: {
    windowHours: number;
    total: number;
    buys: number;
    sells: number;
  };
  snapshot?: {
    trades?: LedgerTrade[];
    openPositions?: LedgerPosition[];
    pendingAutomations?: PendingAutomation[];
    executionState?: string;
    capital?: CapitalAccount;
  };
};

export type SimulationSummary = {
  connected: boolean;
  executionLabel: "ONLINE" | "OFFLINE" | "UNKNOWN";
  executionState: string;
  tradesCompleted: number;
  ordersSubmitted: number;
  ordersPending: number;
  ordersRecorded: number;
  buys: number;
  sells: number;
  last2hFills: number;
  realizedPnL: number;
  unrealizedPnL: number;
  deposit: number;
  cash: number;
  equity: number;
  returnPct: number;
  markPrice: number;
  lastDecision: ModelDecision | null;
  decisions: ModelDecision[];
  positions: LedgerPosition[];
  recentFills: LedgerTrade[];
  pending: PendingAutomation[];
  error: string | null;
  fetchedAt: number | null;
};

const LEDGER_URLS = [
  "/api/ledger",
  "http://127.0.0.1:8000/api/ledger",
  "http://127.0.0.1:8000/ledger",
  "http://127.0.0.1:8000/api/trading",
  "http://localhost:8000/api/ledger",
];

async function tryFetch(
  url: string,
  init?: RequestInit
): Promise<LedgerPayload> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err?.error) detail = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as LedgerPayload;
}

export async function fetchLedger(): Promise<LedgerPayload> {
  let last: Error | null = null;
  for (const url of LEDGER_URLS) {
    try {
      return await tryFetch(url);
    } catch (e) {
      last = e instanceof Error ? e : new Error("fetch failed");
    }
  }
  throw (
    last ??
    new Error(
      "Ledger unreachable. Start it with Launch-QuantEdge.bat (starts :8000)."
    )
  );
}

export async function setDeposit(amount: number): Promise<LedgerPayload> {
  const body = JSON.stringify({ action: "set-deposit", amount });
  let last: Error | null = null;
  for (const url of [
    "/api/ledger",
    "http://127.0.0.1:8000/api/ledger",
    "http://127.0.0.1:8000/api/trading",
  ]) {
    try {
      return await tryFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (e) {
      last = e instanceof Error ? e : new Error("fetch failed");
    }
  }
  throw last ?? new Error("Could not set deposit");
}

export function summariseLedger(payload: LedgerPayload): SimulationSummary {
  const snapshot = payload.snapshot;
  const allTrades = snapshot?.trades ?? [];
  const settled =
    payload.tradeHistory ??
    payload.orders ??
    allTrades.filter(
      (t) => t.status === "filled" && t.executionPrice > 0 && t.quantity > 0
    );
  const positions =
    payload.openPositions ?? snapshot?.openPositions ?? [];
  const pending =
    payload.pendingAutomations ?? snapshot?.pendingAutomations ?? [];
  const capital = payload.capital ?? snapshot?.capital;
  const realized =
    payload.totalRealizedPnL ??
    payload.realisedPnL ??
    allTrades.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);
  const unrealized =
    payload.unrealizedPnL ??
    positions.reduce((s, p) => s + (p.unrealizedPnL ?? 0), 0);
  const deposit = payload.deposit ?? capital?.deposit ?? 0;
  const cash = payload.cash ?? capital?.cash ?? 0;
  const mark = payload.markPrice ?? capital?.markPrice ?? 0;
  const equity =
    payload.equity ??
    cash +
      positions.reduce(
        (s, p) =>
          s +
          p.quantity *
            (p.symbol.startsWith("XRP") && mark ? mark : p.averageEntryPrice),
        0
      );
  const ret =
    payload.returnPct ??
    (deposit ? Math.round(((equity - deposit) / deposit) * 10000) / 100 : 0);
  const isOnline =
    payload.execution?.isOnline === true ||
    payload.executionState === "running" ||
    snapshot?.executionState === "running";
  const buys = settled.filter((t) => t.side === "buy").length;
  const sells = settled.filter((t) => t.side === "sell").length;
  const decisions =
    payload.decisions ?? capital?.decisions ?? [];

  return {
    connected: true,
    executionLabel: isOnline ? "ONLINE" : "OFFLINE",
    executionState:
      payload.executionState ??
      snapshot?.executionState ??
      payload.execution?.state ??
      "unknown",
    tradesCompleted: settled.length,
    ordersSubmitted: settled.length,
    ordersPending: pending.length,
    ordersRecorded: allTrades.length || settled.length,
    buys,
    sells,
    last2hFills: payload.last2Hours?.total ?? 0,
    realizedPnL: realized,
    unrealizedPnL: unrealized,
    deposit,
    cash,
    equity,
    returnPct: ret,
    markPrice: mark,
    lastDecision: payload.lastDecision ?? decisions[0] ?? null,
    decisions,
    positions,
    recentFills: [...settled].sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    ),
    pending,
    error: null,
    fetchedAt: Date.now(),
  };
}

export const EMPTY_SUMMARY: SimulationSummary = {
  connected: false,
  executionLabel: "UNKNOWN",
  executionState: "disconnected",
  tradesCompleted: 0,
  ordersSubmitted: 0,
  ordersPending: 0,
  ordersRecorded: 0,
  buys: 0,
  sells: 0,
  last2hFills: 0,
  realizedPnL: 0,
  unrealizedPnL: 0,
  deposit: 0,
  cash: 0,
  equity: 0,
  returnPct: 0,
  markPrice: 0,
  lastDecision: null,
  decisions: [],
  positions: [],
  recentFills: [],
  pending: [],
  error: null,
  fetchedAt: null,
};

export const fmtPnL = (n: number, d = 4) => {
  const sign = n > 0 ? "+" : n < 0 ? "" : "";
  return `${sign}${n.toFixed(d)}`;
};

export const fmtGBP = (n: number, d = 2) =>
  `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })}`;

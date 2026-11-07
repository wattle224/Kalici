/** Client for the Kalici ledger API (simulation) on :8000. */

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
  };
};

export type SimulationSummary = {
  connected: boolean;
  executionLabel: "ONLINE" | "OFFLINE" | "UNKNOWN";
  executionState: string;
  /** Settled filled trades (completed). */
  tradesCompleted: number;
  /** Alias — in this ledger, submitted-and-filled orders === settled fills. */
  ordersSubmitted: number;
  /** Queued automation intents not yet filled. */
  ordersPending: number;
  /** All trade rows including skipped (total intents recorded). */
  ordersRecorded: number;
  buys: number;
  sells: number;
  last2hFills: number;
  realizedPnL: number;
  unrealizedPnL: number;
  positions: LedgerPosition[];
  recentFills: LedgerTrade[];
  pending: PendingAutomation[];
  error: string | null;
  fetchedAt: number | null;
};

const REMOTE_URLS = [
  "http://127.0.0.1:8000/api/ledger",
  "http://127.0.0.1:8000/ledger",
  "http://127.0.0.1:8000/api/trading",
  "http://localhost:8000/api/ledger",
];

async function tryFetch(url: string): Promise<LedgerPayload> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as LedgerPayload;
}

export async function fetchLedger(): Promise<LedgerPayload> {
  let last: Error | null = null;
  for (const url of REMOTE_URLS) {
    try {
      return await tryFetch(url);
    } catch (e) {
      last = e instanceof Error ? e : new Error("fetch failed");
    }
  }
  throw last ?? new Error("Ledger API unreachable on :8000");
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
  const realized =
    payload.totalRealizedPnL ??
    payload.realisedPnL ??
    allTrades.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);
  const unrealized = positions.reduce((s, p) => s + (p.unrealizedPnL ?? 0), 0);
  const isOnline =
    payload.execution?.isOnline === true ||
    payload.executionState === "running" ||
    snapshot?.executionState === "running";
  const buys = settled.filter((t) => t.side === "buy").length;
  const sells = settled.filter((t) => t.side === "sell").length;

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

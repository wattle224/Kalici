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

/** Same-origin only — never hit :8000 from the browser (Chrome PNA / Failed to fetch). */
const LEDGER_URLS = ["/api/ledger"];

async function tryFetch(
  url: string,
  init?: RequestInit
): Promise<LedgerPayload> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      ...init,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    if (/abort|timeout/i.test(msg)) {
      throw new Error(`Ledger timeout talking to ${url}`);
    }
    throw new Error(
      `Cannot reach ${url} (${msg}). Keep the Kalici Ledger window open.`
    );
  }
  const ctype = res.headers.get("content-type") ?? "";
  const text = await res.text();

  // Next.js / proxy crashes often return HTML 500 pages — treat as hard fail
  // so we fall through to the next URL.
  if (
    ctype.includes("text/html") ||
    text.trimStart().startsWith("<!DOCTYPE") ||
    text.trimStart().startsWith("<html")
  ) {
    throw new Error(
      `Proxy returned HTML (${res.status}) — trying next ledger URL`
    );
  }

  let data: LedgerPayload & { error?: string; hint?: string } = {};
  try {
    data = text
      ? (JSON.parse(text) as LedgerPayload & { error?: string; hint?: string })
      : {};
  } catch {
    throw new Error(
      `Non-JSON ledger response (${res.status}): ${text.slice(0, 120)}`
    );
  }

  if (!res.ok) {
    const detail = data.error ?? data.hint ?? `HTTP ${res.status}`;
    if (/unknown action/i.test(detail)) {
      throw new Error(
        "Ledger build is outdated (no set-deposit). Close the ledger window and re-run Launch-QuantEdge.bat."
      );
    }
    throw new Error(detail);
  }
  return data;
}

export async function fetchLedger(): Promise<LedgerPayload> {
  let last: Error | null = null;
  // Prefer same-origin proxy, then direct :8000 (CORS-safe on localhost).
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
      "Ledger unreachable. Click START LEDGER, or double-click Start-Ledger.bat and keep that window open."
    )
  );
}

/** Same-origin only — the Next proxy starts :8000 if needed. */
const FUND_URLS = ["/api/ledger"];

export type StartLedgerResult = {
  ok: boolean;
  error?: string;
  method?: string;
  already?: boolean;
};

export async function startLedger(): Promise<StartLedgerResult> {
  try {
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start-ledger" }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      method?: string;
      already?: boolean;
    };
    if (res.ok && data.ok === true) {
      return {
        ok: true,
        method: data.method,
        already: data.already,
      };
    }
    return {
      ok: false,
      error:
        data.error ??
        "Could not start ledger. Double-click Start-Ledger.bat and keep it open.",
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Start Ledger request failed — is QUANTEDGE :3100 still running?",
    };
  }
}

export async function setDeposit(amount: number): Promise<LedgerPayload> {
  if (!Number.isFinite(amount) || amount < 10) {
    throw new Error("Deposit must be at least £10 (you entered £" + amount + ")");
  }
  const body = JSON.stringify({ action: "set-deposit", amount });
  let last: Error | null = null;

  const attempt = async () => {
    for (const url of FUND_URLS) {
      try {
        const payload = await tryFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const deposit =
          payload.deposit ??
          payload.capital?.deposit ??
          payload.snapshot?.capital?.deposit;
        if (typeof deposit === "number" && deposit >= 10) {
          return payload;
        }
        last = new Error("Fund response missing deposit — trying next URL");
      } catch (e) {
        last = e instanceof Error ? e : new Error("fetch failed");
      }
    }
    return null;
  };

  let payload = await attempt();
  if (payload) return payload;

  // Self-heal: ask the Next proxy to spawn the ledger window, then retry once.
  const started = await startLedger();
  if (started.ok) {
    payload = await attempt();
    if (payload) return payload;
  }

  throw (
    last ??
    new Error(
      started.error ??
        "Could not set deposit — double-click Start-Ledger.bat and keep that window open, then try again."
    )
  );
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

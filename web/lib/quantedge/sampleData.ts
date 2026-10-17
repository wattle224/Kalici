import type {
  AppService,
  Incident,
  Instrument,
  MarketRegime,
  Quote,
  RegimeSegment,
  RiskLimit,
  RiskSnapshot,
  TickerItem,
  Watchlist,
} from "./types";

export const INSTRUMENTS: Instrument[] = [
  { id: "xrp-usd", symbol: "XRP-USD", name: "XRP / US Dollar", exchange: "Coinbase", assetClass: "crypto", currency: "USD", providerId: "XRP-USD" },
  { id: "btc-usd", symbol: "BTC-USD", name: "Bitcoin / US Dollar", exchange: "Coinbase", assetClass: "crypto", currency: "USD", providerId: "BTC-USD" },
  { id: "eth-usd", symbol: "ETH-USD", name: "Ethereum / US Dollar", exchange: "Coinbase", assetClass: "crypto", currency: "USD", providerId: "ETH-USD" },
  { id: "sol-usd", symbol: "SOL-USD", name: "Solana / US Dollar", exchange: "Coinbase", assetClass: "crypto", currency: "USD", providerId: "SOL-USD" },
  { id: "aapl", symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", assetClass: "equity", currency: "USD", isin: "US0378331005" },
  { id: "msft", symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", assetClass: "equity", currency: "USD", isin: "US5949181045" },
  { id: "spy", symbol: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSE Arca", assetClass: "etf", currency: "USD", isin: "US78462F1030" },
  { id: "eurusd", symbol: "EURUSD", name: "Euro / US Dollar", exchange: "FX", assetClass: "fx", currency: "USD" },
  { id: "gc", symbol: "GC=F", name: "Gold Futures", exchange: "COMEX", assetClass: "future", currency: "USD" },
  { id: "tnx", symbol: "TNX", name: "US 10Y Treasury Yield", exchange: "CBOE", assetClass: "bond", currency: "USD" },
];

export const DEFAULT_WATCHLISTS: Watchlist[] = [
  { id: "wl-crypto", name: "Crypto Core", symbols: ["XRP-USD", "BTC-USD", "ETH-USD", "SOL-USD"] },
  { id: "wl-eq", name: "US Equities", symbols: ["AAPL", "MSFT", "SPY"] },
  { id: "wl-macro", name: "Macro", symbols: ["EURUSD", "GC=F", "TNX", "SPY"] },
];

function spark(seed: number, n = 24): number[] {
  const out: number[] = [];
  let v = seed;
  for (let i = 0; i < n; i++) {
    v = v * (1 + Math.sin(i / 3 + seed) * 0.004 + ((i * seed) % 7) * 0.0003);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

export function buildSimulatedQuotes(liveCrypto: Quote[]): Quote[] {
  const bySym = new Map(liveCrypto.map((q) => [q.symbol, q]));
  const now = new Date().toISOString();
  return INSTRUMENTS.map((ins) => {
    const live = bySym.get(ins.symbol);
    if (live) return live;
    const base =
      ins.symbol === "AAPL" ? 227.4 :
      ins.symbol === "MSFT" ? 428.1 :
      ins.symbol === "SPY" ? 572.2 :
      ins.symbol === "EURUSD" ? 1.0842 :
      ins.symbol === "GC=F" ? 2654 :
      ins.symbol === "TNX" ? 4.21 :
      100;
    const changePct = ((ins.symbol.charCodeAt(0) % 17) - 8) * 0.22;
    const change = (base * changePct) / 100;
    return {
      symbol: ins.symbol,
      last: Number((base + change).toFixed(4)),
      bid: Number((base + change * 0.98).toFixed(4)),
      ask: Number((base + change * 1.02).toFixed(4)),
      change: Number(change.toFixed(4)),
      changePct: Number(changePct.toFixed(2)),
      volume: 1_200_000 + (ins.symbol.charCodeAt(0) % 9) * 100_000,
      timestamp: now,
      freshness: "simulated" as const,
    };
  });
}

export function buildWinnersLosers(quotes: Quote[]): { winners: TickerItem[]; losers: TickerItem[] } {
  const ranked = [...quotes].sort((a, b) => b.changePct - a.changePct);
  const toItem = (q: Quote): TickerItem => {
    const ins = INSTRUMENTS.find((i) => i.symbol === q.symbol);
    return {
      symbol: q.symbol,
      name: ins?.name ?? q.symbol,
      last: q.last,
      change: q.change,
      changePct: q.changePct,
      exchange: ins?.exchange ?? "—",
      sparkline: spark(q.last),
      freshness: q.freshness,
    };
  };
  return {
    winners: ranked.filter((q) => q.changePct > 0).slice(0, 8).map(toItem),
    losers: ranked.filter((q) => q.changePct < 0).slice(-8).reverse().map(toItem),
  };
}

export const SERVICES: AppService[] = [
  { id: "oms", name: "Order Management Service", criticality: "tier1", owner: "A. Chen", team: "Trading Platform", environment: "prod", status: "healthy", dependencies: ["md-feed", "risk-engine", "db-primary"], lastDeploy: "2026-10-14T18:22:00Z", slo: 99.95, runbookUrl: "#runbook-oms" },
  { id: "md-feed", name: "Market Data Gateway", criticality: "tier1", owner: "J. Okonkwo", team: "Market Data", environment: "prod", status: "degraded", dependencies: ["coinbase-ws", "redis-cache"], lastDeploy: "2026-10-15T09:10:00Z", lastIncident: "INC-1042", slo: 99.9, runbookUrl: "#runbook-md" },
  { id: "risk-engine", name: "Pre-Trade Risk Engine", criticality: "tier1", owner: "S. Patel", team: "Risk Tech", environment: "prod", status: "healthy", dependencies: ["db-primary", "limits-api"], lastDeploy: "2026-10-12T11:00:00Z", slo: 99.99, runbookUrl: "#runbook-risk" },
  { id: "ledger-api", name: "IAM Ledger API :8000", criticality: "tier1", owner: "Platform", team: "Investment Ops", environment: "prod", status: "healthy", dependencies: ["node-runtime"], lastDeploy: "2026-10-15T08:00:00Z", slo: 99.5, runbookUrl: "#runbook-ledger" },
  { id: "web-ui", name: "QuantEdge Terminal UI", criticality: "tier2", owner: "Platform", team: "Investment Ops", environment: "prod", status: "healthy", dependencies: ["ledger-api", "md-feed"], lastDeploy: "2026-10-17T12:00:00Z", slo: 99.5, runbookUrl: "#runbook-ui" },
  { id: "db-primary", name: "Primary Postgres", criticality: "tier1", owner: "DBA On-call", team: "Data Platform", environment: "prod", status: "healthy", dependencies: [], lastDeploy: "2026-09-30T00:00:00Z", slo: 99.99, runbookUrl: "#runbook-db" },
];

export const INCIDENTS: Incident[] = [
  { id: "INC-1042", title: "Coinbase WS reconnect storm — elevated MD latency", severity: "high", status: "investigating", owner: "J. Okonkwo", openedAt: "2026-10-17T13:40:00Z", ageMinutes: 95, impact: "Delayed crypto quotes for 3 products", serviceId: "md-feed" },
  { id: "INC-1038", title: "Order ingestion backlog on OMS queue", severity: "medium", status: "acknowledged", owner: "A. Chen", openedAt: "2026-10-16T22:10:00Z", ageMinutes: 980, impact: "Simulated fill latency +2.1s p95", serviceId: "oms" },
  { id: "INC-1021", title: "Reporting pipeline miss for EOD blotter", severity: "low", status: "resolved", owner: "S. Patel", openedAt: "2026-10-10T19:00:00Z", ageMinutes: 40, impact: "Delayed ops report only", serviceId: "risk-engine" },
];

export function sampleSeries(n = 60, base = 100, vol = 0.012): { t: number; v: number }[] {
  const now = Date.now();
  const out = [];
  let v = base;
  for (let i = n; i >= 0; i--) {
    v *= 1 + (Math.sin(i / 5) * vol) / 2 + ((i % 5) - 2) * vol * 0.05;
    out.push({ t: now - i * 60_000, v: Number(v.toFixed(4)) });
  }
  return out;
}

export const RISK_SNAPSHOT: RiskSnapshot = {
  marketValue: 12_450_000,
  dailyPnl: 42_380,
  cumulativePnl: 318_900,
  realizedPnl: 210_400,
  unrealizedPnl: 108_500,
  grossExposure: 14_200_000,
  netExposure: 9_800_000,
  volatility: 0.142,
  maxDrawdown: -0.068,
  var95: 186_000,
  es95: 241_000,
  leverage: 1.14,
  methodology: "Illustrative 1-day historical VaR/ES (95%), 252-day window — simulated prototype data, not a production risk calc.",
  asOf: new Date().toISOString(),
  freshness: "simulated",
};

export const RISK_LIMITS: RiskLimit[] = [
  { id: "l1", name: "Daily loss", metric: "dailyPnl", limit: -150_000, current: 42_380, unit: "USD", status: "ok" },
  { id: "l2", name: "Gross exposure", metric: "gross", limit: 20_000_000, current: 14_200_000, unit: "USD", status: "ok" },
  { id: "l3", name: "Single-name concentration", metric: "conc", limit: 0.15, current: 0.18, unit: "frac", status: "breach" },
  { id: "l4", name: "Portfolio VaR 95%", metric: "var", limit: 250_000, current: 186_000, unit: "USD", status: "ok" },
  { id: "l5", name: "Max drawdown", metric: "dd", limit: -0.1, current: -0.068, unit: "frac", status: "warning" },
];

export function illustrativeRegimes(days = 90): RegimeSegment[] {
  const end = Date.now();
  const day = 86_400_000;
  const regimes: MarketRegime[] = ["trending_up", "range", "high_vol", "risk_off", "trending_down", "low_vol", "risk_on"];
  const segs: RegimeSegment[] = [];
  let cursor = end - days * day;
  let i = 0;
  while (cursor < end) {
    const len = (5 + (i % 7)) * day;
    segs.push({
      start: cursor,
      end: Math.min(end, cursor + len),
      regime: regimes[i % regimes.length],
      confidence: 0.55 + (i % 4) * 0.1,
    });
    cursor += len;
    i++;
  }
  return segs;
}

export const REGIME_METHOD =
  "Illustrative prototype model: regime bands are simulated from a rolling volatility/trend heuristic for UI demonstration only — not a statistically validated regime classifier.";

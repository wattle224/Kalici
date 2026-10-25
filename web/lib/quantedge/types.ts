export type WorkspaceId = "trading" | "support" | "risk";

export type AssetClass =
  | "equity"
  | "etf"
  | "index"
  | "fx"
  | "future"
  | "bond"
  | "option"
  | "crypto"
  | "etp";

export type DataFreshness = "live" | "delayed" | "simulated";

/** Terminal operating mode — market-data + labelling. Execution stays paper unless a live broker is configured. */
export type OperatingMode = "simulated" | "production";

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  assetClass: AssetClass;
  currency: string;
  isin?: string;
  providerId?: string;
}

export interface Quote {
  symbol: string;
  last: number;
  bid?: number;
  ask?: number;
  change: number;
  changePct: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  timestamp: string;
  freshness: DataFreshness;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Chart interval selector (Coinbase native gran + 3m aggregated from 1m). */
export type ChartTimeframe = "live" | "3m" | "5m" | "15m" | "1h";

export const CHART_TIMEFRAMES: { id: ChartTimeframe; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "3m", label: "3m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
];

export interface DepthLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  mid: number | null;
  spread: number | null;
  timestamp: string;
  freshness: DataFreshness;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type OrderStatus = "open" | "filled" | "rejected" | "cancelled" | "partial";
export type TimeInForce = "day" | "gtc" | "ioc" | "fok";

export interface SimulatedOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  tif: TimeInForce;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  fillPrice?: number;
  estimatedValue: number;
  /** simulated = full paper/sim stack; paper = live market data, non-broker fills */
  mode: "simulated" | "paper";
  /** Who initiated the fill */
  source?: "manual" | "auto";
  /** Auto rationale or ticket note */
  rationale?: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  currency: string;
}

export type ServiceStatus = "healthy" | "degraded" | "down" | "maintenance";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "acknowledged" | "investigating" | "resolved";

export interface AppService {
  id: string;
  name: string;
  criticality: "tier1" | "tier2" | "tier3";
  owner: string;
  team: string;
  environment: "prod" | "uat" | "dev";
  status: ServiceStatus;
  dependencies: string[];
  lastDeploy: string;
  lastIncident?: string;
  slo: number;
  runbookUrl: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner: string;
  openedAt: string;
  ageMinutes: number;
  impact: string;
  serviceId: string;
}

export interface MetricPoint {
  t: number;
  v: number;
}

export type MarketRegime =
  | "trending_up"
  | "trending_down"
  | "range"
  | "high_vol"
  | "low_vol"
  | "risk_on"
  | "risk_off";

export interface RegimeSegment {
  start: number;
  end: number;
  regime: MarketRegime;
  confidence: number;
}

export interface RiskSnapshot {
  marketValue: number;
  dailyPnl: number;
  cumulativePnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  grossExposure: number;
  netExposure: number;
  volatility: number;
  maxDrawdown: number;
  var95: number;
  es95: number;
  leverage: number;
  methodology: string;
  asOf: string;
  freshness: DataFreshness;
}

export interface RiskLimit {
  id: string;
  name: string;
  metric: string;
  limit: number;
  current: number;
  unit: string;
  status: "ok" | "warning" | "breach";
}

export interface TickerItem {
  symbol: string;
  name: string;
  last: number;
  change: number;
  changePct: number;
  exchange: string;
  sparkline: number[];
  freshness: DataFreshness;
}

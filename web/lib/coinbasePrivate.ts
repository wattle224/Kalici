/**
 * Optional Coinbase Exchange *authenticated* portfolio (server-side only).
 * Requires COINBASE_API_KEY, COINBASE_API_SECRET, COINBASE_API_PASSPHRASE.
 * Never expose these to the browser.
 */
import { createHmac } from "crypto";
import { COINBASE_EXCHANGE_BASE, fetchCoinbaseTicker } from "./coinbase";

export interface PortfolioHolding {
  asset: string;
  symbol: string;
  amount: number;
  price: number;
  value: number;
  currency: string;
  source: "coinbase" | "ledger";
}

export interface PortfolioPnL {
  totalBuy: number;
  totalSell: number;
  /** totalBuy - totalSell (as requested) */
  netBuyMinusSell: number;
  /**
   * All-time style P&L vs net invested:
   * totalValue - (totalBuy - totalSell)
   */
  allTimePnL: number;
  allTimePnLPct: number | null;
  realizedPnL: number | null;
  currency: string;
}

export interface PortfolioSummary {
  totalValue: number;
  cryptoValue: number;
  cashValue: number;
  displayCurrency: "GBP" | "USD";
  /** USD→display FX (1 for USD). */
  fxRate: number;
  totalValueDisplay: number;
  cryptoValueDisplay: number;
  cashValueDisplay: number;
  allTimePnLDisplay: number;
  allTimePnLPct: number | null;
}

export interface PortfolioSnapshot {
  ok: boolean;
  connected: boolean;
  source: "coinbase-exchange" | "ledger" | "none";
  holdings: PortfolioHolding[];
  totalValue: number;
  currency: string;
  summary: PortfolioSummary;
  pnl: PortfolioPnL;
  asOf: string;
  message: string;
  error?: string;
}

const CASH_ASSETS = new Set(["USD", "USDC", "USDT", "GBP", "EUR", "DAI"]);

export function isCashAsset(asset: string): boolean {
  return CASH_ASSETS.has(asset.toUpperCase());
}

export function enrichPnL(pnl: Omit<PortfolioPnL, "allTimePnL" | "allTimePnLPct">, totalValue: number): PortfolioPnL {
  const netInvested = pnl.netBuyMinusSell;
  const allTimePnL = totalValue - netInvested;
  const allTimePnLPct =
    Math.abs(netInvested) > 1e-9
      ? (allTimePnL / Math.abs(netInvested)) * 100
      : null;
  return {
    ...pnl,
    allTimePnL,
    allTimePnLPct: allTimePnLPct != null ? Number(allTimePnLPct.toFixed(2)) : null,
  };
}

/** Public Coinbase retail FX: how many GBP per 1 USD. */
export async function fetchUsdToGbpRate(): Promise<number> {
  try {
    const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return 0.79;
    const data = (await res.json()) as { data?: { rates?: Record<string, string> } };
    const gbp = Number(data.data?.rates?.GBP);
    return Number.isFinite(gbp) && gbp > 0 ? gbp : 0.79;
  } catch {
    return 0.79;
  }
}

export function buildSummary(
  holdings: PortfolioHolding[],
  totalValue: number,
  pnl: PortfolioPnL,
  fxRate: number,
  displayCurrency: "GBP" | "USD" = "GBP"
): PortfolioSummary {
  let cryptoValue = 0;
  let cashValue = 0;
  for (const h of holdings) {
    if (isCashAsset(h.asset)) cashValue += h.value;
    else cryptoValue += h.value;
  }
  const rate = displayCurrency === "GBP" ? fxRate : 1;
  return {
    totalValue,
    cryptoValue,
    cashValue,
    displayCurrency,
    fxRate: rate,
    totalValueDisplay: totalValue * rate,
    cryptoValueDisplay: cryptoValue * rate,
    cashValueDisplay: cashValue * rate,
    allTimePnLDisplay: pnl.allTimePnL * rate,
    allTimePnLPct: pnl.allTimePnLPct,
  };
}

function creds() {
  const key = process.env.COINBASE_API_KEY?.trim();
  const secret = process.env.COINBASE_API_SECRET?.trim();
  const passphrase = process.env.COINBASE_API_PASSPHRASE?.trim();
  if (!key || !secret || !passphrase) return null;
  return { key, secret, passphrase };
}

export function coinbasePrivateConfigured(): boolean {
  return creds() != null;
}

async function signedGet(path: string): Promise<unknown> {
  const c = creds();
  if (!c) throw new Error("Coinbase private API credentials not configured");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = "GET";
  const body = "";
  const prehash = timestamp + method + path + body;
  const key = Buffer.from(c.secret, "base64");
  const signature = createHmac("sha256", key).update(prehash).digest("base64");

  const res = await fetch(`${COINBASE_EXCHANGE_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "CB-ACCESS-KEY": c.key,
      "CB-ACCESS-SIGN": signature,
      "CB-ACCESS-TIMESTAMP": timestamp,
      "CB-ACCESS-PASSPHRASE": c.passphrase,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Coinbase private ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Fetch non-zero Exchange accounts and mark with live USD prices. */
export async function fetchCoinbaseExchangePortfolio(): Promise<{
  holdings: PortfolioHolding[];
  totalValue: number;
}> {
  const accounts = (await signedGet("/accounts")) as Array<Record<string, unknown>>;
  if (!Array.isArray(accounts)) throw new Error("Invalid /accounts response");

  const holdings: PortfolioHolding[] = [];
  for (const a of accounts) {
    const currency = String(a.currency || "").toUpperCase();
    const available = toNum(a.available) + toNum(a.hold);
    if (!currency || available <= 0) continue;
    if (currency === "USD" || currency === "USDC" || currency === "USDT") {
      holdings.push({
        asset: currency,
        symbol: currency,
        amount: available,
        price: 1,
        value: available,
        currency: "USD",
        source: "coinbase",
      });
      continue;
    }
    const product = `${currency}-USD`;
    let price = 0;
    try {
      const t = await fetchCoinbaseTicker(product);
      price = t.price;
    } catch {
      price = 0;
    }
    holdings.push({
      asset: currency,
      symbol: product,
      amount: available,
      price,
      value: available * price,
      currency: "USD",
      source: "coinbase",
    });
  }

  holdings.sort((a, b) => b.value - a.value);
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  return { holdings, totalValue };
}

/** Aggregate buy/sell notionals from Coinbase fills (paginated lightly). */
export async function fetchCoinbaseBuySellTotals(): Promise<
  Omit<PortfolioPnL, "allTimePnL" | "allTimePnLPct">
> {
  // Exchange fills endpoint — limit recent history
  const fills = (await signedGet("/fills?limit=1000")) as Array<Record<string, unknown>>;
  let totalBuy = 0;
  let totalSell = 0;
  if (Array.isArray(fills)) {
    for (const f of fills) {
      const side = String(f.side || "").toLowerCase();
      const size = toNum(f.size);
      const price = toNum(f.price);
      const notional = size * price;
      if (side === "buy") totalBuy += notional;
      else if (side === "sell") totalSell += notional;
    }
  }
  return {
    totalBuy,
    totalSell,
    netBuyMinusSell: totalBuy - totalSell,
    realizedPnL: null,
    currency: "USD",
  };
}

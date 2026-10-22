import { NextResponse } from "next/server";
import {
  coinbasePrivateConfigured,
  fetchCoinbaseBuySellTotals,
  fetchCoinbaseExchangePortfolio,
  type PortfolioHolding,
  type PortfolioPnL,
  type PortfolioSnapshot,
} from "@/lib/coinbasePrivate";
import { buildLedgerResponse } from "@/lib/ledgerServer";
import { fetchCoinbaseTicker } from "@/lib/coinbase";
import { settledFills } from "@/lib/trading";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ledgerBuySellPnL(): PortfolioPnL {
  const ledger = buildLedgerResponse();
  const fills = settledFills(ledger.snapshot?.trades ?? []);
  let totalBuy = 0;
  let totalSell = 0;
  for (const t of fills) {
    const notional = t.quantity * t.executionPrice;
    if (t.side === "buy") totalBuy += notional;
    else if (t.side === "sell") totalSell += notional;
  }
  return {
    totalBuy,
    totalSell,
    netBuyMinusSell: totalBuy - totalSell,
    realizedPnL: ledger.totalRealizedPnL ?? null,
    currency: "USD",
  };
}

async function ledgerHoldings(): Promise<PortfolioHolding[]> {
  const ledger = buildLedgerResponse();
  const positions = ledger.openPositions ?? [];
  const out: PortfolioHolding[] = [];
  for (const p of positions) {
    if (p.quantity <= 0) continue;
    const symbol = p.symbol.includes("-") ? p.symbol : `${p.symbol}-USD`;
    let price = p.averageEntryPrice;
    try {
      const t = await fetchCoinbaseTicker(symbol);
      price = t.price;
    } catch {
      /* keep entry */
    }
    const asset = symbol.split("-")[0] || symbol;
    out.push({
      asset,
      symbol,
      amount: p.quantity,
      price,
      value: p.quantity * price,
      currency: p.quoteCurrency || "USD",
      source: "ledger",
    });
  }
  out.sort((a, b) => b.value - a.value);
  return out;
}

export async function GET() {
  const asOf = new Date().toISOString();

  try {
    if (coinbasePrivateConfigured()) {
      const [{ holdings, totalValue }, pnl] = await Promise.all([
        fetchCoinbaseExchangePortfolio(),
        fetchCoinbaseBuySellTotals().catch(() => ledgerBuySellPnL()),
      ]);
      const body: PortfolioSnapshot = {
        ok: true,
        connected: true,
        source: "coinbase-exchange",
        holdings,
        totalValue,
        currency: "USD",
        pnl,
        asOf,
        message:
          "Live Coinbase Exchange balances. PnL totals from fills: Total = Total buy − Total sell.",
      };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Fallback: IAM ledger positions + buy/sell from local trade history
    const holdings = await ledgerHoldings();
    const pnl = ledgerBuySellPnL();
    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const body: PortfolioSnapshot = {
      ok: true,
      connected: false,
      source: holdings.length ? "ledger" : "none",
      holdings,
      totalValue,
      currency: "USD",
      pnl,
      asOf,
      message: holdings.length
        ? "Coinbase private API not configured — showing IAM ledger positions with live marks. Add COINBASE_API_KEY / SECRET / PASSPHRASE to web/.env.local to mirror your Coinbase app portfolio."
        : "Coinbase private API not configured and ledger has no open positions. Add Exchange API keys (view permission) to load your Coinbase balances in Production mode.",
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const body: PortfolioSnapshot = {
      ok: false,
      connected: false,
      source: "none",
      holdings: [],
      totalValue: 0,
      currency: "USD",
      pnl: {
        totalBuy: 0,
        totalSell: 0,
        netBuyMinusSell: 0,
        realizedPnL: null,
        currency: "USD",
      },
      asOf,
      message: "Portfolio fetch failed",
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(body, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

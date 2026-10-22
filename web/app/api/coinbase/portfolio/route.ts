import { NextResponse } from "next/server";
import {
  buildSummary,
  coinbasePrivateConfigured,
  enrichPnL,
  fetchCoinbaseBuySellTotals,
  fetchCoinbaseExchangePortfolio,
  fetchUsdToGbpRate,
  type PortfolioHolding,
  type PortfolioPnL,
  type PortfolioSnapshot,
} from "@/lib/coinbasePrivate";
import { buildLedgerResponse } from "@/lib/ledgerServer";
import { fetchCoinbaseTicker } from "@/lib/coinbase";
import { settledFills } from "@/lib/trading";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function emptyPnL(): PortfolioPnL {
  return {
    totalBuy: 0,
    totalSell: 0,
    netBuyMinusSell: 0,
    allTimePnL: 0,
    allTimePnLPct: null,
    realizedPnL: null,
    currency: "USD",
  };
}

function ledgerBuySellPnL(): Omit<PortfolioPnL, "allTimePnL" | "allTimePnLPct"> {
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

function pack(
  holdings: PortfolioHolding[],
  totalValue: number,
  pnlBase: Omit<PortfolioPnL, "allTimePnL" | "allTimePnLPct">,
  fxRate: number,
  meta: Omit<PortfolioSnapshot, "holdings" | "totalValue" | "pnl" | "summary" | "currency">
): PortfolioSnapshot {
  const pnl = enrichPnL(pnlBase, totalValue);
  return {
    ...meta,
    holdings,
    totalValue,
    currency: "USD",
    pnl,
    summary: buildSummary(holdings, totalValue, pnl, fxRate, "GBP"),
  };
}

export async function GET() {
  const asOf = new Date().toISOString();
  const fxRate = await fetchUsdToGbpRate();

  try {
    if (coinbasePrivateConfigured()) {
      const [{ holdings, totalValue }, pnlBase] = await Promise.all([
        fetchCoinbaseExchangePortfolio(),
        fetchCoinbaseBuySellTotals().catch(() => ledgerBuySellPnL()),
      ]);
      const body = pack(holdings, totalValue, pnlBase, fxRate, {
        ok: true,
        connected: true,
        source: "coinbase-exchange",
        asOf,
        message:
          "Live Coinbase Exchange balances (shown in £ using live USD/GBP). Totals: buy, sell, buy−sell, and all-time vs net invested.",
      });
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const holdings = await ledgerHoldings();
    const pnlBase = ledgerBuySellPnL();
    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const body = pack(holdings, totalValue, pnlBase, fxRate, {
      ok: true,
      connected: false,
      source: holdings.length ? "ledger" : "none",
      asOf,
      message: holdings.length
        ? "Coinbase private API not configured (COINBASE_API_*=... placeholders are not keys). Showing IAM ledger positions with live marks. Put real Exchange View credentials in web/.env.local and restart."
        : "Coinbase private API not configured. Put real COINBASE_API_KEY / SECRET / PASSPHRASE (not ...) in web/.env.local, restart, then Refresh to match Coinbase home.",
    });
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const body = pack([], 0, emptyPnL(), fxRate, {
      ok: false,
      connected: false,
      source: "none",
      asOf,
      message: "Portfolio fetch failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(body, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

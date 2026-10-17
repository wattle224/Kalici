"use client";

import { useMemo } from "react";
import type { CoinbaseTicker } from "@/lib/coinbase";
import {
  buildMarketTickers,
  formatChangePct,
  gainers,
  type MarketTicker,
} from "@/lib/market";
import { formatPrice } from "@/lib/trading";
import type { OpenPosition } from "@/lib/trading";

interface TickerBannerProps {
  positions: OpenPosition[];
  coinbaseProducts?: CoinbaseTicker[];
  highlightGainersOnly?: boolean;
}

function TickerItem({ item }: { item: MarketTicker }) {
  const up = item.change24hPct >= 0;
  return (
    <span className="ticker-item">
      <strong>{item.symbol}</strong>
      <span className="ticker-price">{formatPrice(item.price, item.symbol)}</span>
      {Number.isFinite(item.change24hPct) ? (
        <span className={up ? "pnl-positive" : "pnl-negative"}>
          {formatChangePct(item.change24hPct)}
        </span>
      ) : (
        <span className="meta">live</span>
      )}
    </span>
  );
}

export default function TickerBanner({
  positions,
  coinbaseProducts = [],
  highlightGainersOnly = false,
}: TickerBannerProps) {
  const items = useMemo(() => {
    const fromCoinbase: MarketTicker[] = coinbaseProducts.map((p) => ({
      symbol: p.symbol,
      price: p.price,
      change24hPct: Number.NaN,
    }));
    const tickers =
      fromCoinbase.length > 0
        ? fromCoinbase
        : buildMarketTickers(positions);
    return highlightGainersOnly ? gainers(tickers.filter((t) => Number.isFinite(t.change24hPct))) : tickers;
  }, [positions, coinbaseProducts, highlightGainersOnly]);

  if (items.length === 0) {
    return (
      <footer className="ticker-bar" aria-label="Market ticker">
        <span className="ticker-empty">Waiting for Coinbase prices…</span>
      </footer>
    );
  }

  const label = coinbaseProducts.length > 0 ? "COINBASE LIVE" : highlightGainersOnly ? "GAINERS" : "MARKETS";

  return (
    <footer className="ticker-bar" aria-label="Market ticker">
      <span className="ticker-label">{label}</span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          <div className="ticker-segment">
            {items.map((item) => (
              <TickerItem key={`a-${item.symbol}`} item={item} />
            ))}
          </div>
          <div className="ticker-segment" aria-hidden="true">
            {items.map((item) => (
              <TickerItem key={`b-${item.symbol}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

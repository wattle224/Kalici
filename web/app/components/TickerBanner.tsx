"use client";

import { useMemo } from "react";
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
  highlightGainersOnly?: boolean;
}

function TickerItem({ item }: { item: MarketTicker }) {
  const up = item.change24hPct >= 0;
  return (
    <span className="ticker-item">
      <strong>{item.symbol}</strong>
      <span className="ticker-price">{formatPrice(item.price, item.symbol)}</span>
      <span className={up ? "pnl-positive" : "pnl-negative"}>
        {formatChangePct(item.change24hPct)}
      </span>
    </span>
  );
}

export default function TickerBanner({
  positions,
  highlightGainersOnly = false,
}: TickerBannerProps) {
  const items = useMemo(() => {
    const tickers = buildMarketTickers(positions);
    return highlightGainersOnly ? gainers(tickers) : tickers;
  }, [positions, highlightGainersOnly]);

  if (items.length === 0) {
    return (
      <footer className="ticker-bar" aria-label="Market ticker">
        <span className="ticker-empty">No gainers to display</span>
      </footer>
    );
  }

  const label = highlightGainersOnly ? "GAINERS" : "MARKETS";

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

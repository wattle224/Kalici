"use client";

import { useMemo } from "react";
import type { CoinbaseOrderBook, DepthLevel } from "@/lib/coinbase";

interface DepthChartProps {
  symbol: string;
  book: CoinbaseOrderBook | null;
  loading?: boolean;
  error?: string | null;
}

export default function DepthChart({
  symbol,
  book,
  loading = false,
  error = null,
}: DepthChartProps) {
  const view = useMemo(() => {
    if (!book) return null;
    const bids = accumulate(book.bids);
    const asks = accumulate(book.asks);
    const maxCum = Math.max(
      bids[bids.length - 1]?.cumulative ?? 0,
      asks[asks.length - 1]?.cumulative ?? 0,
      1
    );
    return { bids, asks, maxCum, mid: book.mid, spread: book.spread };
  }, [book]);

  return (
    <div className="chart-card depth-card">
      <header className="chart-header">
        <span className="symbol">{symbol} depth</span>
        <span className="meta">
          {loading
            ? "Loading book…"
            : book
              ? `Bid/ask · mid ${book.mid?.toFixed(4) ?? "—"} · spread ${
                  book.spread != null ? book.spread.toFixed(4) : "—"
                }`
              : "Coinbase order book"}
        </span>
      </header>

      {error ? (
        <p className="meta" style={{ color: "var(--red)" }}>
          {error}
        </p>
      ) : null}

      {!view ? (
        <p className="meta">
          {loading
            ? "Fetching live order book from Coinbase…"
            : `No depth data for ${symbol} yet.`}
        </p>
      ) : (
        <div className="depth-layout">
          <DepthSide
            title="Bids"
            side="bid"
            rows={view.bids}
            maxCum={view.maxCum}
          />
          <DepthSide
            title="Asks"
            side="ask"
            rows={view.asks}
            maxCum={view.maxCum}
          />
        </div>
      )}
    </div>
  );
}

interface CumLevel extends DepthLevel {
  cumulative: number;
}

function accumulate(levels: DepthLevel[]): CumLevel[] {
  let cum = 0;
  return levels.map((lvl) => {
    cum += lvl.size;
    return { ...lvl, cumulative: cum };
  });
}

function DepthSide({
  title,
  side,
  rows,
  maxCum,
}: {
  title: string;
  side: "bid" | "ask";
  rows: CumLevel[];
  maxCum: number;
}) {
  return (
    <div className={`depth-side depth-${side}`}>
      <div className="depth-side-head">
        <span>{title}</span>
        <span>Size</span>
        <span>Price</span>
      </div>
      <div className="depth-rows">
        {rows.map((row) => {
          const widthPct = Math.max(2, (row.cumulative / maxCum) * 100);
          return (
            <div className="depth-row" key={`${side}-${row.price}`}>
              <div
                className="depth-bar"
                style={{ width: `${widthPct}%` }}
                aria-hidden
              />
              <span className="depth-size mono">
                {row.size.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="depth-price mono">{row.price.toFixed(4)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

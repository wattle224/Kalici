"use client";

import { useMemo, useState } from "react";
import { useTerminal } from "@/lib/quantedge/TerminalContext";
import { FreshnessBadge, PnL } from "./ui";
import type { TickerItem } from "@/lib/quantedge/types";

function Spark({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-9);
  const w = 48;
  const h = 16;
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="opacity-80" aria-hidden>
      <path d={d} fill="none" stroke={positive ? "#0ecb81" : "#f6465d"} strokeWidth="1.25" />
    </svg>
  );
}

function Chip({ item, onClick }: { item: TickerItem; onClick: () => void }) {
  const up = item.changePct >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-3 inline-flex shrink-0 items-center gap-2 rounded border border-qe-border bg-qe-elevated/80 px-2 py-1 text-left hover:border-qe-muted"
    >
      <span className="font-mono text-xs font-semibold text-qe-text">{item.symbol}</span>
      <span className="max-w-[110px] truncate text-[10px] text-qe-muted">{item.name}</span>
      <span className="font-mono text-xs text-qe-text">{item.last.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
      <PnL pct={item.changePct} />
      <PnL value={item.change} />
      <Spark values={item.sparkline} positive={up} />
      <span className="text-[10px] text-qe-muted">{item.exchange}</span>
    </button>
  );
}

export default function BottomTicker() {
  const { winners, losers, selectSymbol, dataAsOf, tickerFreshness } = useTerminal();
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<"all" | "winners" | "losers">("all");

  const items = useMemo(() => {
    if (filter === "winners") return winners;
    if (filter === "losers") return losers;
    return [...winners, ...losers];
  }, [filter, winners, losers]);

  const loop = [...items, ...items];

  return (
    <footer className="shrink-0 border-t border-qe-border bg-qe-panel">
      <div className="flex items-center gap-3 border-b border-qe-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-qe-muted">
        <span className="font-semibold text-qe-green">Daily Winners &amp; Losers</span>
        <FreshnessBadge freshness={tickerFreshness} />
        <span className="font-mono normal-case tracking-normal" suppressHydrationWarning>
          As of {dataAsOf ? new Date(dataAsOf).toLocaleString("en-GB", { hour12: false }) : "—"}
        </span>
        <div className="ml-auto flex gap-1 normal-case tracking-normal">
          {(["all", "winners", "losers"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-0.5 ${filter === f ? "bg-qe-elevated text-qe-text" : "text-qe-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.length === 0 ? (
          <div className="px-3 py-2 text-xs text-qe-muted">Waiting for market quotes…</div>
        ) : (
          <div
            className="flex w-max py-1.5"
            style={{
              animation: paused ? "none" : "qe-ticker 55s linear infinite",
            }}
          >
            {loop.map((item, idx) => (
              <Chip
                key={`${item.symbol}-${idx}`}
                item={item}
                onClick={() => selectSymbol(item.symbol)}
              />
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}

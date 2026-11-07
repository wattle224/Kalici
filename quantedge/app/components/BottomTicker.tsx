"use client";

import { useAppStore } from "../store/useAppStore";

export function BottomTicker() {
  const ticker = useAppStore((s) => s.ticker);
  const filter = useAppStore((s) => s.tickerFilter);
  const setFilter = useAppStore((s) => s.setTickerFilter);

  const items = ticker.filter(
    (t) => filter === "all" || t.kind === filter || (filter === "alert" && (t.kind === "incident" || t.kind === "alert"))
  );

  const row = (prefix: string) =>
    items.map((t, idx) => {
      const colour =
        t.severity === "crit"
          ? "text-edge-salmon"
          : t.severity === "warn"
          ? "text-edge-amber"
          : typeof t.chg === "number"
          ? t.chg >= 0
            ? "text-edge-green"
            : "text-edge-salmon"
          : "text-edge-text";
      return (
        <span
          key={`${prefix}-${idx}`}
          className="inline-flex items-center gap-2 px-5 border-r border-edge-crimson/20"
        >
          <span className="text-edge-crimson/80 text-xxs uppercase">
            {t.kind}
          </span>
          <span className="text-edge-dim">›</span>
          <span className="text-edge-text">{t.label}</span>
          {t.value && (
            <span className="tabular text-edge-pale">{t.value}</span>
          )}
          {typeof t.chg === "number" && (
            <span className={colour + " tabular text-xxs"}>
              {t.chg >= 0 ? "+" : ""}
              {t.chg.toFixed(2)}%
            </span>
          )}
          {t.severity && (
            <span className={"badge " + colour}>{t.severity.toUpperCase()}</span>
          )}
        </span>
      );
    });

  return (
    <div className="absolute inset-x-0 bottom-0 h-[32px] z-20 border-t border-edge-crimson/60 bg-bg-0/95 flex items-stretch overflow-hidden">
      <div className="flex items-center gap-3 px-3 border-r border-edge-crimson/50 bg-edge-crimson/10 min-w-[200px]">
        <span className="text-edge-pale text-xxs uppercase tracking-widest">
          Global Tape
        </span>
        <select
          className="bg-transparent text-edge-text text-xxs border border-edge-crimson/40 px-1 py-[2px] focus:outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value as never)}
        >
          <option value="all">ALL</option>
          <option value="equity">EQUITY</option>
          <option value="crypto">CRYPTO</option>
          <option value="index">INDEX</option>
          <option value="alert">ALERTS</option>
        </select>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap text-xs animate-[marquee_60s_linear_infinite] will-change-transform">
          {row("a")}
          {row("b")}
        </div>
        <style jsx>{`
          @keyframes marquee {
            from {
              transform: translateX(0%);
            }
            to {
              transform: translateX(-50%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

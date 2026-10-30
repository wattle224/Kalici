"use client";

import { Panel } from "../Panel";

const EVENTS = [
  { t: "T-00:04", k: "MACRO", s: "US ISM Mfg 50.8 vs 49.9 est", tone: "good" },
  { t: "T-00:19", k: "EARN", s: "META Q3 EPS 6.03 vs 5.26 est", tone: "good" },
  { t: "T-00:34", k: "FLOW", s: "SPY blocks 8.4M shares after close", tone: "info" },
  { t: "T-01:02", k: "FX", s: "USDJPY intervention risk flagged by MOF", tone: "warn" },
  { t: "T-01:48", k: "CRYPTO", s: "BTC breaks 72k with 380M liq cascade", tone: "good" },
  { t: "T-02:22", k: "RATES", s: "US 10Y 4.21% (+4bp) auction tails", tone: "warn" },
  { t: "T-03:05", k: "RISK", s: "VIX term structure flattens", tone: "info" },
];

export function EventsFeed() {
  return (
    <Panel title="Significant Market Events" code="MKT-EVT">
      <div className="p-2 h-full overflow-auto scrollbar text-xs">
        {EVENTS.map((e, i) => (
          <div
            key={i}
            className="flex gap-2 border-b border-edge-crimson/10 py-[3px]"
          >
            <span className="text-edge-dim w-14 tabular">{e.t}</span>
            <span
              className={
                "w-14 text-xxs uppercase " +
                (e.tone === "good"
                  ? "text-edge-green"
                  : e.tone === "warn"
                  ? "text-edge-amber"
                  : "text-edge-pale")
              }
            >
              {e.k}
            </span>
            <span className="text-edge-text flex-1">{e.s}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

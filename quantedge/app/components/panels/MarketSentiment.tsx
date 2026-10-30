"use client";

import { Panel } from "../Panel";

const SIGNALS = [
  { label: "Risk-On / Risk-Off", v: 0.62, l: "Risk-On" },
  { label: "Equity Breadth NYSE", v: 0.58, l: "Positive" },
  { label: "USD Index Momentum", v: 0.42, l: "Neutral" },
  { label: "Crypto Fear & Greed", v: 0.71, l: "Greed" },
  { label: "Volatility Regime (VIX)", v: 0.38, l: "Compressed" },
  { label: "Credit Spreads IG", v: 0.49, l: "Stable" },
];

export function MarketSentiment() {
  return (
    <Panel title="Global Market Sentiment" code="MKT-SEN" scan>
      <div className="p-3 space-y-2 h-full overflow-auto scrollbar">
        {SIGNALS.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xxs">
              <span className="text-edge-dim">{s.label}</span>
              <span className="text-edge-text">{s.l}</span>
            </div>
            <div className="relative h-[8px] bg-edge-crimson/10 mt-1">
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-edge-crimson to-edge-salmon"
                style={{ width: `${s.v * 100}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-edge-pale"
                style={{ left: "50%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

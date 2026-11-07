"use client";

import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";

type Line = { role: "sys" | "user" | "ai"; text: string; evidence?: string[] };

function generate(sym: string, prompt: string): Line {
  const base = sym.toUpperCase();
  const lower = prompt.toLowerCase();
  if (lower.includes("regime") || lower.includes("pattern")) {
    return {
      role: "ai",
      text: `${base} is currently in a mid-cycle risk-on regime. Realised 20d vol 14.2% is below 1y median (16.8%). Momentum (10d z-score +1.8σ) and breadth (AD line +42%) are both constructive. Short-term chart shows a bull-flag between $138.4 support and $145.1 resistance.`,
      evidence: [
        "SMA20 crossed SMA50 upward 11 sessions ago",
        "RSI14 68.1 — rising but below overbought (70)",
        "Realised vol 20d / 1y = 0.84 (compressed)",
        "Sector relative strength (SOXX): +4.1% / 20d",
      ],
    };
  }
  if (lower.includes("exposure") || lower.includes("portfolio")) {
    return {
      role: "ai",
      text: `Portfolio NVDA single-name exposure has risen from 5.1% to 7.2% over 5 sessions — this breaches the 7% soft limit (hard limit 10%). Suggest trimming 15% of position or hedging with SOXX put spreads.`,
      evidence: [
        "Position delta: +2500 shares × $141.90 = $354,750",
        "Portfolio gross: $184.2M → NVDA 0.19% notional, 7.2% equity-only",
        "Risk-engine warning: INC-20470 raised 2m ago",
      ],
    };
  }
  if (lower.includes("compare")) {
    return {
      role: "ai",
      text: `${base} vs peers — 20d outperformance: ${base} +4.2%, AAPL +1.1%, MSFT +0.8%, QQQ +2.1%. Beta to QQQ 1.42. Correlation with ETHUSD 0.61 (elevated).`,
      evidence: [
        "Rolling 20d beta vs QQQ: 1.42",
        "Pairwise ρ (NVDA/ETHUSD): 0.61 (90d)",
        "Idiosyncratic variance: 42% (residual CAPM)",
      ],
    };
  }
  if (lower.includes("unusual") || lower.includes("move") || lower.includes("anomal")) {
    return {
      role: "ai",
      text: `Last session's 2.11% move for ${base} is +1.7σ vs 60d distribution. Volume 1.8× 20d median. No earnings or macro print nearby; order flow shows large block prints 09:42 ET and 15:51 ET consistent with institutional accumulation.`,
      evidence: [
        "Session return 2.11% vs 60d σ 1.24% → z = +1.70",
        "Volume 48.1M vs 26.7M (20d median)",
        "Block prints >100k shares: 4 (vs 20d avg 1.4)",
      ],
    };
  }
  return {
    role: "ai",
    text: `I can analyse ${base} — try: "regime", "unusual moves", "compare peers", or "explain portfolio exposure".`,
  };
}

export function AIAnalyst() {
  const instrument = useAppStore((s) => s.selectedInstrument);
  const [log, setLog] = useState<Line[]>([
    {
      role: "sys",
      text: "QUANTEDGE AI research assistant · simulated · cites evidence · no execution",
    },
    {
      role: "ai",
      text: `Ready for ${instrument.symbol}. Ask about regime, unusual price moves, patterns, peer comparison or portfolio exposure.`,
    },
  ]);
  const [q, setQ] = useState("");

  const submit = () => {
    const t = q.trim();
    if (!t) return;
    setLog((l) => [...l, { role: "user", text: t }, generate(instrument.symbol, t)]);
    setQ("");
  };

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="flex-1 overflow-auto scrollbar p-2 space-y-2">
        {log.map((l, i) => (
          <div key={i} className="space-y-1">
            <div
              className={
                "text-xxs uppercase tracking-widest " +
                (l.role === "ai"
                  ? "text-edge-pale"
                  : l.role === "user"
                  ? "text-edge-amber"
                  : "text-edge-dim")
              }
            >
              {l.role === "ai" ? "AI · ANALYST" : l.role === "user" ? "YOU" : "SYSTEM"}
            </div>
            <div className="text-edge-text leading-snug">{l.text}</div>
            {l.evidence && (
              <div className="pl-3 border-l border-edge-crimson/40 text-xxs text-edge-dim space-y-[2px]">
                {l.evidence.map((e, j) => (
                  <div key={j}>▸ {e}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-edge-crimson/40 p-2 flex gap-2">
        <input
          className="flex-1 bg-bg-1 border border-edge-crimson/50 px-2 py-1 text-xs text-edge-text placeholder:text-edge-dim focus:outline-none focus:border-edge-pale"
          placeholder={`Ask about ${instrument.symbol}…  (regime / anomaly / compare / exposure)`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          className="border border-edge-crimson text-edge-pale text-xxs px-3 hover:bg-edge-crimson/20"
        >
          ANALYSE
        </button>
      </div>
    </div>
  );
}

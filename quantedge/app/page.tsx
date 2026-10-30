"use client";

import { useEffect, useMemo } from "react";
import { GlobalGlobe } from "./components/three/GlobalGlobe";
import { IntelligenceCube, type CubeFace } from "./components/three/IntelligenceCube";
import { Panel } from "./components/Panel";
import { GainersLosers } from "./components/panels/GainersLosers";
import { MarketSentiment } from "./components/panels/MarketSentiment";
import { CentreDetail } from "./components/panels/CentreDetail";
import { SessionsBar } from "./components/panels/SessionsBar";
import { IndicesPanel } from "./components/panels/IndicesPanel";
import { CryptoPanel } from "./components/panels/CryptoPanel";
import { Heatmap } from "./components/panels/Heatmap";
import { EventsFeed } from "./components/panels/EventsFeed";
import { AssetFilter } from "./components/panels/AssetFilter";
import { useAppStore } from "./store/useAppStore";
import { CENTRES } from "./data/markets";

export default function GlobalWorkspace() {
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const centre = useAppStore((s) => s.selectedCentre);

  useEffect(() => {
    setWorkspace("global");
  }, [setWorkspace]);

  const sel = CENTRES.find((c) => c.id === centre);

  const faces: CubeFace[] = useMemo(
    () => [
      {
        code: "F1",
        title: "Market Data",
        accent: "#ffb4a6",
        metrics: [
          { label: "Tick rate", value: sel ? `${Math.floor(68000 * sel.activity)}/s` : "71,120/s", tone: "good" },
          { label: "MD latency p99", value: sel && sel.activity > 0.7 ? "6ms" : "9ms", tone: "good" },
          { label: "Venues connected", value: "17/18", tone: "warn" },
          { label: "Liquidity index", value: sel ? `${(sel.activity * 100).toFixed(0)}%` : "81%", tone: "good" },
        ],
      },
      {
        code: "F2",
        title: "Order Flow",
        accent: "#ff8a7a",
        metrics: [
          { label: "Orders in", value: "8,214", tone: "good" },
          { label: "Buy / Sell", value: "56% / 44%", tone: "good" },
          { label: "Imbalance", value: "+0.12σ" },
          { label: "Rejects", value: "0.9%", tone: "warn" },
        ],
      },
      {
        code: "F3",
        title: "Portfolio",
        accent: "#ffb4a6",
        metrics: [
          { label: "Gross exposure", value: "$184.2M" },
          { label: "Net", value: "$61.4M" },
          { label: "Unrealised PnL", value: "+$1.21M", tone: "good" },
          { label: "Util cap", value: "71%" },
        ],
      },
      {
        code: "F4",
        title: "Quant Analysis",
        accent: "#ff8a7a",
        metrics: [
          { label: "Regime", value: "Risk-On" },
          { label: "Momentum (10d)", value: "+1.8σ", tone: "good" },
          { label: "Realised vol", value: "11.4%" },
          { label: "Avg correlation", value: "0.38" },
        ],
      },
      {
        code: "F5",
        title: "AI Intelligence",
        accent: "#ffb4a6",
        metrics: [
          { label: "Active models", value: "11/12", tone: "warn" },
          { label: "Signals / 1h", value: "47" },
          { label: "Avg confidence", value: "0.71", tone: "good" },
          { label: "Anomalies", value: "2", tone: "warn" },
        ],
      },
      {
        code: "F6",
        title: "Risk Engine",
        accent: "#ff8a7a",
        metrics: [
          { label: "VaR 1D (99%)", value: "$1.42M" },
          { label: "Expected shortfall", value: "$2.11M" },
          { label: "Drawdown MTD", value: "-1.8%", tone: "warn" },
          { label: "Limit breaches", value: "1", tone: "bad" },
        ],
      },
    ],
    [sel]
  );

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-edge-crimson/30 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-edge-pale text-xs uppercase tracking-widest">
            WS-01 · Global Market Intelligence
          </span>
          <span className="text-edge-dim text-xxs">
            SIMULATED DATA · demo feed · no live quotes connected
          </span>
        </div>
        <AssetFilter />
      </div>

      <div className="flex-[1_1_60%] min-h-0 grid grid-cols-12 gap-2">
        <div className="col-span-6 min-h-0">
          <Panel
            title="World Financial Net · Rotating Globe"
            code="GEO-GLB"
            right={sel ? sel.exchange : "idle"}
            className="h-full"
          >
            <GlobalGlobe />
          </Panel>
        </div>

        <div className="col-span-4 min-h-0">
          <Panel
            title="Quant Intelligence Cube"
            code="QIC-01"
            right="interactive"
            className="h-full"
          >
            <IntelligenceCube faces={faces} />
          </Panel>
        </div>

        <div className="col-span-2 min-h-0 flex flex-col gap-2">
          <MarketSentiment />
        </div>
      </div>

      <div className="flex-[1_1_40%] min-h-0 grid grid-cols-12 gap-2">
        <div className="col-span-3 min-h-0">
          <CentreDetail />
        </div>
        <div className="col-span-3 min-h-0">
          <GainersLosers />
        </div>
        <div className="col-span-2 min-h-0">
          <SessionsBar />
        </div>
        <div className="col-span-2 min-h-0 flex flex-col gap-2">
          <IndicesPanel />
          <CryptoPanel />
        </div>
        <div className="col-span-2 min-h-0 flex flex-col gap-2">
          <EventsFeed />
          <Heatmap />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Panel } from "../components/Panel";
import { InstrumentSearch } from "../components/trading/InstrumentSearch";
import { CandlestickChart } from "../components/trading/CandlestickChart";
import { OrderBook } from "../components/trading/OrderBook";
import { RecentTrades } from "../components/trading/RecentTrades";
import { PortfolioPanel } from "../components/trading/PortfolioPanel";
import { AIAnalyst } from "../components/trading/AIAnalyst";
import { TechIndicators } from "../components/trading/TechIndicators";
import { useAppStore } from "../store/useAppStore";

export default function TradingWorkspace() {
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const instr = useAppStore((s) => s.selectedInstrument);
  const compare = useAppStore((s) => s.compareInstruments);
  useEffect(() => setWorkspace("trading"), [setWorkspace]);

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-edge-crimson/30 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-edge-pale text-xs uppercase tracking-widest">
            WS-02 · Trading & Portfolio Analysis
          </span>
          <span className="text-edge-dim text-xxs">
            SIMULATED DATA · drag chart · universal search below
          </span>
        </div>
        <div className="text-xxs text-edge-dim">
          <span className="text-edge-pale">{instr.symbol}</span>{" "}
          <span>{instr.name}</span> ·{" "}
          <span
            className={instr.chg >= 0 ? "text-edge-green" : "text-edge-salmon"}
          >
            {instr.chg >= 0 ? "+" : ""}
            {instr.chg.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="flex-shrink-0">
        <InstrumentSearch />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-6 gap-2">
        <div className="col-start-1 col-span-7 row-start-1 row-span-4 min-h-0">
          <Panel
            title={`Chart · ${instr.symbol} · 1m · ${instr.venue}`}
            code="TRD-CHT"
            right={`SMA20 · SMA50 · S/R · ${compare.length} overlays`}
            className="h-full"
          >
            <CandlestickChart symbol={instr.symbol} compare={compare} />
          </Panel>
        </div>

        <div className="col-start-8 col-span-2 row-start-1 row-span-6 min-h-0">
          <Panel
            title="Order Book · L2"
            code="TRD-OB"
            right="10 lvls"
            className="h-full"
          >
            <OrderBook symbol={instr.symbol} last={instr.last} />
          </Panel>
        </div>

        <div className="col-start-10 col-span-3 row-start-1 row-span-6 min-h-0 flex flex-col gap-2">
          <Panel title="Technicals" code="TRD-TA" className="flex-1">
            <TechIndicators symbol={instr.symbol} />
          </Panel>
          <Panel title="Recent Trades" code="TRD-RT" className="flex-1">
            <RecentTrades last={instr.last} />
          </Panel>
        </div>

        <div className="col-start-1 col-span-4 row-start-5 row-span-2 min-h-0">
          <Panel title="Portfolio · Positions & Orders" code="TRD-PRT" className="h-full">
            <PortfolioPanel />
          </Panel>
        </div>

        <div className="col-start-5 col-span-3 row-start-5 row-span-2 min-h-0">
          <Panel
            title="AI Research · Analyst"
            code="TRD-AI"
            right="evidence-cited"
            className="h-full"
          >
            <AIAnalyst />
          </Panel>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtPnL } from "../../lib/ledgerApi";
import { PortfolioPanel } from "./PortfolioPanel";
import { OrderBook } from "./OrderBook";
import { AIAnalyst } from "./AIAnalyst";

type SideTab = "orderbook" | "ai";

/**
 * Bottom blotter dock:
 * - Left: Fills | Positions | Decisions (always)
 * - Right: Order Book XOR AI Research (tabbed — only one at a time)
 */
export function BlotterDock() {
  const [side, setSide] = useState<SideTab>("orderbook");
  const instr = useAppStore((s) => s.selectedInstrument);
  const sim = useLedgerStore((s) => s.summary);

  return (
    <section className="panel relative flex flex-col h-full min-h-0">
      <span className="corner corner-tl" />
      <span className="corner corner-tr" />
      <span className="corner corner-bl" />
      <span className="corner corner-br" />
      <header className="panel-header">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-edge-crimson/80 text-xxs shrink-0">TRD-BLT</span>
          <span className="text-edge-pale text-xxs uppercase tracking-widest">
            Blotter
          </span>
          <span className="text-edge-dim text-xxs tabular">
            {sim.connected
              ? `${sim.buys}B / ${sim.sells}S · RPNL ${fmtPnL(sim.realizedPnL)} · ${sim.executionLabel}`
              : "ledger offline"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(
            [
              { id: "orderbook" as const, label: "Order Book" },
              { id: "ai" as const, label: "AI Research" },
            ] as const
          ).map((t) => {
            const active = side === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSide(t.id)}
                className={
                  "px-2 py-[2px] text-xxs uppercase tracking-widest border transition-colors " +
                  (active
                    ? "border-edge-crimson text-edge-pale bg-edge-crimson/15"
                    : "border-transparent text-edge-dim hover:text-edge-pale hover:border-edge-crimson/40")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-2 p-2">
        <div className="col-span-8 min-h-0 overflow-hidden border border-edge-crimson/20">
          <PortfolioPanel />
        </div>
        <div className="col-span-4 min-h-0 overflow-hidden border border-edge-crimson/20 flex flex-col">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase shrink-0">
            {side === "orderbook" ? "Order Book · L2" : "AI Research · Analyst"}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {side === "orderbook" ? (
              <OrderBook symbol={instr.symbol} last={instr.last} />
            ) : (
              <AIAnalyst />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

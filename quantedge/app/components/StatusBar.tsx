"use client";

import { useAppStore } from "../store/useAppStore";
import { useLedgerStore } from "../store/useLedgerStore";
import { fmtGBP, fmtPnL } from "../lib/ledgerApi";

export function StatusBar() {
  const workspace = useAppStore((s) => s.workspace);
  const instrument = useAppStore((s) => s.selectedInstrument);
  const centre = useAppStore((s) => s.selectedCentre);
  const face = useAppStore((s) => s.selectedCubeFace);
  const latency = useAppStore((s) => s.latencyMs);
  const sim = useLedgerStore((s) => s.summary);

  const online = sim.connected && sim.executionLabel === "ONLINE";
  const retTone =
    sim.returnPct > 0
      ? "text-edge-green"
      : sim.returnPct < 0
      ? "text-edge-salmon"
      : "text-edge-text";

  return (
    <div className="absolute inset-x-0 bottom-[32px] h-[38px] z-20 border-t border-edge-crimson/40 bg-bg-1/90 flex items-center text-xxs">
      <div className="flex items-center gap-5 px-4 h-full overflow-x-auto">
        <span className="text-edge-dim">
          MODEL{" "}
          {sim.connected ? (
            <span className={online ? "text-edge-green" : "text-edge-amber"}>
              ● {sim.executionLabel}
            </span>
          ) : (
            <span className="text-edge-salmon">● OFFLINE</span>
          )}
        </span>
        <span className="text-edge-dim">
          DEPOSIT{" "}
          <span className="text-edge-text">
            {sim.connected ? fmtGBP(sim.deposit) : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          CASH{" "}
          <span className="text-edge-text">
            {sim.connected ? fmtGBP(sim.cash) : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          EQUITY{" "}
          <span className="text-edge-pale">
            {sim.connected ? fmtGBP(sim.equity) : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          RET{" "}
          <span className={sim.connected ? retTone : "text-edge-dim"}>
            {sim.connected
              ? `${sim.returnPct >= 0 ? "+" : ""}${sim.returnPct.toFixed(2)}%`
              : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          FILLS{" "}
          <span className="text-edge-green">
            {sim.connected ? sim.tradesCompleted.toLocaleString() : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          RPNL{" "}
          <span
            className={
              !sim.connected
                ? "text-edge-dim"
                : sim.realizedPnL >= 0
                ? "text-edge-green"
                : "text-edge-salmon"
            }
          >
            {sim.connected ? fmtPnL(sim.realizedPnL) : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          LAT <span className="text-edge-text">{latency}ms</span>
        </span>
      </div>
      <div className="ml-auto flex items-center gap-5 px-4 h-full shrink-0">
        <span className="text-edge-dim">
          WS <span className="text-edge-pale uppercase">{workspace}</span>
        </span>
        <span className="text-edge-dim">
          SEL <span className="text-edge-pale">{instrument.symbol}</span>
        </span>
        <span className="text-edge-dim">
          CTR <span className="text-edge-pale">{centre ?? "—"}</span>
        </span>
        <span className="text-edge-dim">
          CUBE{" "}
          <span className="text-edge-pale">
            {face == null ? "IDLE" : `F${face + 1}`}
          </span>
        </span>
        <span className="text-edge-dim">
          LEDGER{" "}
          <span
            className={sim.connected ? "text-edge-green" : "text-edge-salmon"}
          >
            {sim.connected ? ":8000" : "DOWN"}
          </span>
        </span>
      </div>
    </div>
  );
}

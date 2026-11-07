"use client";

import { useAppStore } from "../store/useAppStore";
import { useLedgerStore } from "../store/useLedgerStore";
import { fmtPnL } from "../lib/ledgerApi";

export function StatusBar() {
  const workspace = useAppStore((s) => s.workspace);
  const instrument = useAppStore((s) => s.selectedInstrument);
  const centre = useAppStore((s) => s.selectedCentre);
  const face = useAppStore((s) => s.selectedCubeFace);
  const latency = useAppStore((s) => s.latencyMs);
  const sim = useLedgerStore((s) => s.summary);

  const online = sim.connected && sim.executionLabel === "ONLINE";
  const rpnlTone =
    sim.realizedPnL > 0
      ? "text-edge-green"
      : sim.realizedPnL < 0
      ? "text-edge-salmon"
      : "text-edge-text";

  return (
    <div className="absolute inset-x-0 bottom-[32px] h-[38px] z-20 border-t border-edge-crimson/40 bg-bg-1/90 flex items-center text-xxs">
      <div className="flex items-center gap-6 px-4 h-full">
        <span className="text-edge-dim">
          SIM{" "}
          {sim.connected ? (
            <span className={online ? "text-edge-green" : "text-edge-amber"}>
              ● {sim.executionLabel}
            </span>
          ) : (
            <span className="text-edge-salmon">● OFFLINE</span>
          )}
        </span>
        <span className="text-edge-dim">
          ORDERS{" "}
          <span className="text-edge-text">
            {sim.connected ? sim.ordersSubmitted.toLocaleString() : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          FILLS{" "}
          <span className="text-edge-green">
            {sim.connected ? sim.tradesCompleted.toLocaleString() : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          QUEUED{" "}
          <span
            className={
              sim.ordersPending > 0 ? "text-edge-amber" : "text-edge-text"
            }
          >
            {sim.connected ? sim.ordersPending.toLocaleString() : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          RPNL{" "}
          <span className={sim.connected ? rpnlTone : "text-edge-dim"}>
            {sim.connected ? fmtPnL(sim.realizedPnL) : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          UPNL{" "}
          <span
            className={
              !sim.connected
                ? "text-edge-dim"
                : sim.unrealizedPnL >= 0
                ? "text-edge-green"
                : "text-edge-salmon"
            }
          >
            {sim.connected ? fmtPnL(sim.unrealizedPnL) : "—"}
          </span>
        </span>
        <span className="text-edge-dim">
          LAT <span className="text-edge-text">{latency}ms</span>
        </span>
      </div>
      <div className="ml-auto flex items-center gap-6 px-4 h-full">
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
          <span className={sim.connected ? "text-edge-green" : "text-edge-salmon"}>
            {sim.connected ? ":8000" : "DOWN"}
          </span>
        </span>
      </div>
    </div>
  );
}

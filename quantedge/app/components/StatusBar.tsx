"use client";

import { useAppStore } from "../store/useAppStore";

export function StatusBar() {
  const workspace = useAppStore((s) => s.workspace);
  const instrument = useAppStore((s) => s.selectedInstrument);
  const centre = useAppStore((s) => s.selectedCentre);
  const face = useAppStore((s) => s.selectedCubeFace);
  const latency = useAppStore((s) => s.latencyMs);

  return (
    <div className="absolute inset-x-0 bottom-[32px] h-[38px] z-20 border-t border-edge-crimson/40 bg-bg-1/90 flex items-center text-xxs">
      <div className="flex items-center gap-6 px-4 h-full">
        <span className="text-edge-dim">
          STATUS <span className="text-edge-green">● LIVE</span>
        </span>
        <span className="text-edge-dim">
          FEEDS <span className="text-edge-green">41/42</span>{" "}
          <span className="text-edge-amber">1 DEG</span>
        </span>
        <span className="text-edge-dim">
          ORDERS <span className="text-edge-text">8,214</span>{" "}
          <span className="text-edge-green">▲</span>
        </span>
        <span className="text-edge-dim">
          VAR 1D <span className="text-edge-text">1.42M USD</span>
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
          CPU <span className="text-edge-text">37%</span>
        </span>
        <span className="text-edge-dim">
          MEM <span className="text-edge-text">48%</span>
        </span>
        <span className="text-edge-dim">
          NET <span className="text-edge-green">●</span>
        </span>
      </div>
    </div>
  );
}

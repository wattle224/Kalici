"use client";

import { Panel } from "../Panel";

export function CryptoPanel() {
  return (
    <Panel title="Crypto Market" code="MKT-CRY" right="24h">
      <div className="p-3 h-full overflow-auto scrollbar text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-edge-dim text-xxs">TOTAL MARKET CAP</div>
            <div className="text-edge-pale text-lg tabular">$2.42T</div>
            <div className="text-edge-green text-xxs">+1.84% · 24h</div>
          </div>
          <div>
            <div className="text-edge-dim text-xxs">BTC DOMINANCE</div>
            <div className="text-edge-pale text-lg tabular">54.1%</div>
            <div className="text-edge-amber text-xxs">+0.11% · 24h</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between border-b border-edge-crimson/10 py-1">
            <span className="text-edge-text">BTC-USD</span>
            <span className="tabular text-edge-text">72,431</span>
            <span className="text-edge-green">+1.84%</span>
          </div>
          <div className="flex justify-between border-b border-edge-crimson/10 py-1">
            <span className="text-edge-text">ETH-USD</span>
            <span className="tabular text-edge-text">2,581.7</span>
            <span className="text-edge-green">+0.92%</span>
          </div>
          <div className="flex justify-between border-b border-edge-crimson/10 py-1">
            <span className="text-edge-text">SOL-USD</span>
            <span className="tabular text-edge-text">172.3</span>
            <span className="text-edge-green">+3.10%</span>
          </div>
          <div className="flex justify-between border-b border-edge-crimson/10 py-1">
            <span className="text-edge-text">XRP-USD</span>
            <span className="tabular text-edge-text">0.5241</span>
            <span className="text-edge-green">+0.44%</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

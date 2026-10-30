"use client";

import { Panel } from "../Panel";
import { CENTRES, INSTRUMENTS } from "../../data/markets";
import { useAppStore } from "../../store/useAppStore";

export function CentreDetail() {
  const sel = useAppStore((s) => s.selectedCentre);
  const centre = CENTRES.find((c) => c.id === sel) ?? null;
  const relCrypto = INSTRUMENTS.filter((i) => i.cls === "crypto").slice(0, 4);

  return (
    <Panel
      title={centre ? `Region · ${centre.city.toUpperCase()}` : "Region · select on globe"}
      code="GEO-RGN"
      right={centre ? centre.country : "—"}
    >
      <div className="p-3 text-xs h-full overflow-auto scrollbar">
        {!centre && (
          <div className="text-edge-dim">
            Click any node on the globe to inspect its exchanges, market
            sessions, principal indices and recent activity.
          </div>
        )}
        {centre && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-edge-dim text-xxs">EXCHANGE</div>
                <div className="text-edge-text">{centre.exchange}</div>
              </div>
              <div>
                <div className="text-edge-dim text-xxs">SESSION</div>
                <div
                  className={
                    centre.session === "open"
                      ? "text-edge-green"
                      : centre.session === "closed"
                      ? "text-edge-salmon"
                      : "text-edge-amber"
                  }
                >
                  ● {centre.session.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-edge-dim text-xxs">TIMEZONE</div>
                <div className="text-edge-text">{centre.tz}</div>
              </div>
              <div>
                <div className="text-edge-dim text-xxs">ACTIVITY</div>
                <div className="text-edge-pale">
                  {(centre.activity * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div>
              <div className="text-edge-dim text-xxs mb-1">PRINCIPAL INDICES</div>
              <table className="w-full tabular">
                <tbody>
                  {centre.indices.map((idx) => (
                    <tr key={idx.symbol} className="border-b border-edge-crimson/10">
                      <td className="py-[2px] text-edge-text">{idx.symbol}</td>
                      <td className="py-[2px] text-right text-edge-text">
                        {idx.last.toLocaleString()}
                      </td>
                      <td
                        className={
                          "py-[2px] text-right " +
                          (idx.chg >= 0 ? "text-edge-green" : "text-edge-salmon")
                        }
                      >
                        {idx.chg >= 0 ? "+" : ""}
                        {idx.chg.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="text-edge-dim text-xxs mb-1">LEADING GAINERS</div>
              <div className="grid grid-cols-2 gap-1 text-xxs">
                {["NVDA +2.11%", "META +0.98%", "AMZN +0.55%", "MSFT +0.42%"].map(
                  (s) => (
                    <div key={s} className="text-edge-green">
                      {s}
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <div className="text-edge-dim text-xxs mb-1">LEADING LOSERS</div>
              <div className="grid grid-cols-2 gap-1 text-xxs">
                {["TSLA -1.23%", "WMT -0.42%", "KO -0.31%", "PFE -0.22%"].map(
                  (s) => (
                    <div key={s} className="text-edge-salmon">
                      {s}
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <div className="text-edge-dim text-xxs mb-1">VOLUME · VOLATILITY</div>
              <div className="flex gap-4">
                <div>
                  <span className="text-edge-dim">VOL </span>
                  <span className="text-edge-text">
                    {(centre.activity * 2.4).toFixed(2)}B
                  </span>
                </div>
                <div>
                  <span className="text-edge-dim">σ </span>
                  <span className="text-edge-text">
                    {(1 - centre.activity + 0.6).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-edge-dim">LIQ </span>
                  <span className="text-edge-green">OK</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-edge-dim text-xxs mb-1">RELATED CRYPTO</div>
              <table className="w-full tabular">
                <tbody>
                  {relCrypto.map((i) => (
                    <tr key={i.symbol} className="border-b border-edge-crimson/10">
                      <td className="py-[2px] text-edge-text">{i.symbol}</td>
                      <td className="py-[2px] text-right text-edge-text">
                        {i.last.toLocaleString()}
                      </td>
                      <td
                        className={
                          "py-[2px] text-right " +
                          (i.chg >= 0 ? "text-edge-green" : "text-edge-salmon")
                        }
                      >
                        {i.chg >= 0 ? "+" : ""}
                        {i.chg.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

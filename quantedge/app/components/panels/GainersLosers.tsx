"use client";

import { TOP_GAINERS, TOP_LOSERS } from "../../data/markets";
import { Panel } from "../Panel";

function List({
  rows,
  dir,
}: {
  rows: { symbol: string; chg: number }[];
  dir: "up" | "down";
}) {
  return (
    <div className="h-full overflow-auto scrollbar">
      <table className="w-full text-xs tabular">
        <tbody>
          {rows.map((r, i) => {
            const w = Math.min(100, Math.abs(r.chg) * 25);
            return (
              <tr key={r.symbol} className="border-b border-edge-crimson/10">
                <td className="px-2 py-[3px] text-edge-dim w-6">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-2 py-[3px] text-edge-text">{r.symbol}</td>
                <td className="px-2 py-[3px] w-full">
                  <div className="relative h-[6px] bg-edge-crimson/10">
                    <div
                      className={
                        "absolute top-0 bottom-0 " +
                        (dir === "up" ? "bg-edge-green/70" : "bg-edge-salmon/70")
                      }
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </td>
                <td
                  className={
                    "px-2 py-[3px] text-right " +
                    (dir === "up" ? "text-edge-green" : "text-edge-salmon")
                  }
                >
                  {r.chg >= 0 ? "+" : ""}
                  {r.chg.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GainersLosers() {
  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      <Panel title="Top Gainers · 1D" code="MKT-TG" right="Spot">
        <List rows={TOP_GAINERS} dir="up" />
      </Panel>
      <Panel title="Top Losers · 1D" code="MKT-TL" right="Spot">
        <List rows={TOP_LOSERS} dir="down" />
      </Panel>
    </div>
  );
}

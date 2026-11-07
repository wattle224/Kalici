"use client";

import { Panel } from "../Panel";
import { INSTRUMENTS } from "../../data/markets";

export function IndicesPanel() {
  const idx = INSTRUMENTS.filter((i) => i.cls === "indices");
  return (
    <Panel title="Major Global Indices" code="MKT-IDX" right="Spot">
      <div className="p-2 h-full overflow-auto scrollbar">
        <table className="w-full text-xs tabular">
          <tbody>
            {idx.map((i) => (
              <tr key={i.symbol} className="border-b border-edge-crimson/10">
                <td className="py-[3px] px-2 text-edge-text">{i.symbol}</td>
                <td className="py-[3px] px-2 text-edge-dim text-xxs">
                  {i.name}
                </td>
                <td className="py-[3px] px-2 text-right text-edge-text">
                  {i.last.toLocaleString()}
                </td>
                <td
                  className={
                    "py-[3px] px-2 text-right " +
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
    </Panel>
  );
}

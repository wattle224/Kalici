"use client";

import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtGBP, fmtPnL } from "../../lib/ledgerApi";

/** Live BUY / SELL fills from the deposit-funded model (not market tape). */
export function ModelFills() {
  const summary = useLedgerStore((s) => s.summary);
  const fills = summary.recentFills;

  if (!summary.connected) {
    return (
      <div className="h-full flex items-center justify-center p-3 text-xxs text-edge-dim text-center">
        Ledger offline — start :8000 to see model buys &amp; sells.
      </div>
    );
  }

  if (fills.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-3 text-xxs text-edge-dim text-center">
        No buys or sells yet.
        <br />
        Model is holding cash until it finds an opportunity.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto scrollbar text-xs">
      <div className="px-2 py-1 border-b border-edge-crimson/25 text-xxs text-edge-dim flex gap-3 sticky top-0 bg-bg-0/95">
        <span>
          <span className="text-edge-green">{summary.buys}</span> buys
        </span>
        <span>
          <span className="text-edge-salmon">{summary.sells}</span> sells
        </span>
        <span className="ml-auto tabular">
          realised {fmtPnL(summary.realizedPnL)}
        </span>
      </div>
      <table className="w-full tabular">
        <thead>
          <tr className="text-xxs text-edge-dim">
            <th className="text-left px-2 py-1">TIME</th>
            <th className="text-left px-2 py-1">SIDE</th>
            <th className="text-left px-2 py-1">SYM</th>
            <th className="text-right px-2 py-1">QTY</th>
            <th className="text-right px-2 py-1">PX</th>
            <th className="text-right px-2 py-1">£</th>
            <th className="text-right px-2 py-1">RPNL</th>
          </tr>
        </thead>
        <tbody>
          {fills.map((o) => {
            const notional = o.quantity * o.executionPrice;
            return (
              <tr key={o.id} className="border-b border-edge-crimson/10">
                <td className="px-2 py-[3px] text-edge-dim whitespace-nowrap">
                  {new Date(o.executedAt).toISOString().slice(11, 19)}
                </td>
                <td
                  className={
                    "px-2 py-[3px] uppercase font-medium " +
                    (o.side === "buy"
                      ? "text-edge-green"
                      : "text-edge-salmon")
                  }
                >
                  {o.side === "buy" ? "BUY" : "SELL"}
                </td>
                <td className="px-2 py-[3px] text-edge-pale">{o.symbol}</td>
                <td className="px-2 py-[3px] text-right text-edge-text">
                  {o.quantity.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </td>
                <td className="px-2 py-[3px] text-right text-edge-dim">
                  {o.executionPrice.toFixed(4)}
                </td>
                <td className="px-2 py-[3px] text-right text-edge-text">
                  {fmtGBP(notional)}
                </td>
                <td
                  className={
                    "px-2 py-[3px] text-right " +
                    (o.realizedPnL == null
                      ? "text-edge-dim"
                      : o.realizedPnL >= 0
                      ? "text-edge-green"
                      : "text-edge-salmon")
                  }
                >
                  {o.realizedPnL == null ? "—" : fmtPnL(o.realizedPnL)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

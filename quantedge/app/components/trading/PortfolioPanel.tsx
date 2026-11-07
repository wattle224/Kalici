"use client";

import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtPnL } from "../../lib/ledgerApi";

export function PortfolioPanel() {
  const summary = useLedgerStore((s) => s.summary);

  if (!summary.connected) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-xs text-edge-dim">
        <div className="text-center max-w-sm">
          <div className="text-edge-salmon text-xxs uppercase tracking-widest mb-2">
            Ledger Offline
          </div>
          Connect the simulation ledger on{" "}
          <span className="text-edge-pale">127.0.0.1:8000</span> to see live
          positions, submitted orders and completed trades here.
        </div>
      </div>
    );
  }

  const fills = summary.recentFills.slice(0, 40);
  const pending = summary.pending;
  const rpnlTone =
    summary.realizedPnL >= 0 ? "text-edge-green" : "text-edge-salmon";
  const upnlTone =
    summary.unrealizedPnL >= 0 ? "text-edge-green" : "text-edge-salmon";

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-4 gap-2 p-2 border-b border-edge-crimson/30">
        <div>
          <div className="text-edge-dim text-xxs">ORDERS SUBMITTED</div>
          <div className="text-edge-pale tabular text-sm">
            {summary.ordersSubmitted.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">TRADES COMPLETED</div>
          <div className="text-edge-green tabular text-sm">
            {summary.tradesCompleted.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">REALISED PNL</div>
          <div className={"tabular text-sm " + rpnlTone}>
            {fmtPnL(summary.realizedPnL)}
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">UNREALISED PNL</div>
          <div className={"tabular text-sm " + upnlTone}>
            {fmtPnL(summary.unrealizedPnL)}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-2 gap-2 p-2">
        <div className="overflow-auto scrollbar border border-edge-crimson/20">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Open Positions · {summary.positions.length}
          </div>
          {summary.positions.length === 0 ? (
            <div className="p-2 text-edge-dim text-xxs">
              No open positions — flat book.
            </div>
          ) : (
            <table className="w-full tabular">
              <thead>
                <tr className="text-xxs text-edge-dim">
                  <th className="text-left px-2 py-1">SYM</th>
                  <th className="text-right px-2 py-1">QTY</th>
                  <th className="text-right px-2 py-1">AVG</th>
                  <th className="text-right px-2 py-1">UPNL</th>
                </tr>
              </thead>
              <tbody>
                {summary.positions.map((p) => (
                  <tr
                    key={p.symbol}
                    className="border-b border-edge-crimson/10"
                  >
                    <td className="px-2 py-[2px] text-edge-text">{p.symbol}</td>
                    <td
                      className={
                        "px-2 py-[2px] text-right " +
                        (p.quantity >= 0
                          ? "text-edge-text"
                          : "text-edge-salmon")
                      }
                    >
                      {p.quantity.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td className="px-2 py-[2px] text-right text-edge-dim">
                      {p.averageEntryPrice.toFixed(4)}
                    </td>
                    <td
                      className={
                        "px-2 py-[2px] text-right " +
                        (p.unrealizedPnL >= 0
                          ? "text-edge-green"
                          : "text-edge-salmon")
                      }
                    >
                      {fmtPnL(p.unrealizedPnL)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-auto scrollbar border border-edge-crimson/20">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Completed Trades · {fills.length}
            {pending.length > 0 && (
              <span className="text-edge-amber">
                {" "}
                · {pending.length} queued
              </span>
            )}
          </div>
          <table className="w-full tabular">
            <thead>
              <tr className="text-xxs text-edge-dim">
                <th className="text-left px-2 py-1">REF</th>
                <th className="text-left px-2 py-1">SYM</th>
                <th className="text-left px-2 py-1">SIDE</th>
                <th className="text-right px-2 py-1">QTY</th>
                <th className="text-right px-2 py-1">PX</th>
                <th className="text-right px-2 py-1">RPNL</th>
                <th className="text-left px-2 py-1">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((o) => (
                <tr key={"p-" + o.id} className="border-b border-edge-crimson/10">
                  <td className="px-2 py-[2px] text-edge-dim">{o.id.slice(0, 10)}</td>
                  <td className="px-2 py-[2px] text-edge-text">{o.symbol}</td>
                  <td
                    className={
                      "px-2 py-[2px] uppercase " +
                      (o.side === "buy"
                        ? "text-edge-green"
                        : "text-edge-salmon")
                    }
                  >
                    {o.side}
                  </td>
                  <td className="px-2 py-[2px] text-right">{o.quantity}</td>
                  <td className="px-2 py-[2px] text-right">
                    {o.price.toFixed(4)}
                  </td>
                  <td className="px-2 py-[2px] text-right text-edge-dim">—</td>
                  <td className="px-2 py-[2px] text-edge-amber">QUEUED</td>
                </tr>
              ))}
              {fills.map((o) => (
                <tr key={o.id} className="border-b border-edge-crimson/10">
                  <td className="px-2 py-[2px] text-edge-dim">
                    {o.orderReference || o.id.slice(0, 10)}
                  </td>
                  <td className="px-2 py-[2px] text-edge-text">{o.symbol}</td>
                  <td
                    className={
                      "px-2 py-[2px] uppercase " +
                      (o.side === "buy"
                        ? "text-edge-green"
                        : "text-edge-salmon")
                    }
                  >
                    {o.side}
                  </td>
                  <td className="px-2 py-[2px] text-right">
                    {o.quantity.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </td>
                  <td className="px-2 py-[2px] text-right">
                    {o.executionPrice.toFixed(4)}
                  </td>
                  <td
                    className={
                      "px-2 py-[2px] text-right " +
                      (o.realizedPnL == null
                        ? "text-edge-dim"
                        : o.realizedPnL >= 0
                        ? "text-edge-green"
                        : "text-edge-salmon")
                    }
                  >
                    {o.realizedPnL == null ? "—" : fmtPnL(o.realizedPnL)}
                  </td>
                  <td className="px-2 py-[2px] text-edge-green uppercase">
                    {o.status}
                  </td>
                </tr>
              ))}
              {fills.length === 0 && pending.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-3 text-edge-dim text-xxs text-center"
                  >
                    No fills yet — simulation is connected but empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtGBP, fmtPnL } from "../../lib/ledgerApi";

export function PortfolioPanel() {
  const summary = useLedgerStore((s) => s.summary);

  if (!summary.connected) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-xs text-edge-dim">
        <div className="text-center max-w-sm">
          <div className="text-edge-salmon text-xxs uppercase tracking-widest mb-2">
            Ledger Offline
          </div>
          Connect the deposit-based simulation ledger on{" "}
          <span className="text-edge-pale">127.0.0.1:8000</span> to see live
          capital, model decisions, and fills.
        </div>
      </div>
    );
  }

  const fills = summary.recentFills.slice(0, 30);
  const decisions = summary.decisions.slice(0, 12);
  const rpnlTone =
    summary.realizedPnL >= 0 ? "text-edge-green" : "text-edge-salmon";
  const retTone =
    summary.returnPct >= 0 ? "text-edge-green" : "text-edge-salmon";

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-5 gap-2 p-2 border-b border-edge-crimson/30">
        <div>
          <div className="text-edge-dim text-xxs">DEPOSIT</div>
          <div className="text-edge-pale tabular text-sm">
            {fmtGBP(summary.deposit)}
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">CASH</div>
          <div className="text-edge-pale tabular text-sm">
            {fmtGBP(summary.cash)}
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">EQUITY</div>
          <div className="text-edge-pale tabular text-sm">
            {fmtGBP(summary.equity)}
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">RETURN</div>
          <div className={"tabular text-sm " + retTone}>
            {summary.returnPct >= 0 ? "+" : ""}
            {summary.returnPct.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">REALISED</div>
          <div className={"tabular text-sm " + rpnlTone}>
            {fmtPnL(summary.realizedPnL)}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-3 gap-2 p-2">
        <div className="overflow-auto scrollbar border border-edge-crimson/20">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Model Decisions · BUY / SELL / HOLD
          </div>
          {decisions.length === 0 ? (
            <div className="p-2 text-edge-dim text-xxs">
              Waiting for first model decision…
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.id} className="border-b border-edge-crimson/10">
                    <td className="px-2 py-[3px] text-edge-dim tabular whitespace-nowrap">
                      {new Date(d.at).toISOString().slice(11, 19)}
                    </td>
                    <td
                      className={
                        "px-2 py-[3px] uppercase text-xxs " +
                        (d.action === "BUY"
                          ? "text-edge-green"
                          : d.action === "SELL"
                          ? "text-edge-salmon"
                          : "text-edge-amber")
                      }
                    >
                      {d.action}
                    </td>
                    <td className="px-2 py-[3px] text-edge-text">{d.reason}</td>
                    <td className="px-2 py-[3px] text-right text-edge-dim tabular">
                      {d.score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-auto scrollbar border border-edge-crimson/20">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Open Positions · {summary.positions.length}
          </div>
          {summary.positions.length === 0 ? (
            <div className="p-2 text-edge-dim text-xxs">
              Flat — all capital in cash until the model buys.
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
                    <td className="px-2 py-[2px] text-right">
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
          </div>
          <table className="w-full tabular">
            <thead>
              <tr className="text-xxs text-edge-dim">
                <th className="text-left px-2 py-1">REF</th>
                <th className="text-left px-2 py-1">SIDE</th>
                <th className="text-right px-2 py-1">QTY</th>
                <th className="text-right px-2 py-1">PX</th>
                <th className="text-right px-2 py-1">RPNL</th>
                <th className="text-left px-2 py-1">SRC</th>
              </tr>
            </thead>
            <tbody>
              {fills.map((o) => (
                <tr key={o.id} className="border-b border-edge-crimson/10">
                  <td className="px-2 py-[2px] text-edge-dim">
                    {o.orderReference || o.id.slice(0, 10)}
                  </td>
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
                  <td className="px-2 py-[2px] text-edge-dim">{o.source}</td>
                </tr>
              ))}
              {fills.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-3 text-edge-dim text-xxs text-center"
                  >
                    No fills yet — model is evaluating opportunities against
                    your deposit.
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

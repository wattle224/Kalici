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

  const fills = summary.recentFills.slice(0, 50);
  const decisions = summary.decisions
    .filter((d) => d.action === "BUY" || d.action === "SELL")
    .slice(0, 20);
  const rpnlTone =
    summary.realizedPnL >= 0 ? "text-edge-green" : "text-edge-salmon";
  const retTone =
    summary.returnPct >= 0 ? "text-edge-green" : "text-edge-salmon";

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-6 gap-2 p-2 border-b border-edge-crimson/30">
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
          <div className="text-edge-dim text-xxs">BOUGHT</div>
          <div className="text-edge-green tabular text-sm">{summary.buys}</div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">SOLD</div>
          <div className="text-edge-salmon tabular text-sm">
            {summary.sells}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-[1.4fr_0.8fr_0.8fr] gap-2 p-2">
        {/* Fills first — what was bought / sold */}
        <div className="overflow-auto scrollbar border border-edge-crimson/20 min-h-0">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase flex justify-between sticky top-0 bg-bg-0/95">
            <span>
              Bought &amp; Sold · {fills.length} fills · realised{" "}
              <span className={rpnlTone}>{fmtPnL(summary.realizedPnL)}</span>
            </span>
            <span className="text-edge-dim normal-case">
              <span className="text-edge-green">{summary.buys} buys</span>
              {" · "}
              <span className="text-edge-salmon">{summary.sells} sells</span>
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
                <th className="text-right px-2 py-1">NOTIONAL</th>
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
                        "px-2 py-[3px] uppercase " +
                        (o.side === "buy"
                          ? "text-edge-green"
                          : "text-edge-salmon")
                      }
                    >
                      {o.side === "buy" ? "BUY" : "SELL"}
                    </td>
                    <td className="px-2 py-[3px] text-edge-pale">{o.symbol}</td>
                    <td className="px-2 py-[3px] text-right">
                      {o.quantity.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className="px-2 py-[3px] text-right text-edge-dim">
                      {o.executionPrice.toFixed(4)}
                    </td>
                    <td className="px-2 py-[3px] text-right">
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
              {fills.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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

        <div className="overflow-auto scrollbar border border-edge-crimson/20 min-h-0">
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
                  <th className="text-right px-2 py-1">MARK</th>
                  <th className="text-right px-2 py-1">VALUE</th>
                  <th className="text-right px-2 py-1">UPNL</th>
                </tr>
              </thead>
              <tbody>
                {summary.positions.map((p) => {
                  const mark = p.symbol.startsWith("XRP")
                    ? summary.markPrice || p.averageEntryPrice
                    : p.averageEntryPrice;
                  const value = p.quantity * mark;
                  return (
                    <tr
                      key={p.symbol}
                      className="border-b border-edge-crimson/10"
                    >
                      <td className="px-2 py-[2px] text-edge-text">
                        {p.symbol}
                      </td>
                      <td className="px-2 py-[2px] text-right">
                        {p.quantity.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="px-2 py-[2px] text-right text-edge-dim">
                        {p.averageEntryPrice.toFixed(4)}
                      </td>
                      <td className="px-2 py-[2px] text-right text-edge-dim">
                        {mark.toFixed(4)}
                      </td>
                      <td className="px-2 py-[2px] text-right">
                        {fmtGBP(value)}
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-auto scrollbar border border-edge-crimson/20 min-h-0">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Model BUY / SELL Decisions · {decisions.length}
          </div>
          {decisions.length === 0 ? (
            <div className="p-2 text-edge-dim text-xxs">
              No BUY/SELL decisions yet — model may be HOLDing.
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
                          : "text-edge-salmon")
                      }
                    >
                      {d.action}
                    </td>
                    <td className="px-2 py-[3px] text-edge-text">{d.reason}</td>
                    <td className="px-2 py-[3px] text-right text-edge-dim tabular whitespace-nowrap">
                      {d.quantity != null
                        ? `${d.quantity.toFixed(2)} @ ${(d.price ?? 0).toFixed(4)}`
                        : d.score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

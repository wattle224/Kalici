"use client";

const POSITIONS = [
  { sym: "NVDA", qty: 2500, avg: 132.4, last: 141.9, pnl: 23750 },
  { sym: "AAPL", qty: 1800, avg: 232.1, last: 241.12, pnl: 16236 },
  { sym: "MSFT", qty: 1200, avg: 428.1, last: 432.21, pnl: 4932 },
  { sym: "TSLA", qty: -900, avg: 272.5, last: 268.1, pnl: 3960 },
  { sym: "SPY", qty: 500, avg: 572.4, last: 580.3, pnl: 3950 },
  { sym: "BTCUSD", qty: 2.1, avg: 68100, last: 72431, pnl: 9094 },
];

const ORDERS = [
  { id: "O-4421", sym: "NVDA", side: "BUY", qty: 500, type: "LMT", px: 141.0, status: "WORKING" },
  { id: "O-4420", sym: "TSLA", side: "SELL", qty: 300, type: "LMT", px: 269.5, status: "WORKING" },
  { id: "O-4419", sym: "META", side: "BUY", qty: 200, type: "MKT", px: 0, status: "FILLED" },
  { id: "O-4418", sym: "ETHUSD", side: "BUY", qty: 10, type: "LMT", px: 2550, status: "REJECTED" },
];

export function PortfolioPanel() {
  const gross = POSITIONS.reduce((s, p) => s + Math.abs(p.qty) * p.last, 0);
  const net = POSITIONS.reduce((s, p) => s + p.qty * p.last, 0);
  const upnl = POSITIONS.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-3 gap-2 p-2 border-b border-edge-crimson/30">
        <div>
          <div className="text-edge-dim text-xxs">GROSS EXPOSURE</div>
          <div className="text-edge-pale tabular text-sm">
            ${(gross / 1e6).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">NET</div>
          <div className="text-edge-pale tabular text-sm">
            ${(net / 1e6).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-edge-dim text-xxs">UPNL</div>
          <div
            className={
              "tabular text-sm " +
              (upnl >= 0 ? "text-edge-green" : "text-edge-salmon")
            }
          >
            {upnl >= 0 ? "+" : ""}${upnl.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-2 gap-2 p-2">
        <div className="overflow-auto scrollbar border border-edge-crimson/20">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Positions
          </div>
          <table className="w-full tabular">
            <thead>
              <tr className="text-xxs text-edge-dim">
                <th className="text-left px-2 py-1">SYM</th>
                <th className="text-right px-2 py-1">QTY</th>
                <th className="text-right px-2 py-1">AVG</th>
                <th className="text-right px-2 py-1">LAST</th>
                <th className="text-right px-2 py-1">UPNL</th>
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((p) => (
                <tr key={p.sym} className="border-b border-edge-crimson/10">
                  <td className="px-2 py-[2px] text-edge-text">{p.sym}</td>
                  <td
                    className={
                      "px-2 py-[2px] text-right " +
                      (p.qty >= 0 ? "text-edge-text" : "text-edge-salmon")
                    }
                  >
                    {p.qty.toLocaleString()}
                  </td>
                  <td className="px-2 py-[2px] text-right text-edge-dim">
                    {p.avg}
                  </td>
                  <td className="px-2 py-[2px] text-right text-edge-text">
                    {p.last}
                  </td>
                  <td
                    className={
                      "px-2 py-[2px] text-right " +
                      (p.pnl >= 0 ? "text-edge-green" : "text-edge-salmon")
                    }
                  >
                    {p.pnl >= 0 ? "+" : ""}
                    {p.pnl.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto scrollbar border border-edge-crimson/20">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 border-b border-edge-crimson/30 uppercase">
            Open / Recent Orders
          </div>
          <table className="w-full tabular">
            <thead>
              <tr className="text-xxs text-edge-dim">
                <th className="text-left px-2 py-1">ID</th>
                <th className="text-left px-2 py-1">SYM</th>
                <th className="text-left px-2 py-1">SIDE</th>
                <th className="text-right px-2 py-1">QTY</th>
                <th className="text-left px-2 py-1">TYPE</th>
                <th className="text-right px-2 py-1">PX</th>
                <th className="text-left px-2 py-1">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((o) => (
                <tr key={o.id} className="border-b border-edge-crimson/10">
                  <td className="px-2 py-[2px] text-edge-dim">{o.id}</td>
                  <td className="px-2 py-[2px] text-edge-text">{o.sym}</td>
                  <td
                    className={
                      "px-2 py-[2px] " +
                      (o.side === "BUY" ? "text-edge-green" : "text-edge-salmon")
                    }
                  >
                    {o.side}
                  </td>
                  <td className="px-2 py-[2px] text-right">{o.qty}</td>
                  <td className="px-2 py-[2px]">{o.type}</td>
                  <td className="px-2 py-[2px] text-right">
                    {o.px ? o.px.toFixed(2) : "—"}
                  </td>
                  <td
                    className={
                      "px-2 py-[2px] " +
                      (o.status === "FILLED"
                        ? "text-edge-green"
                        : o.status === "REJECTED"
                        ? "text-edge-salmon"
                        : "text-edge-amber")
                    }
                  >
                    {o.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

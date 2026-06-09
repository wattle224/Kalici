"use client";

import {
  formatPrice,
  formatTradeStatus,
  type Trade,
} from "@/lib/trading";

function formatFilledTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function OrderHistoryTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return <p className="meta">No filled orders yet.</p>;
  }

  return (
    <div className="order-table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th>Market</th>
            <th>Side</th>
            <th>Type</th>
            <th>Size</th>
            <th>Price</th>
            <th>Time filled</th>
            <th>Status</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td>{trade.symbol}</td>
              <td className={trade.side === "buy" ? "side-buy" : "side-sell"}>
                {trade.side.toUpperCase()}
              </td>
              <td>{trade.orderType ?? "MARKET"}</td>
              <td>{trade.quantity.toLocaleString("en-GB", { maximumFractionDigits: 6 })}</td>
              <td>{formatPrice(trade.executionPrice, trade.symbol)}</td>
              <td>{formatFilledTime(trade.executedAt)}</td>
              <td className="status-filled">{formatTradeStatus(trade.status)}</td>
              <td>{trade.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

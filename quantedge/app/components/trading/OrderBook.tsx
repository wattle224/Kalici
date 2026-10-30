"use client";

import { useEffect, useMemo, useState } from "react";

export function OrderBook({ symbol, last }: { symbol: string; last: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1500);
    return () => clearInterval(i);
  }, []);

  const rows = useMemo(() => {
    let s = 0;
    for (const ch of symbol) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
    s = (s + t * 13) % 2147483647;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const tickSize = Math.max(0.01, last * 0.0005);
    const asks: { price: number; size: number }[] = [];
    const bids: { price: number; size: number }[] = [];
    for (let i = 0; i < 10; i++) {
      asks.push({
        price: +(last + (i + 1) * tickSize).toFixed(2),
        size: Math.floor(100 + rnd() * 1800),
      });
      bids.push({
        price: +(last - (i + 1) * tickSize).toFixed(2),
        size: Math.floor(100 + rnd() * 1800),
      });
    }
    return { asks: asks.reverse(), bids };
  }, [symbol, last, t]);

  const maxSize = Math.max(
    ...rows.asks.map((r) => r.size),
    ...rows.bids.map((r) => r.size)
  );

  const Row = ({
    r,
    side,
  }: {
    r: { price: number; size: number };
    side: "ask" | "bid";
  }) => {
    const w = (r.size / maxSize) * 100;
    return (
      <div className="relative grid grid-cols-3 text-xxs tabular px-2 py-[2px] border-b border-edge-crimson/10">
        <div
          className={
            "absolute inset-y-0 " +
            (side === "ask"
              ? "right-0 bg-edge-salmon/15"
              : "left-0 bg-edge-green/15")
          }
          style={{ width: `${w}%` }}
        />
        <div
          className={
            "relative " +
            (side === "ask" ? "text-edge-salmon" : "text-edge-green")
          }
        >
          {r.price.toFixed(2)}
        </div>
        <div className="relative text-right text-edge-text">{r.size}</div>
        <div className="relative text-right text-edge-dim">
          {(r.size * r.price).toFixed(0)}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="grid grid-cols-3 text-xxs text-edge-dim px-2 py-1 border-b border-edge-crimson/40">
        <div>PRICE</div>
        <div className="text-right">SIZE</div>
        <div className="text-right">NOTIONAL</div>
      </div>
      <div className="flex-1 overflow-auto scrollbar">
        {rows.asks.map((r, i) => (
          <Row key={"a" + i} r={r} side="ask" />
        ))}
        <div className="px-2 py-1 bg-edge-crimson/15 flex justify-between text-xxs">
          <span className="text-edge-pale">MID {last.toFixed(2)}</span>
          <span className="text-edge-dim">spread 0.02</span>
        </div>
        {rows.bids.map((r, i) => (
          <Row key={"b" + i} r={r} side="bid" />
        ))}
      </div>
    </div>
  );
}

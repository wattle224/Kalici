"use client";

import { useEffect, useState } from "react";

type T = { ts: string; px: number; sz: number; side: "B" | "S" };

export function RecentTrades({ last }: { last: number }) {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    const seed = () => {
      const now = new Date();
      const out: T[] = [];
      for (let i = 0; i < 40; i++) {
        const d = new Date(now.getTime() - i * 2200);
        const side = Math.random() > 0.5 ? "B" : "S";
        out.push({
          ts: d.toISOString().slice(11, 19),
          px: +(last + (Math.random() - 0.5) * 0.3).toFixed(2),
          sz: Math.floor(100 + Math.random() * 1500),
          side,
        });
      }
      setRows(out);
    };
    seed();
    const i = setInterval(() => {
      setRows((r) => [
        {
          ts: new Date().toISOString().slice(11, 19),
          px: +(last + (Math.random() - 0.5) * 0.3).toFixed(2),
          sz: Math.floor(100 + Math.random() * 1500),
          side: Math.random() > 0.5 ? "B" : "S",
        },
        ...r.slice(0, 60),
      ]);
    }, 1300);
    return () => clearInterval(i);
  }, [last]);
  return (
    <div className="h-full overflow-auto scrollbar text-xs">
      <table className="w-full tabular">
        <thead>
          <tr className="text-xxs text-edge-dim">
            <th className="text-left px-2 py-1">TIME</th>
            <th className="text-right px-2 py-1">PX</th>
            <th className="text-right px-2 py-1">SZ</th>
            <th className="text-right px-2 py-1">SIDE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-edge-crimson/5">
              <td className="px-2 py-[2px] text-edge-dim">{r.ts}</td>
              <td
                className={
                  "px-2 py-[2px] text-right " +
                  (r.side === "B" ? "text-edge-green" : "text-edge-salmon")
                }
              >
                {r.px}
              </td>
              <td className="px-2 py-[2px] text-right text-edge-text">{r.sz}</td>
              <td
                className={
                  "px-2 py-[2px] text-right " +
                  (r.side === "B" ? "text-edge-green" : "text-edge-salmon")
                }
              >
                {r.side}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

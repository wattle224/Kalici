"use client";

export function TechIndicators({ symbol }: { symbol: string }) {
  const rows = [
    { k: "RSI 14", v: "68.1", t: "warn" as const, note: "rising, below overbought" },
    { k: "MACD(12,26,9)", v: "+1.42", t: "good" as const, note: "line > signal" },
    { k: "VWAP (D)", v: "141.02", t: "info" as const, note: "price > VWAP" },
    { k: "SMA 20", v: "138.6", t: "good" as const, note: "trend up" },
    { k: "SMA 50", v: "135.1", t: "good" as const, note: "rising" },
    { k: "ATR 14", v: "2.84", t: "info" as const, note: "σ 1.98%" },
    { k: "Support", v: "138.4", t: "info" as const, note: "40-bar lo" },
    { k: "Resistance", v: "145.1", t: "info" as const, note: "40-bar hi" },
    { k: "Pattern", v: "Bull flag", t: "good" as const, note: "conf 71%" },
  ];
  return (
    <div className="h-full overflow-auto scrollbar text-xs">
      <table className="w-full tabular">
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-b border-edge-crimson/10">
              <td className="px-2 py-[3px] text-edge-dim">{r.k}</td>
              <td
                className={
                  "px-2 py-[3px] text-right " +
                  (r.t === "good"
                    ? "text-edge-green"
                    : r.t === "warn"
                    ? "text-edge-amber"
                    : "text-edge-text")
                }
              >
                {r.v}
              </td>
              <td className="px-2 py-[3px] text-right text-xxs text-edge-dim">
                {r.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 text-xxs text-edge-dim">
        <span className="text-edge-crimson/80">▸</span> symbol: {symbol}
      </div>
    </div>
  );
}

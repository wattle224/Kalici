"use client";

import { useMemo, useState } from "react";
import { INSTRUMENTS } from "../../data/markets";
import { useAppStore } from "../../store/useAppStore";

export function InstrumentSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const current = useAppStore((s) => s.selectedInstrument);
  const compare = useAppStore((s) => s.compareInstruments);
  const setInstrument = useAppStore((s) => s.setInstrument);
  const toggleCompare = useAppStore((s) => s.toggleCompare);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return INSTRUMENTS.slice(0, 10);
    return INSTRUMENTS.filter((i) =>
      [i.symbol, i.name, i.venue, i.cls, i.isin ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    ).slice(0, 20);
  }, [q]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search ticker / name / ISIN / venue / asset class"
            className="w-full bg-bg-1 border border-edge-crimson/50 px-2 py-1 text-xs text-edge-text placeholder:text-edge-dim focus:outline-none focus:border-edge-pale"
          />
          <span className="absolute right-2 top-1 text-edge-crimson/80 text-xxs">
            UNIVERSE · {INSTRUMENTS.length}
          </span>
        </div>
        <div className="text-xxs text-edge-dim flex items-center gap-1">
          CMP:{" "}
          {compare.map((c) => (
            <span
              key={c}
              className="badge text-edge-pale cursor-pointer"
              onClick={() => toggleCompare(c)}
            >
              {c} ×
            </span>
          ))}
        </div>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 left-0 right-0 panel max-h-[320px] overflow-auto scrollbar">
          <table className="w-full text-xs">
            <tbody>
              {matches.map((i) => (
                <tr
                  key={i.symbol}
                  className="border-b border-edge-crimson/10 hover:bg-edge-crimson/10"
                >
                  <td
                    className="px-2 py-1 cursor-pointer"
                    onMouseDown={() => {
                      setInstrument(i.symbol);
                      setQ("");
                      setOpen(false);
                    }}
                  >
                    <span className="text-edge-pale">{i.symbol}</span>{" "}
                    <span className="text-edge-dim">{i.name}</span>
                  </td>
                  <td className="px-2 py-1 text-edge-dim text-xxs">
                    {i.venue}
                  </td>
                  <td className="px-2 py-1 text-edge-dim text-xxs uppercase">
                    {i.cls}
                  </td>
                  <td className="px-2 py-1 text-right tabular">{i.last}</td>
                  <td
                    className={
                      "px-2 py-1 text-right " +
                      (i.chg >= 0 ? "text-edge-green" : "text-edge-salmon")
                    }
                  >
                    {i.chg >= 0 ? "+" : ""}
                    {i.chg.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      className="text-xxs text-edge-dim hover:text-edge-pale border border-edge-crimson/30 px-1"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        toggleCompare(i.symbol);
                      }}
                    >
                      {compare.includes(i.symbol) ? "× CMP" : "+ CMP"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-1 text-xxs text-edge-dim">
        Selected: <span className="text-edge-pale">{current.symbol}</span>{" "}
        <span>{current.name}</span> · {current.venue} · {current.cls}
      </div>
    </div>
  );
}

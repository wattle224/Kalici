"use client";

import { useMemo, useState } from "react";
import { INSTRUMENTS } from "@/lib/quantedge/sampleData";
import { useTerminal } from "@/lib/quantedge/TerminalContext";

export default function CommandPalette() {
  const { commandOpen, setCommandOpen, selectSymbol, setWorkspace, providerNote } =
    useTerminal();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return INSTRUMENTS.slice(0, 8);
    return INSTRUMENTS.filter(
      (i) =>
        i.symbol.toLowerCase().includes(query) ||
        i.name.toLowerCase().includes(query) ||
        i.assetClass.includes(query) ||
        (i.isin?.toLowerCase().includes(query) ?? false) ||
        i.exchange.toLowerCase().includes(query)
    ).slice(0, 12);
  }, [q]);

  if (!commandOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded border border-qe-border bg-qe-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to instrument, workspace, or command…"
          className="w-full border-b border-qe-border bg-transparent px-4 py-3 text-sm text-qe-text outline-none"
        />
        <div className="max-h-80 overflow-auto p-2">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-qe-muted">
            Workspaces
          </p>
          {[
            ["trading", "Trading & Analysis"],
            ["support", "Technical Support & Monitoring"],
            ["risk", "Risk & Regime Analysis"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="flex w-full rounded px-2 py-2 text-left text-sm text-qe-text hover:bg-qe-elevated"
              onClick={() => {
                setWorkspace(id as "trading" | "support" | "risk");
                setCommandOpen(false);
              }}
            >
              {label}
            </button>
          ))}
          <p className="mt-2 px-2 py-1 text-[10px] uppercase tracking-wide text-qe-muted">
            Instruments
          </p>
          {results.map((ins) => (
            <button
              key={ins.id}
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-qe-elevated"
              onClick={() => {
                selectSymbol(ins.symbol);
                setCommandOpen(false);
                setQ("");
              }}
            >
              <span>
                <span className="font-mono text-sm text-qe-text">{ins.symbol}</span>
                <span className="ml-2 text-xs text-qe-muted">{ins.name}</span>
              </span>
              <span className="text-[10px] uppercase text-qe-muted">
                {ins.assetClass} · {ins.exchange}
              </span>
            </button>
          ))}
        </div>
        <p className="border-t border-qe-border px-4 py-2 text-[10px] text-qe-muted">
          {providerNote}
        </p>
      </div>
    </div>
  );
}

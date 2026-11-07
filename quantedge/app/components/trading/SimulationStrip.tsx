"use client";

import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtPnL } from "../../lib/ledgerApi";

function Cell({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "mute";
  sub?: string;
}) {
  const colour =
    tone === "good"
      ? "text-edge-green"
      : tone === "warn"
      ? "text-edge-amber"
      : tone === "bad"
      ? "text-edge-salmon"
      : tone === "mute"
      ? "text-edge-dim"
      : "text-edge-pale";
  return (
    <div className="flex-1 min-w-[140px] px-3 py-2 border-r border-edge-crimson/25 last:border-r-0">
      <div className="text-edge-dim text-xxs uppercase tracking-widest">
        {label}
      </div>
      <div className={"tabular text-lg leading-tight " + colour}>{value}</div>
      {sub && <div className="text-edge-dim text-xxs mt-[2px]">{sub}</div>}
    </div>
  );
}

export function SimulationStrip() {
  const summary = useLedgerStore((s) => s.summary);
  const loading = useLedgerStore((s) => s.loading);
  const refresh = useLedgerStore((s) => s.refresh);

  if (!summary.connected) {
    return (
      <div className="panel flex items-stretch overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 border-r border-edge-crimson/40 bg-edge-crimson/10 min-w-[180px]">
          <span className="text-edge-salmon text-xxs uppercase tracking-widest">
            ● Ledger Offline
          </span>
        </div>
        <div className="flex-1 px-3 py-2 text-xs text-edge-dim flex items-center justify-between gap-3">
          <span>
            Simulation ledger not reachable. Close QUANTEDGE and re-run{" "}
            <span className="text-edge-pale">Launch-QuantEdge.bat</span> (or the
            Desktop shortcut) — it now starts the ledger on{" "}
            <span className="text-edge-pale">:8000</span> automatically. Keep
            the &quot;Kalici Ledger API :8000 - KEEP OPEN&quot; window open, then
            click Refresh.
            {summary.error && (
              <span className="text-edge-salmon"> · {summary.error}</span>
            )}
          </span>
          <button
            onClick={() => refresh()}
            className="border border-edge-crimson/50 text-edge-pale text-xxs px-3 py-[3px] hover:bg-edge-crimson/15 whitespace-nowrap"
          >
            {loading ? "…" : "REFRESH"}
          </button>
        </div>
      </div>
    );
  }

  const online = summary.executionLabel === "ONLINE";
  const rpnlTone =
    summary.realizedPnL > 0
      ? "good"
      : summary.realizedPnL < 0
      ? "bad"
      : "mute";
  const upnlTone =
    summary.unrealizedPnL > 0
      ? "good"
      : summary.unrealizedPnL < 0
      ? "bad"
      : "mute";

  return (
    <div className="panel flex items-stretch overflow-x-auto scrollbar">
      <div className="flex items-center gap-2 px-3 py-2 border-r border-edge-crimson/40 bg-edge-crimson/10 min-w-[160px]">
        <span
          className={
            "text-xxs uppercase tracking-widest " +
            (online ? "text-edge-green" : "text-edge-amber")
          }
        >
          ● Sim {summary.executionLabel}
        </span>
        <button
          onClick={() => refresh()}
          className="ml-auto border border-edge-crimson/40 text-edge-dim text-xxs px-2 py-[1px] hover:text-edge-pale"
          title="Refresh ledger"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>
      <Cell
        label="Orders Submitted"
        value={summary.ordersSubmitted.toLocaleString()}
        sub={`${summary.buys} buys · ${summary.sells} sells`}
      />
      <Cell
        label="Trades Completed"
        value={summary.tradesCompleted.toLocaleString()}
        tone="good"
        sub={
          summary.last2hFills
            ? `last 2h · ${summary.last2hFills}`
            : `${summary.ordersPending} queued`
        }
      />
      <Cell
        label="Queued Orders"
        value={summary.ordersPending.toLocaleString()}
        tone={summary.ordersPending ? "warn" : "mute"}
        sub="pending automations"
      />
      <Cell
        label="Realised PnL"
        value={fmtPnL(summary.realizedPnL)}
        tone={rpnlTone}
        sub="settled fills"
      />
      <Cell
        label="Unrealised PnL"
        value={fmtPnL(summary.unrealizedPnL)}
        tone={upnlTone}
        sub={`${summary.positions.length} open position${
          summary.positions.length === 1 ? "" : "s"
        }`}
      />
      <Cell
        label="Source"
        value=":8000"
        tone="mute"
        sub={
          summary.fetchedAt
            ? `updated ${new Date(summary.fetchedAt).toISOString().slice(11, 19)} UTC`
            : "—"
        }
      />
    </div>
  );
}

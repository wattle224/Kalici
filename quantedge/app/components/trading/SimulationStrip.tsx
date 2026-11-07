"use client";

import { useState } from "react";
import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtGBP, fmtPnL } from "../../lib/ledgerApi";

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
    <div className="flex-1 min-w-[120px] px-3 py-2 border-r border-edge-crimson/25 last:border-r-0">
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
  const fundDeposit = useLedgerStore((s) => s.fundDeposit);
  const [amount, setAmount] = useState("1000");

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
            <span className="text-edge-pale">Launch-QuantEdge.bat</span> — it
            starts the deposit-based model on{" "}
            <span className="text-edge-pale">:8000</span>. Keep the ledger
            window open, then click Refresh.
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
  const retTone =
    summary.returnPct > 0
      ? "good"
      : summary.returnPct < 0
      ? "bad"
      : "mute";
  const rpnlTone =
    summary.realizedPnL > 0
      ? "good"
      : summary.realizedPnL < 0
      ? "bad"
      : "mute";
  const last = summary.lastDecision;

  return (
    <div className="panel flex flex-col">
      <div className="flex items-stretch overflow-x-auto scrollbar border-b border-edge-crimson/25">
        <div className="flex items-center gap-2 px-3 py-2 border-r border-edge-crimson/40 bg-edge-crimson/10 min-w-[150px]">
          <span
            className={
              "text-xxs uppercase tracking-widest " +
              (online ? "text-edge-green" : "text-edge-amber")
            }
          >
            ● Model {summary.executionLabel}
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
          label="Deposit"
          value={fmtGBP(summary.deposit)}
          sub="funded capital"
        />
        <Cell
          label="Cash"
          value={fmtGBP(summary.cash)}
          sub="available to deploy"
        />
        <Cell
          label="Equity"
          value={fmtGBP(summary.equity)}
          sub={`mark ${summary.markPrice.toFixed(4)}`}
        />
        <Cell
          label="Return"
          value={`${summary.returnPct >= 0 ? "+" : ""}${summary.returnPct.toFixed(2)}%`}
          tone={retTone}
          sub="vs deposit"
        />
        <Cell
          label="Realised PnL"
          value={fmtPnL(summary.realizedPnL)}
          tone={rpnlTone}
          sub="closed trades"
        />
        <Cell
          label="Orders / Fills"
          value={`${summary.ordersSubmitted}`}
          tone="good"
          sub={`${summary.buys} buys · ${summary.sells} sells`}
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-2 text-xxs">
        <span className="text-edge-dim uppercase tracking-widest">Fund</span>
        <span className="text-edge-dim">£</span>
        <input
          type="number"
          min={10}
          step={50}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 bg-bg-1 border border-edge-crimson/50 px-2 py-[2px] text-edge-text tabular focus:outline-none focus:border-edge-pale"
        />
        <button
          onClick={() => {
            const n = Number(amount);
            if (Number.isFinite(n) && n >= 10) fundDeposit(n);
          }}
          className="border border-edge-crimson text-edge-pale px-3 py-[2px] hover:bg-edge-crimson/20 uppercase"
          title="Sets deposit, resets trades, starts the model from cash"
        >
          Set Deposit & Restart Model
        </button>
        <span className="text-edge-dim">
          Resets positions/trades and funds cash = deposit. Model then buys/sells
          only when it sees an opportunity.
        </span>
      </div>

      {last && (
        <div className="px-3 py-2 border-t border-edge-crimson/25 text-xxs flex gap-3 items-start">
          <span
            className={
              "uppercase tracking-widest shrink-0 " +
              (last.action === "BUY"
                ? "text-edge-green"
                : last.action === "SELL"
                ? "text-edge-salmon"
                : "text-edge-amber")
            }
          >
            Last {last.action}
          </span>
          <span className="text-edge-text leading-snug">{last.reason}</span>
          <span className="text-edge-dim ml-auto tabular shrink-0">
            score {last.score.toFixed(2)} ·{" "}
            {new Date(last.at).toISOString().slice(11, 19)} UTC
          </span>
        </div>
      )}
    </div>
  );
}

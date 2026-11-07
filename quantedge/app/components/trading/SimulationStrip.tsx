"use client";

import { useState } from "react";
import { useLedgerStore } from "../../store/useLedgerStore";
import { fmtGBP, fmtPnL, startLedger } from "../../lib/ledgerApi";

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
  const [fundHint, setFundHint] = useState<string | null>(null);

  const applyFund = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 10) {
      setFundHint("Minimum deposit is £10 — try 100, 500 or 1000.");
      return;
    }
    setFundHint(null);
    await fundDeposit(n);
  };

  if (!summary.connected) {
    return (
      <div className="panel flex items-stretch overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 border-r border-edge-crimson/40 bg-edge-crimson/10 min-w-[180px]">
          <span className="text-edge-salmon text-xxs uppercase tracking-widest">
            ● Ledger Offline
          </span>
        </div>
        <div className="flex-1 px-3 py-2 text-xs text-edge-dim flex items-center justify-between gap-3 flex-wrap">
          <span>
            Ledger on <span className="text-edge-pale">:8000</span> is not
            running. Click <span className="text-edge-pale">Start Ledger</span>{" "}
            below, or double-click{" "}
            <span className="text-edge-pale">Start-Ledger.bat</span> /{" "}
            <span className="text-edge-pale">Update-And-Launch-QuantEdge.bat</span>{" "}
            and keep that window open.
            {summary.error && (
              <span className="text-edge-salmon"> · {summary.error}</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setFundHint("Starting ledger window… (watch for a new black console)");
                const result = await startLedger();
                if (result.ok) {
                  setFundHint(
                    result.already
                      ? "Ledger already running on :8000"
                      : "Ledger started — refreshing…"
                  );
                  await refresh();
                  setFundHint(null);
                } else {
                  setFundHint(
                    result.error ??
                      "Auto-start failed. In the Kalici repo, double-click Start-Ledger.bat and keep that window open, then click REFRESH."
                  );
                }
              }}
              disabled={loading}
              className="border border-edge-crimson text-edge-pale text-xxs px-3 py-[3px] hover:bg-edge-crimson/15 whitespace-nowrap disabled:opacity-50"
            >
              START LEDGER
            </button>
            <button
              onClick={() => refresh()}
              className="border border-edge-crimson/50 text-edge-pale text-xxs px-3 py-[3px] hover:bg-edge-crimson/15 whitespace-nowrap"
            >
              {loading ? "…" : "REFRESH"}
            </button>
          </div>
          {fundHint && (
            <span className="text-edge-salmon w-full text-xxs">{fundHint}</span>
          )}
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

      <div className="flex items-center gap-3 px-3 py-2 text-xxs flex-wrap">
        <span className="text-edge-dim uppercase tracking-widest">Fund</span>
        <span className="text-edge-dim">£</span>
        <input
          type="number"
          min={10}
          step={10}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setFundHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void applyFund();
          }}
          className="w-24 bg-bg-1 border border-edge-crimson/50 px-2 py-[2px] text-edge-text tabular focus:outline-none focus:border-edge-pale"
        />
        {[100, 500, 1000, 5000].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(String(preset));
              setFundHint(null);
              void fundDeposit(preset);
            }}
            disabled={loading}
            className="border border-edge-crimson/40 text-edge-dim px-2 py-[2px] hover:text-edge-pale hover:border-edge-crimson disabled:opacity-50"
          >
            £{preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void applyFund()}
          disabled={loading}
          className="border border-edge-crimson text-edge-pale px-3 py-[2px] hover:bg-edge-crimson/20 uppercase disabled:opacity-50"
          title="Sets deposit, resets trades, starts the model from cash"
        >
          {loading ? "Funding…" : "Set Deposit & Restart Model"}
        </button>
        <span className="text-edge-dim">
          Min £10. Resets positions/trades and funds cash = deposit.
        </span>
        {(fundHint || summary.error) && (
          <span className="text-edge-salmon w-full">
            {fundHint || summary.error}
          </span>
        )}
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

      {summary.recentFills.length > 0 && (
        <div className="px-3 py-2 border-t border-edge-crimson/25 text-xxs overflow-x-auto scrollbar">
          <div className="text-edge-dim uppercase tracking-widest mb-1">
            Recent fills · bought / sold
          </div>
          <div className="flex gap-2 min-w-max">
            {summary.recentFills.slice(0, 8).map((f) => {
              const notional = f.quantity * f.executionPrice;
              return (
                <div
                  key={f.id}
                  className="border border-edge-crimson/30 px-2 py-1 flex items-center gap-2"
                >
                  <span
                    className={
                      "uppercase " +
                      (f.side === "buy"
                        ? "text-edge-green"
                        : "text-edge-salmon")
                    }
                  >
                    {f.side === "buy" ? "BUY" : "SELL"}
                  </span>
                  <span className="text-edge-pale">{f.symbol}</span>
                  <span className="text-edge-text tabular">
                    {f.quantity.toFixed(2)} @ {f.executionPrice.toFixed(4)}
                  </span>
                  <span className="text-edge-dim tabular">
                    {fmtGBP(notional)}
                  </span>
                  <span className="text-edge-dim tabular">
                    {new Date(f.executedAt).toISOString().slice(11, 19)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

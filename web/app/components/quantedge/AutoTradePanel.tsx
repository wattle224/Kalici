"use client";

import { useTerminal } from "@/lib/quantedge/TerminalContext";
import {
  CASH_RESERVE_FRAC,
  MAX_BUY_EQUITY_FRAC,
  MIN_TAKE_PROFIT_PCT,
} from "@/lib/quantedge/autoTrader";
import { Badge, Button, Field, Input, Panel } from "./ui";

function money(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AutoTradePanel() {
  const {
    autoTradeEnabled,
    setAutoTradeEnabled,
    paperStartingCash,
    setPaperStartingCash,
    paperLedger,
    lastAutoDecision,
    autoDecisionLog,
    runAutoDecisionNow,
    selected,
    operatingMode,
  } = useTerminal();

  const equity =
    paperLedger.cash +
    paperLedger.positions.reduce((s, p) => s + p.quantity * p.marketPrice, 0);

  return (
    <Panel
      title="Auto decision engine"
      right={
        <Badge tone={autoTradeEnabled ? "green" : "amber"}>
          {autoTradeEnabled ? "AUTO ON" : "AUTO OFF"}
        </Badge>
      }
    >
      <p className="mb-2 text-[11px] text-qe-muted">
        Buys/sells from QuantEdge findings (regime, momentum, RSI) sized to available paper
        funds. Sells only when unrealized ≥ +{MIN_TAKE_PROFIT_PCT}% so{" "}
        <span className="text-qe-text">realized</span> auto exits stay positive. Marks can still
        draw down while holding.{" "}
        {operatingMode === "production" ? "Paper fills · live prices." : "Fully simulated fills."}
      </p>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button
          variant={autoTradeEnabled ? "sell" : "buy"}
          onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
        >
          {autoTradeEnabled ? "Stop Auto" : "Start Auto"}
        </Button>
        <Button onClick={() => runAutoDecisionNow()}>Decide now</Button>
        <Field label="Starting cash ($)">
          <Input
            className="w-28"
            value={String(paperStartingCash)}
            disabled={autoTradeEnabled || paperLedger.positions.length > 0}
            onChange={(e) => setPaperStartingCash(Number(e.target.value) || paperStartingCash)}
          />
        </Field>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
        <div className="rounded border border-qe-border bg-qe-bg p-2">
          <div className="text-qe-muted">Cash</div>
          <div className="font-mono text-qe-text">${money(paperLedger.cash)}</div>
        </div>
        <div className="rounded border border-qe-border bg-qe-bg p-2">
          <div className="text-qe-muted">Equity</div>
          <div className="font-mono text-qe-text">${money(equity)}</div>
        </div>
        <div className="rounded border border-qe-border bg-qe-bg p-2">
          <div className="text-qe-muted">Realized PnL</div>
          <div
            className={`font-mono ${
              paperLedger.realizedPnl >= 0 ? "text-qe-green" : "text-qe-red"
            }`}
          >
            ${money(paperLedger.realizedPnl)}
          </div>
        </div>
        <div className="rounded border border-qe-border bg-qe-bg p-2">
          <div className="text-qe-muted">Open lots</div>
          <div className="font-mono text-qe-text">{paperLedger.positions.length}</div>
        </div>
      </div>

      <p className="mb-2 text-[10px] text-qe-muted">
        Size caps: ≤{(MAX_BUY_EQUITY_FRAC * 100).toFixed(0)}% equity per buy ·{" "}
        {(CASH_RESERVE_FRAC * 100).toFixed(0)}% cash reserve · symbol {selected.symbol}
      </p>

      {lastAutoDecision ? (
        <div className="mb-2 rounded border border-qe-border bg-qe-bg p-2 text-[11px]">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-qe-muted">Latest</span>
            <Badge
              tone={
                lastAutoDecision.action === "buy"
                  ? "green"
                  : lastAutoDecision.action === "sell"
                    ? "red"
                    : "amber"
              }
            >
              {lastAutoDecision.action.toUpperCase()}
            </Badge>
            <span className="font-mono text-qe-text">{lastAutoDecision.symbol}</span>
            <span className="text-qe-muted">
              {lastAutoDecision.analysis.regime.label} ·{" "}
              {(lastAutoDecision.analysis.regime.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <ul className="list-inside list-disc text-qe-muted">
            {lastAutoDecision.rationale.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-2 text-xs text-qe-muted">
          Start Auto or click Decide now — engine reads the chart findings for {selected.symbol}.
        </p>
      )}

      {autoDecisionLog.length > 0 ? (
        <div className="max-h-28 overflow-auto text-[10px] font-mono text-qe-muted">
          {autoDecisionLog.slice(0, 8).map((d, i) => (
            <div key={`${d.at}-${i}`} className="border-t border-qe-border py-0.5">
              <span className="text-qe-text">{d.action}</span> {d.symbol} ·{" "}
              {d.quantity > 0 ? d.quantity : "—"} · {new Date(d.at).toLocaleTimeString()}
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

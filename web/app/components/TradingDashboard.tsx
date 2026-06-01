"use client";

import { useCallback, useMemo, useState } from "react";
import {
  cleanBootstrap,
  formatPnL,
  formatPrice,
  loadSnapshot,
  saveSnapshot,
  settledFills,
  skippedWhilePaused,
  tradesForSymbol,
  type OpenPosition,
  type Trade,
  type TradingSnapshot,
} from "@/lib/trading";

const ALL_SYMBOLS = ["ETH-USD", "SKL-USD"] as const;

export default function TradingDashboard() {
  const [snapshot, setSnapshot] = useState<TradingSnapshot>(() => loadSnapshot());
  const [filter, setFilter] = useState<string>("all");

  const history = useMemo(() => settledFills(snapshot.trades), [snapshot.trades]);
  const skipped = useMemo(
    () => skippedWhilePaused(snapshot.trades),
    [snapshot.trades]
  );

  const filteredHistory = useMemo(() => {
    if (filter === "all") return history;
    return tradesForSymbol(snapshot.trades, filter);
  }, [filter, history, snapshot.trades]);

  const persist = useCallback((next: TradingSnapshot) => {
    setSnapshot(next);
    saveSnapshot(next);
  }, []);

  const cleanRestart = useCallback(() => {
    const next = cleanBootstrap();
    persist(next);
  }, [persist]);

  const symbolsInHistory = useMemo(() => {
    const set = new Set(history.map((t) => t.symbol));
    return Array.from(set).sort();
  }, [history]);

  return (
    <main>
      <h1>Trading</h1>
      <p className="subtitle">
        Symbol-agnostic trade history — fixes apply to{" "}
        <strong>ETH-USD</strong>, <strong>SKL-USD</strong>, and any{" "}
        <code>*-USD</code> pair.
      </p>

      <div className="toolbar">
        <button type="button" className="danger" onClick={cleanRestart}>
          Clean restart
        </button>
      </div>

      <div
        className={`banner ${snapshot.executionState === "paused" ? "paused" : "running"}`}
      >
        <span style={{ fontSize: "1.25rem" }}>
          {snapshot.executionState === "paused" ? "⏸" : "▶"}
        </span>
        <div>
          <strong>
            Execution{" "}
            {snapshot.executionState === "paused" ? "paused" : "running"}
          </strong>
          <p className="meta" style={{ margin: "0.25rem 0 0" }}>
            {snapshot.executionState === "paused"
              ? "Trade history shows confirmed fills only (price > 0). Zero-price rows are skipped intents."
              : "Automation may place orders and record per-fill execution prices."}
          </p>
        </div>
      </div>

      <section>
        <h2>Open positions</h2>
        {snapshot.openPositions.map((position) => (
          <PositionCard key={position.symbol} position={position} />
        ))}
        <p className="hint">
          Unrealized P&L is shown once per symbol — never duplicated on each
          trade row.
        </p>
      </section>

      <section>
        <h2>Trade history</h2>
        <div className="tabs">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({history.length})
          </button>
          {ALL_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              className={filter === sym ? "active" : ""}
              onClick={() => setFilter(sym)}
            >
              {sym} ({tradesForSymbol(snapshot.trades, sym).length})
            </button>
          ))}
        </div>

        {filteredHistory.length === 0 ? (
          <p className="meta">No confirmed fills for this filter.</p>
        ) : (
          filteredHistory.map((trade) => (
            <TradeCard key={trade.id} trade={trade} />
          ))
        )}

        <p className="hint">
          Confirmed symbols in history:{" "}
          {symbolsInHistory.length > 0
            ? symbolsInHistory.join(", ")
            : "none"}
          . Zero-price SKL/ETH rows are excluded.
        </p>
      </section>

      {skipped.length > 0 && (
        <section>
          <h2>Skipped while paused</h2>
          <p className="meta" style={{ marginBottom: "0.75rem" }}>
            Not shown in trade history — includes ETH-USD and SKL-USD sizing
            intents at price 0.
          </p>
          {skipped.map((trade) => (
            <SkippedCard key={trade.id} trade={trade} />
          ))}
        </section>
      )}
    </main>
  );
}

function PositionCard({ position }: { position: OpenPosition }) {
  return (
    <div className="card">
      <header>
        <span className="symbol">{position.symbol}</span>
        <span
          className={
            position.unrealizedPnL >= 0 ? "pnl-positive" : "pnl-negative"
          }
        >
          {formatPnL(position.unrealizedPnL)}
        </span>
      </header>
      <div className="row">
        <span className="meta">
          Qty {position.quantity.toLocaleString()} · avg{" "}
          {formatPrice(position.averageEntryPrice, position.symbol)}
        </span>
        <span className="meta">Unrealized ({position.quoteCurrency})</span>
      </div>
    </div>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  return (
    <div className="card">
      <header>
        <span>
          <span className="symbol">{trade.symbol}</span>{" "}
          <span className={`badge ${trade.side}`}>{trade.side}</span>
        </span>
        <span>{formatPrice(trade.executionPrice, trade.symbol)}</span>
      </header>
      <div className="row">
        <span className="meta">
          {trade.quantity.toLocaleString()} @ fill · {trade.orderReference}
        </span>
        {trade.realizedPnL != null && (
          <span
            className={
              trade.realizedPnL >= 0 ? "pnl-positive" : "pnl-negative"
            }
          >
            Realized {formatPnL(trade.realizedPnL)}
          </span>
        )}
      </div>
      <p className="meta" style={{ margin: "0.35rem 0 0" }}>
        {trade.source} · {new Date(trade.executedAt).toLocaleString("en-GB")}
      </p>
    </div>
  );
}

function SkippedCard({ trade }: { trade: Trade }) {
  return (
    <div className="card">
      <header>
        <span className="symbol">{trade.symbol}</span>
        <span className="badge skipped">Skipped</span>
      </header>
      <p className="meta">
        Size {trade.quantity.toLocaleString()} · price 0 (not executed) ·{" "}
        {trade.orderReference}
      </p>
    </div>
  );
}

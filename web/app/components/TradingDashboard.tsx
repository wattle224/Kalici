"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activitySummary,
  type PendingAutomation,
} from "@/lib/automation";
import {
  buildMarketTickers,
  filterPositionsByGainers,
  filterTradesByGainers,
  gainers,
} from "@/lib/market";
import TickerBanner from "./TickerBanner";
import TradingChart from "./TradingChart";
import { formatCountdown, msUntil, totalRealizedPnL } from "@/lib/realization";
import { hydrateSnapshot, loadSnapshot } from "@/lib/hydrate";
import {
  cleanBootstrap,
  formatPnL,
  formatPrice,
  saveSnapshot,
  settledFills,
  skippedWhilePaused,
  tradesForSymbol,
  type OpenPosition,
  type Trade,
  type TradingSnapshotWithAutomation,
} from "@/lib/trading";

const ALL_SYMBOLS = ["ETH-USD", "SKL-USD"] as const;

export default function TradingDashboard() {
  const [snapshot, setSnapshot] = useState<TradingSnapshotWithAutomation>(() =>
    loadSnapshot()
  );
  const [filter, setFilter] = useState<string>("2h");
  const [chartSymbol, setChartSymbol] = useState<string>("ETH-USD");
  const [now, setNow] = useState(() => Date.now());

  const history = useMemo(() => settledFills(snapshot.trades), [snapshot.trades]);
  const activity = useMemo(
    () => activitySummary(snapshot.trades, now),
    [snapshot.trades, now]
  );
  const skipped = useMemo(
    () => skippedWhilePaused(snapshot.trades),
    [snapshot.trades]
  );

  const tickers = useMemo(
    () => buildMarketTickers(snapshot.openPositions),
    [snapshot.openPositions]
  );
  const gainerList = useMemo(() => gainers(tickers), [tickers]);

  const filteredHistory = useMemo(() => {
    let rows: Trade[];
    if (filter === "2h") rows = activity.trades;
    else if (filter === "all") rows = history;
    else if (filter === "gainers")
      rows = filterTradesByGainers(history, tickers);
    else rows = tradesForSymbol(snapshot.trades, filter);
    return rows;
  }, [filter, history, activity.trades, snapshot.trades, tickers]);

  const visiblePositions = useMemo(() => {
    if (filter === "gainers") {
      return filterPositionsByGainers(snapshot.openPositions, tickers);
    }
    return snapshot.openPositions;
  }, [filter, snapshot.openPositions, tickers]);

  const persist = useCallback((next: TradingSnapshotWithAutomation) => {
    const hydrated = hydrateSnapshot(next);
    setSnapshot(hydrated);
    saveSnapshot(hydrated);
  }, []);

  const cleanRestart = useCallback(() => {
    persist(cleanBootstrap());
  }, [persist]);

  const toggleExecution = useCallback(() => {
    persist({
      ...snapshot,
      executionState:
        snapshot.executionState === "running" ? "paused" : "running",
    });
  }, [persist, snapshot]);

  useEffect(() => {
    const tick = () => {
      setSnapshot((current) => {
        const hydrated = hydrateSnapshot(current);
        if (JSON.stringify(hydrated) !== JSON.stringify(current)) {
          saveSnapshot(hydrated);
        }
        return hydrated;
      });
      setNow(Date.now());
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  const realizedTotal = useMemo(
    () => totalRealizedPnL(snapshot.trades),
    [snapshot.trades]
  );

  const pending = snapshot.pendingAutomations ?? [];

  return (
    <main>
      <h1>Trading</h1>
      <p className="subtitle">
        Recurring DCA + take-profit for <strong>ETH-USD</strong> and{" "}
        <strong>SKL-USD</strong> when execution is running.
      </p>

      <div className="toolbar">
        <button type="button" className="primary" onClick={toggleExecution}>
          {snapshot.executionState === "running" ? "Pause execution" : "Resume execution"}
        </button>
        <button type="button" className="danger" onClick={cleanRestart}>
          Clean restart
        </button>
      </div>

      <div
        className={`execution-banner ${snapshot.executionState === "paused" ? "paused" : "running"}`}
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
              ? "No new buys or sells — only 1 trade in 2h is expected while paused."
              : "DCA ~every 25 min and take-profit ~every 45 min per symbol."}
          </p>
        </div>
      </div>

      <section>
        <h2>Price chart</h2>
        <div className="tabs" style={{ marginBottom: "0.75rem" }}>
          {ALL_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              className={chartSymbol === sym ? "active" : ""}
              onClick={() => setChartSymbol(sym)}
            >
              {sym}
            </button>
          ))}
        </div>
        <TradingChart trades={history} symbol={chartSymbol} />
      </section>

      <section>
        <h2>Last 2 hours</h2>
        <div className="card">
          <header>
            <span className="symbol">Activity</span>
            <span>{activity.total} fills</span>
          </header>
          <div className="row">
            <span className="meta">{activity.buys} buys</span>
            <span className="meta">{activity.sells} sells</span>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            Expected when running: ~4–6 fills per 2h across ETH + SKL.
          </p>
        </div>
      </section>

      <section>
        <h2>Realized P&amp;L</h2>
        <div className="card">
          <header>
            <span className="symbol">Total realized</span>
            <span
              className={
                realizedTotal > 0 ? "pnl-positive" : "pnl-negative"
              }
            >
              {formatPnL(realizedTotal)}
            </span>
          </header>
          <p className="meta" style={{ margin: 0 }}>
            {realizedTotal > 0
              ? "Maintained via profitable sells (price above entry). Rebalances with buy → sell if needed."
              : "Scheduling buy/sell round-trip to restore positive realized P&L…"}
          </p>
        </div>
        {pending.length > 0 && snapshot.executionState === "running" && (
          <>
            <p className="hint">Scheduled automations:</p>
            {pending.map((item) => (
              <PendingAutomationCard key={item.id} item={item} now={now} />
            ))}
          </>
        )}
      </section>

      <section>
        <h2>Open positions</h2>
        {visiblePositions.length === 0 ? (
          <p className="meta">No gainer positions match this filter.</p>
        ) : (
          visiblePositions.map((position) => (
            <PositionCard key={position.symbol} position={position} />
          ))
        )}
      </section>

      <section>
        <h2>Trade history</h2>
        <div className="tabs">
          <button
            type="button"
            className={filter === "2h" ? "active" : ""}
            onClick={() => setFilter("2h")}
          >
            Last 2h ({activity.total})
          </button>
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({history.length})
          </button>
          <button
            type="button"
            className={filter === "gainers" ? "active" : ""}
            onClick={() => setFilter("gainers")}
          >
            Gainers ({gainerList.length})
          </button>
          {ALL_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              className={filter === sym ? "active" : ""}
              onClick={() => setFilter(sym)}
            >
              {sym}
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
      </section>

      {skipped.length > 0 && (
        <section>
          <h2>Skipped while paused</h2>
          {skipped.map((trade) => (
            <SkippedCard key={trade.id} trade={trade} />
          ))}
        </section>
      )}

      <TickerBanner
        positions={snapshot.openPositions}
        highlightGainersOnly={filter === "gainers"}
      />
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

function PendingAutomationCard({
  item,
  now,
}: {
  item: PendingAutomation;
  now: number;
}) {
  const remaining = msUntil(item.executeAt, now);
  return (
    <div className="card">
      <header>
        <span>
          <span className="symbol">{item.symbol}</span>{" "}
          <span className={`badge ${item.side}`}>{item.side}</span>
        </span>
        <span className="meta">{formatCountdown(remaining)}</span>
      </header>
      <p className="meta" style={{ margin: 0 }}>
        {item.source}: {item.quantity.toLocaleString()} @{" "}
        {formatPrice(item.price, item.symbol)}
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

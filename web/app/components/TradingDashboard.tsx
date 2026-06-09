"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activitySummary,
  kickstartExecution,
} from "@/lib/automation";
import { getExecutionStatus } from "@/lib/executionStatus";
import { formatCountdown, msUntil, totalRealizedPnL } from "@/lib/realization";
import { hydrateSnapshot, loadSnapshot } from "@/lib/hydrate";
import { ACTIVE_MARKET } from "@/lib/symbols";
import OrderHistoryTable from "./OrderHistoryTable";
import {
  cleanBootstrap,
  formatPnL,
  saveSnapshot,
  settledFills,
  type TradingSnapshotWithAutomation,
} from "@/lib/trading";

export default function TradingDashboard() {
  const [snapshot, setSnapshot] = useState<TradingSnapshotWithAutomation>(() =>
    loadSnapshot()
  );
  const [now, setNow] = useState(() => Date.now());

  const history = useMemo(() => settledFills(snapshot.trades), [snapshot.trades]);
  const activity = useMemo(
    () => activitySummary(snapshot.trades, now),
    [snapshot.trades, now]
  );

  const persist = useCallback((next: TradingSnapshotWithAutomation) => {
    const hydrated = hydrateSnapshot(next);
    setSnapshot(hydrated);
    saveSnapshot(hydrated);
  }, []);

  const cleanRestart = useCallback(() => {
    persist(cleanBootstrap());
  }, [persist]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cleanRestart") === "1") {
      cleanRestart();
      params.delete("cleanRestart");
      const next = params.toString();
      const path = next ? `?${next}` : window.location.pathname;
      window.history.replaceState({}, "", path);
    }
  }, [cleanRestart]);

  const toggleExecution = useCallback(() => {
    const goingOnline = snapshot.executionState === "paused";
    let next: TradingSnapshotWithAutomation = {
      ...snapshot,
      executionState: goingOnline ? "running" : "paused",
    };
    if (goingOnline) {
      next = kickstartExecution({ ...next, pendingAutomations: [] });
    }
    persist(next);
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
    const pollMs = snapshot.executionState === "running" ? 5_000 : 10_000;
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [snapshot.executionState]);

  const realizedTotal = useMemo(
    () => totalRealizedPnL(snapshot.trades),
    [snapshot.trades]
  );

  const pending = snapshot.pendingAutomations ?? [];
  const execStatus = useMemo(
    () =>
      getExecutionStatus(
        snapshot.executionState,
        snapshot.trades,
        pending,
        now
      ),
    [snapshot.executionState, snapshot.trades, pending, now]
  );

  return (
    <main>
      <p className="app-id">Kalici · {ACTIVE_MARKET} · local execution</p>
      <h1>Trading</h1>
      <p className="subtitle">
        Live <strong>{ACTIVE_MARKET}</strong> MARKET orders when execution is
        ONLINE. Source: <strong>local</strong>.
      </p>

      <div className="toolbar">
        <button type="button" className="primary" onClick={toggleExecution}>
          {snapshot.executionState === "running"
            ? "Pause execution"
            : "Resume execution"}
        </button>
        <button type="button" className="danger" onClick={cleanRestart}>
          Clean restart
        </button>
      </div>

      <div
        className={`execution-banner ${execStatus.isOnline ? "running" : "paused"}`}
      >
        <span style={{ fontSize: "1.25rem" }}>
          {execStatus.isOnline ? "●" : "○"}
        </span>
        <div>
          <strong className="execution-online-label">
            EXECUTION = {execStatus.label}
          </strong>
          <p className="meta" style={{ margin: "0.25rem 0 0" }}>
            {execStatus.isOnline
              ? activity.total < 2
                ? `No fills in the last 2h — placing live ${ACTIVE_MARKET} orders now.`
                : execStatus.executingNow
                  ? `Executing ${execStatus.dueNowCount} order(s) now…`
                  : `Queued: ${execStatus.pendingCount}. Next ${execStatus.nextOrderSide ?? "—"} ${execStatus.nextOrderSymbol ?? ""} ${
                      execStatus.nextOrderAt
                        ? formatCountdown(msUntil(execStatus.nextOrderAt, now))
                        : "soon"
                    }.`
              : "No new orders while OFFLINE."}
          </p>
        </div>
      </div>

      <section>
        <h2>Realised P&amp;L</h2>
        <div className="card realised-pnl-card">
          <span className="meta">Total realised</span>
          <span
            className={
              realizedTotal > 0
                ? "pnl-positive realised-value"
                : realizedTotal < 0
                  ? "pnl-negative realised-value"
                  : "realised-value"
            }
          >
            {realizedTotal >= 0 ? "" : "−"}
            £{Math.abs(realizedTotal).toFixed(4)}
          </span>
        </div>
      </section>

      <section>
        <h2>Order history</h2>
        <p className="hint">
          Last 2h: {activity.total} fills ({activity.buys} buys, {activity.sells}{" "}
          sells) · All: {history.length}
        </p>
        <OrderHistoryTable trades={history} />
      </section>

      {execStatus.isOnline && pending.length > 0 && (
        <section>
          <h2>Queued orders</h2>
          {pending.map((item) => (
            <div className="card" key={item.id}>
              <header>
                <span>
                  {item.symbol} {item.side.toUpperCase()}
                </span>
                <span className="meta">
                  {formatCountdown(msUntil(item.executeAt, now))}
                </span>
              </header>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

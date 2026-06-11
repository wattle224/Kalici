"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activitySummary,
  kickstartExecution,
} from "@/lib/automation";
import { getExecutionStatus } from "@/lib/executionStatus";
import {
  fetchLedger,
  LEDGER_LOAD_ERROR,
  postCleanRestart,
  saveLedgerSnapshot,
} from "@/lib/ledgerApi";
import { formatCountdown, msUntil, totalRealizedPnL } from "@/lib/realization";
import { hydrateSnapshot, loadSnapshot } from "@/lib/hydrate";
import { ACTIVE_MARKET } from "@/lib/symbols";
import OrderHistoryTable from "./OrderHistoryTable";
import {
  cleanBootstrap,
  clearTradingStorage,
  saveSnapshot,
  settledFills,
  type TradingSnapshotWithAutomation,
} from "@/lib/trading";

export default function TradingDashboard() {
  const [snapshot, setSnapshot] = useState<TradingSnapshotWithAutomation>(() =>
    loadSnapshot()
  );
  const [now, setNow] = useState(() => Date.now());
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(false);

  const history = useMemo(() => settledFills(snapshot.trades), [snapshot.trades]);
  const activity = useMemo(
    () => activitySummary(snapshot.trades, now),
    [snapshot.trades, now]
  );

  const applySnapshot = useCallback((next: TradingSnapshotWithAutomation) => {
    setSnapshot(next);
    saveSnapshot(next);
  }, []);

  const loadFromApi = useCallback(async (): Promise<boolean> => {
    try {
      const data = await fetchLedger();
      if (data.snapshot) {
        applySnapshot(data.snapshot);
        setLedgerError(null);
        setApiConnected(true);
        return true;
      }
      throw new Error("No snapshot in response");
    } catch (e) {
      const local = hydrateSnapshot(loadSnapshot());
      applySnapshot(local);
      setApiConnected(false);
      const msg = e instanceof Error ? e.message : "Failed to fetch";
      setLedgerError(
        `${LEDGER_LOAD_ERROR} ${msg} — showing local browser ledger instead.`
      );
      return false;
    }
  }, [applySnapshot]);

  const persist = useCallback(
    async (next: TradingSnapshotWithAutomation) => {
      const hydrated = hydrateSnapshot(next);
      applySnapshot(hydrated);
      try {
        await saveLedgerSnapshot(hydrated);
        setLedgerError(null);
        setApiConnected(true);
      } catch {
        setApiConnected(false);
        setLedgerError(null);
      }
    },
    [applySnapshot]
  );

  const cleanRestart = useCallback(async () => {
    clearTradingStorage();
    try {
      const data = await postCleanRestart();
      if (data.snapshot) {
        applySnapshot(data.snapshot);
        setLedgerError(null);
        setApiConnected(true);
        return;
      }
    } catch {
      /* fall through to local */
    }
    await persist(cleanBootstrap());
  }, [applySnapshot, persist]);

  useEffect(() => {
    void loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cleanRestart") === "1") {
      void cleanRestart();
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
    void persist(next);
  }, [persist, snapshot]);

  useEffect(() => {
    const tick = async () => {
      setNow(Date.now());
      if (apiConnected) {
        await loadFromApi();
        return;
      }
      setSnapshot((current) => {
        const hydrated = hydrateSnapshot(current);
        if (JSON.stringify(hydrated) !== JSON.stringify(current)) {
          saveSnapshot(hydrated);
        }
        return hydrated;
      });
    };
    void tick();
    const pollMs = snapshot.executionState === "running" ? 5_000 : 10_000;
    const id = window.setInterval(() => void tick(), pollMs);
    return () => window.clearInterval(id);
  }, [snapshot.executionState, apiConnected, loadFromApi]);

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
      <p className="app-id">
        Kalici · {ACTIVE_MARKET} · local execution
        {apiConnected ? " · ledger API connected" : " · local browser ledger"}
      </p>
      <h1>Trading</h1>
      <p className="subtitle">
        Live <strong>{ACTIVE_MARKET}</strong> MARKET orders when execution is
        ONLINE. Source: <strong>local</strong>.
      </p>

      {ledgerError && (
        <div className="ledger-error-banner" role="alert">
          <strong>Error:</strong> {ledgerError}
        </div>
      )}

      <div className="toolbar">
        <button type="button" className="primary" onClick={toggleExecution}>
          {snapshot.executionState === "running"
            ? "Pause execution"
            : "Resume execution"}
        </button>
        <button type="button" className="danger" onClick={() => void cleanRestart()}>
          Clean restart
        </button>
        <button type="button" onClick={() => void loadFromApi()}>
          Refresh ledger
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

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTerminal } from "@/lib/quantedge/TerminalContext";
import { Badge, Button, Panel, PnL } from "./ui";

interface Holding {
  asset: string;
  symbol: string;
  amount: number;
  price: number;
  value: number;
  currency: string;
  source: string;
}

interface PortfolioPayload {
  ok: boolean;
  connected: boolean;
  source: string;
  holdings: Holding[];
  totalValue: number;
  currency: string;
  summary?: {
    totalValue: number;
    cryptoValue: number;
    cashValue: number;
    displayCurrency: "GBP" | "USD";
    fxRate: number;
    totalValueDisplay: number;
    cryptoValueDisplay: number;
    cashValueDisplay: number;
    allTimePnLDisplay: number;
    allTimePnLPct: number | null;
  };
  pnl: {
    totalBuy: number;
    totalSell: number;
    netBuyMinusSell: number;
    allTimePnL?: number;
    allTimePnLPct?: number | null;
    realizedPnL: number | null;
    currency: string;
  };
  asOf: string;
  message: string;
  error?: string;
}

function money(n: number, max = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  });
}

function gbp(n: number) {
  return `£${money(n)}`;
}

export default function PortfolioPanel() {
  const { operatingMode, selectSymbol } = useTerminal();
  const [data, setData] = useState<PortfolioPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/coinbase/portfolio", { cache: "no-store" });
      const json = (await res.json()) as PortfolioPayload;
      setData(json);
      if (!json.ok) setErr(json.error || "Portfolio unavailable");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (operatingMode !== "production") return;
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [operatingMode, load]);

  if (operatingMode !== "production") {
    return (
      <Panel title="Portfolio" right={<Badge tone="amber">Simulated mode</Badge>}>
        <p className="text-xs text-qe-muted">
          Switch to <strong className="text-qe-green">Production</strong> to show your Coinbase-style
          home summary (total £, all-time P&amp;L, crypto vs cash) and buy/sell totals.
        </p>
      </Panel>
    );
  }

  const summary = data?.summary;
  const pnl = data?.pnl;
  const allPct = summary?.allTimePnLPct ?? pnl?.allTimePnLPct ?? null;

  return (
    <Panel
      title="Portfolio — Production"
      right={
        <div className="flex items-center gap-2">
          <Badge tone={data?.connected ? "green" : "amber"}>
            {data?.source === "coinbase-exchange"
              ? "Coinbase live"
              : data?.source === "ledger"
                ? "Ledger + live marks"
                : "Not connected"}
          </Badge>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      }
    >
      {err ? <p className="mb-2 text-xs text-qe-red">{err}</p> : null}
      {data?.message ? (
        <p className="mb-3 text-[11px] text-qe-muted">{data.message}</p>
      ) : null}

      {/* Coinbase home-style summary */}
      <div className="mb-3 rounded border border-qe-border bg-qe-bg p-3">
        <div className="text-[10px] uppercase tracking-wide text-qe-muted">Total balance</div>
        <div className="font-mono text-2xl font-semibold text-qe-text">
          {gbp(summary?.totalValueDisplay ?? 0)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={
              (summary?.allTimePnLDisplay ?? 0) >= 0 ? "text-qe-green" : "text-qe-red"
            }
          >
            {(summary?.allTimePnLDisplay ?? 0) >= 0 ? "▲" : "▼"}{" "}
            {gbp(Math.abs(summary?.allTimePnLDisplay ?? 0))}
            {allPct != null ? ` (${Math.abs(allPct).toFixed(2)}%)` : ""} All
          </span>
          <span className="text-qe-muted">
            vs net invested (buy − sell)
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-qe-border/80 px-2 py-1.5">
            <div className="text-[10px] uppercase text-qe-muted">Crypto</div>
            <div className="font-mono text-qe-text">{gbp(summary?.cryptoValueDisplay ?? 0)}</div>
          </div>
          <div className="rounded border border-qe-border/80 px-2 py-1.5">
            <div className="text-[10px] uppercase text-qe-muted">Cash &amp; stablecoins</div>
            <div className="font-mono text-qe-text">{gbp(summary?.cashValueDisplay ?? 0)}</div>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Total buy" value={`$${money(pnl?.totalBuy ?? 0)}`} tone="green" />
        <Stat label="Total sell" value={`$${money(pnl?.totalSell ?? 0)}`} tone="red" />
        <Stat
          label="Total (buy − sell)"
          value={<PnL value={pnl?.netBuyMinusSell ?? 0} />}
        />
        <Stat
          label="All-time P&L"
          value={
            <span>
              <PnL value={summary?.allTimePnLDisplay ?? pnl?.allTimePnL ?? 0} />
              {allPct != null ? (
                <span className="ml-1 text-[10px] text-qe-muted">({allPct.toFixed(2)}%)</span>
              ) : null}
            </span>
          }
        />
      </div>

      {!data?.holdings?.length ? (
        <p className="text-xs text-qe-muted">
          To mirror your Coinbase home (e.g. £493.64 / crypto £393 / cash £100), add Exchange API
          keys with <strong>View</strong> permission to{" "}
          <code className="text-qe-text">web/.env.local</code>:{" "}
          <code className="text-qe-text">COINBASE_API_KEY</code>,{" "}
          <code className="text-qe-text">COINBASE_API_SECRET</code>,{" "}
          <code className="text-qe-text">COINBASE_API_PASSPHRASE</code>, then restart the web UI and
          Refresh.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-qe-muted">
              <tr>
                <th className="py-1">Asset</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <tr key={h.symbol} className="border-t border-qe-border text-qe-text">
                  <td className="py-1.5">
                    <button
                      type="button"
                      className="font-mono font-semibold hover:text-qe-accent"
                      onClick={() => {
                        if (h.symbol.includes("-")) selectSymbol(h.symbol, { stay: true });
                      }}
                    >
                      {h.asset}
                    </button>
                    <div className="text-[10px] text-qe-muted">{h.symbol}</div>
                  </td>
                  <td className="font-mono">
                    {h.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </td>
                  <td className="font-mono">${money(h.price, h.price < 1 ? 6 : 2)}</td>
                  <td className="font-mono">
                    {gbp(h.value * (summary?.fxRate ?? 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-qe-muted" suppressHydrationWarning>
            As of {data.asOf ? new Date(data.asOf).toLocaleString("en-GB", { hour12: false }) : "—"}
            {summary?.fxRate ? ` · USD/GBP ${summary.fxRate.toFixed(4)}` : ""}
          </p>
        </div>
      )}
    </Panel>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "red";
}) {
  const color =
    tone === "green" ? "text-qe-green" : tone === "red" ? "text-qe-red" : "text-qe-text";
  return (
    <div className="rounded border border-qe-border bg-qe-bg p-2">
      <div className="text-[10px] uppercase text-qe-muted">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${color}`}>{value}</div>
    </div>
  );
}

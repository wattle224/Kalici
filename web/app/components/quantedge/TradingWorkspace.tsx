"use client";

import { useMemo, useState } from "react";
import { TIMEFRAME_CONFIG } from "@/lib/quantedge/chartTimeframes";
import { useTerminal } from "@/lib/quantedge/TerminalContext";
import CandleChart from "./CandleChart";
import PortfolioPanel from "./PortfolioPanel";
import { Badge, Button, Field, FreshnessBadge, Input, Panel, PnL, Select } from "./ui";
import type { OrderSide, OrderType, TimeInForce } from "@/lib/quantedge/types";
import { CHART_TIMEFRAMES } from "@/lib/quantedge/types";

export default function TradingWorkspace() {
  const {
    selected,
    selectSymbol,
    search,
    instruments,
    coinbaseProductsLoaded,
    coinbaseProductCount,
    productsLoadError,
    reloadCoinbaseProducts,
    quoteMap,
    candles,
    chartTimeframe,
    setChartTimeframe,
    chartStatus,
    chartError,
    book,
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    orders,
    placeSimulatedOrder,
    cancelOrder,
    providerNote,
    refreshMarket,
    operatingMode,
  } = useTerminal();

  const quote = quoteMap.get(selected.symbol);
  const wl = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];

  const cryptoInstruments = useMemo(
    () => instruments.filter((i) => i.assetClass === "crypto").sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [instruments]
  );

  const [localFilter, setLocalFilter] = useState("");

  const filteredInstruments = useMemo(() => {
    const q = (localFilter || search).trim().toLowerCase();
    // Always prefer full Coinbase catalog for the crypto watchlist / default view
    const showAllCrypto =
      activeWatchlistId === "wl-crypto" || coinbaseProductsLoaded;
    let pool: typeof instruments;
    if (showAllCrypto && activeWatchlistId === "wl-crypto") {
      pool = cryptoInstruments;
    } else if (activeWatchlistId === "wl-crypto") {
      pool = cryptoInstruments;
    } else {
      pool = instruments.filter((i) => wl.symbols.includes(i.symbol));
      if (!pool.length) pool = cryptoInstruments;
    }
    if (!q) return pool;
    return pool.filter(
      (i) =>
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.assetClass.includes(q) ||
        (i.isin?.toLowerCase().includes(q) ?? false)
    );
  }, [
    localFilter,
    search,
    instruments,
    cryptoInstruments,
    wl,
    activeWatchlistId,
    coinbaseProductsLoaded,
  ]);

  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [qty, setQty] = useState("10");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<TimeInForce>("day");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [preview, setPreview] = useState(false);

  const estPrice = Number(limitPrice) || quote?.last || 0;
  const estValue = (Number(qty) || 0) * estPrice;

  const submit = () => {
    placeSimulatedOrder({
      symbol: selected.symbol,
      side,
      type: orderType,
      quantity: Number(qty) || 0,
      limitPrice: orderType === "market" ? quote?.last : Number(limitPrice) || undefined,
      stopPrice: stopLoss ? Number(stopLoss) : undefined,
      tif,
      estimatedValue: estValue,
    });
    setPreview(false);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-2 p-2">
      {/* Full-width selector — hard to miss */}
      <section className="col-span-12 rounded border border-qe-accent/40 bg-qe-panel p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-qe-text">Security selector — Coinbase USD</h2>
          <Badge tone={coinbaseProductsLoaded ? "green" : productsLoadError ? "red" : "amber"}>
            {coinbaseProductsLoaded
              ? `${coinbaseProductCount || cryptoInstruments.length} products loaded`
              : productsLoadError
                ? "Catalog failed"
                : "Loading catalog…"}
          </Badge>
          <Button
            onClick={() => {
              void reloadCoinbaseProducts();
              setActiveWatchlistId("wl-crypto");
            }}
          >
            Reload catalog
          </Button>
          <span className="text-[11px] text-qe-muted">{providerNote}</span>
        </div>
        {productsLoadError ? (
          <p className="mb-2 text-xs text-qe-red">{productsLoadError}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="block text-[11px] text-qe-muted">
            Dropdown (all pairs)
            <select
              className="mt-1 w-full rounded border border-qe-border bg-qe-bg px-2 py-2 font-mono text-sm text-qe-text outline-none focus:border-qe-accent"
              value={
                cryptoInstruments.some((i) => i.symbol === selected.symbol)
                  ? selected.symbol
                  : ""
              }
              onChange={(e) => {
                if (e.target.value) selectSymbol(e.target.value);
              }}
            >
              <option value="" disabled>
                {coinbaseProductsLoaded
                  ? `Select from ${cryptoInstruments.length} Coinbase USD products…`
                  : "Loading Coinbase products…"}
              </option>
              {cryptoInstruments.map((ins) => (
                <option key={ins.id} value={ins.symbol}>
                  {ins.symbol} — {ins.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] text-qe-muted">
            Filter / search
            <input
              className="mt-1 w-full rounded border border-qe-border bg-qe-bg px-2 py-2 text-sm text-qe-text outline-none focus:border-qe-accent"
              value={localFilter}
              onChange={(e) => {
                setLocalFilter(e.target.value);
                setActiveWatchlistId("wl-crypto");
              }}
              placeholder="Type DOGE, AVAX, LINK, AAVE…"
            />
          </label>
          <div className="flex flex-col justify-end text-xs text-qe-text">
            <div>
              Selected: <span className="font-mono font-semibold">{selected.symbol}</span>
            </div>
            <div className="text-qe-muted">
              List below shows {filteredInstruments.length} of {cryptoInstruments.length}
            </div>
          </div>
        </div>
      </section>

      <aside className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-3">
        <Panel title="Instrument list" className="max-h-[70vh] lg:max-h-none lg:flex-1">
          <div className="mb-2 flex flex-wrap gap-1">
            {watchlists.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setActiveWatchlistId(w.id);
                  setLocalFilter("");
                }}
                className={`rounded px-2 py-0.5 text-[10px] ${
                  activeWatchlistId === w.id
                    ? "bg-qe-accent/20 text-qe-accent"
                    : "text-qe-muted hover:bg-qe-elevated"
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
          <p className="mb-1 text-[10px] text-qe-muted">
            Scroll the list or use the filter above. Full Coinbase USD catalog when loaded.
          </p>
          <ul className="max-h-[50vh] space-y-1 overflow-auto lg:max-h-none">
            {filteredInstruments.map((ins) => {
              const q = quoteMap.get(ins.symbol);
              return (
                <li key={ins.id}>
                  <button
                    type="button"
                    onClick={() => selectSymbol(ins.symbol)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-qe-elevated ${
                      selected.symbol === ins.symbol ? "bg-qe-elevated" : ""
                    }`}
                  >
                    <span>
                      <span className="font-mono font-semibold text-qe-text">{ins.symbol}</span>
                      <span className="mt-0.5 block text-[10px] text-qe-muted">{ins.name}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-qe-text">
                        {q?.last?.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? "—"}
                      </span>
                      {q ? <PnL pct={q.changePct} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </aside>

      <div className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-6">
        <Panel
          title={`${selected.symbol} · ${selected.name}`}
          right={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {quote ? <FreshnessBadge freshness={quote.freshness} /> : null}
              <span className="font-mono text-sm text-qe-text">
                {quote?.last?.toLocaleString(undefined, { maximumFractionDigits: 6 }) ?? "—"}
              </span>
              {quote ? <PnL pct={quote.changePct} /> : null}
              {quote?.bid != null && quote?.ask != null ? (
                <span className="font-mono text-[10px] text-qe-muted">
                  {quote.bid} / {quote.ask}
                </span>
              ) : null}
              <Button onClick={() => void refreshMarket()}>Refresh</Button>
            </div>
          }
        >
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-qe-muted">
              Timeframe
            </span>
            {CHART_TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setChartTimeframe(tf.id)}
                className={`rounded border px-2.5 py-1 font-mono text-xs ${
                  chartTimeframe === tf.id
                    ? "border-qe-accent bg-qe-accent/20 text-qe-accent"
                    : "border-qe-border text-qe-muted hover:bg-qe-elevated hover:text-qe-text"
                }`}
              >
                {tf.label}
              </button>
            ))}
            <span className="ml-2 text-[10px] text-qe-muted">
              {TIMEFRAME_CONFIG[chartTimeframe].note}
            </span>
          </div>
          <CandleChart
            candles={candles}
            symbol={selected.symbol}
            status={chartStatus}
            error={chartError}
          />
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-qe-muted md:grid-cols-4">
            <div>
              Asset: <span className="text-qe-text">{selected.assetClass}</span>
            </div>
            <div>
              Interval:{" "}
              <span className="text-qe-text">{chartTimeframe.toUpperCase()}</span>
            </div>
            <div>
              CCY: <span className="text-qe-text">{selected.currency}</span>
            </div>
            <div>
              Candles:{" "}
              <span className="text-qe-text">
                {candles.length} · {chartStatus}
              </span>
            </div>
          </div>
        </Panel>

        <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-2">
          <PortfolioPanel />
          <Panel title="Depth / book">
            {!book ? (
              <p className="text-xs text-qe-muted">
                Order book available for live Coinbase products only.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="mb-1 text-qe-green">Bids</div>
                  {book.bids.slice(0, 8).map((b) => (
                    <div key={b.price} className="flex justify-between font-mono">
                      <span>{b.size.toFixed(2)}</span>
                      <span className="text-qe-green">{b.price}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 text-qe-red">Asks</div>
                  {book.asks.slice(0, 8).map((a) => (
                    <div key={a.price} className="flex justify-between font-mono">
                      <span className="text-qe-red">{a.price}</span>
                      <span>{a.size.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="col-span-2 text-qe-muted">
                  Mid {book.mid?.toFixed(4) ?? "—"} · Spread {book.spread?.toFixed(4) ?? "—"} ·{" "}
                  <FreshnessBadge freshness={book.freshness} />
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <aside className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-3">
        <Panel
          title="Order ticket"
          right={
            <Badge tone={operatingMode === "production" ? "green" : "amber"}>
              {operatingMode === "production" ? "Paper · live prices" : "Simulated"}
            </Badge>
          }
        >
          <div className="mb-2 flex gap-1">
            <Button
              variant={side === "buy" ? "buy" : "ghost"}
              className="flex-1"
              onClick={() => setSide("buy")}
            >
              Buy
            </Button>
            <Button
              variant={side === "sell" ? "sell" : "ghost"}
              className="flex-1"
              onClick={() => setSide("sell")}
            >
              Sell
            </Button>
          </div>
          <div className="space-y-2">
            <Field label="Type">
              <Select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
                <option value="stop">Stop</option>
                <option value="stop_limit">Stop-limit</option>
              </Select>
            </Field>
            <Field label="Quantity">
              <Input value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            {orderType !== "market" ? (
              <Field label="Limit price">
                <Input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
              </Field>
            ) : null}
            <Field label="Time in force">
              <Select value={tif} onChange={(e) => setTif(e.target.value as TimeInForce)}>
                <option value="day">Day</option>
                <option value="gtc">GTC</option>
                <option value="ioc">IOC</option>
                <option value="fok">FOK</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Stop-loss">
                <Input
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Take-profit">
                <Input
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <div className="rounded border border-qe-border bg-qe-bg p-2 text-[11px] text-qe-muted">
              Est. value:{" "}
              <span className="font-mono text-qe-text">${estValue.toFixed(2)}</span>
              <div>
                Pre-trade check:{" "}
                {operatingMode === "production" ? "PASS (paper OMS, live marks)" : "simulated PASS"}
              </div>
              <div className="text-qe-amber">
                {operatingMode === "production"
                  ? "Production market data is live. Brokerage submission remains disabled (paper fills only)."
                  : "Simulated session — sample + Coinbase when available. No live brokerage."}
              </div>
            </div>
            {!preview ? (
              <Button variant="primary" className="w-full" onClick={() => setPreview(true)}>
                Preview order
              </Button>
            ) : (
              <div className="space-y-2 rounded border border-qe-amber/40 bg-qe-amber/10 p-2">
                <p className="text-xs text-qe-text">
                  Confirm {side.toUpperCase()} {qty} {selected.symbol} ({orderType}) —{" "}
                  {operatingMode === "production" ? "PAPER (live marks)" : "SIMULATED only"}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={side === "buy" ? "buy" : "sell"}
                    className="flex-1"
                    onClick={submit}
                  >
                    Confirm
                  </Button>
                  <Button className="flex-1" onClick={() => setPreview(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Orders & fills" className="min-h-[180px] flex-1">
          {orders.length === 0 ? (
            <p className="text-xs text-qe-muted">No simulated orders yet.</p>
          ) : (
            <table className="w-full text-left text-[11px]">
              <thead className="text-qe-muted">
                <tr>
                  <th className="py-1">ID</th>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 12).map((o) => (
                  <tr key={o.id} className="border-t border-qe-border font-mono text-qe-text">
                    <td className="py-1">{o.id.slice(-6)}</td>
                    <td className={o.side === "buy" ? "text-qe-green" : "text-qe-red"}>{o.side}</td>
                    <td>{o.quantity}</td>
                    <td>{o.status}</td>
                    <td>
                      {o.status === "open" ? (
                        <button
                          type="button"
                          className="text-qe-amber"
                          onClick={() => cancelOrder(o.id)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </aside>
    </div>
  );
}

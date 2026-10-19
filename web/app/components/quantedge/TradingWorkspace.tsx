"use client";

import { useMemo, useState } from "react";
import { useTerminal } from "@/lib/quantedge/TerminalContext";
import CandleChart from "./CandleChart";
import { Badge, Button, Field, FreshnessBadge, Input, Panel, PnL, Select } from "./ui";
import type { OrderSide, OrderType, TimeInForce } from "@/lib/quantedge/types";

export default function TradingWorkspace() {
  const {
    selected,
    selectSymbol,
    search,
    instruments,
    coinbaseProductsLoaded,
    quoteMap,
    candles,
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
  } = useTerminal();

  const quote = quoteMap.get(selected.symbol);
  const wl = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];

  const cryptoInstruments = useMemo(
    () => instruments.filter((i) => i.assetClass === "crypto"),
    [instruments]
  );

  const filteredInstruments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool =
      activeWatchlistId === "wl-crypto"
        ? cryptoInstruments
        : instruments.filter((i) => wl.symbols.includes(i.symbol) || i.assetClass !== "crypto");
    if (!q) return pool.slice(0, 120);
    return instruments
      .filter(
        (i) =>
          i.symbol.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.assetClass.includes(q) ||
          (i.isin?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 120);
  }, [search, instruments, cryptoInstruments, wl, activeWatchlistId]);

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
      <aside className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-2">
        <Panel title="Security selector" className="max-h-[70vh] lg:max-h-none lg:flex-1">
          <p className="mb-2 text-[10px] text-qe-muted">{providerNote}</p>

          <Field label={`Coinbase USD products${coinbaseProductsLoaded ? ` (${cryptoInstruments.length})` : " (loading…)"}`}>
            <Select
              value={selected.assetClass === "crypto" ? selected.symbol : ""}
              onChange={(e) => {
                if (e.target.value) selectSymbol(e.target.value);
              }}
            >
              <option value="" disabled>
                Select Coinbase crypto…
              </option>
              {cryptoInstruments.map((ins) => (
                <option key={ins.id} value={ins.symbol}>
                  {ins.symbol} — {ins.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="mb-2 mt-2 flex flex-wrap gap-1">
            {watchlists.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWatchlistId(w.id)}
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
          <ul className="max-h-[42vh] space-y-1 overflow-auto">
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

      <div className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-7">
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
              Exchange: <span className="text-qe-text">{selected.exchange}</span>
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

        <div className="grid min-h-0 grid-cols-1 gap-2 md:grid-cols-2">
          <Panel title="Market analysis">
            <ul className="space-y-2 text-xs text-qe-text">
              <li>
                Trend:{" "}
                {quote && quote.changePct >= 0
                  ? "Constructive (window return from live candles)"
                  : "Soft (window return from live candles)"}
              </li>
              <li>
                Depth: {book ? `live mid ${book.mid?.toFixed(4) ?? "—"}` : "unavailable for this product"}
              </li>
              <li className="rounded border border-qe-border bg-qe-bg p-2 text-qe-muted">
                <strong className="text-qe-amber">AI note:</strong> Use Risk workspace Analyze for
                local QuantEdge tool (+ optional Gemini). Predictions are never certainties.
              </li>
            </ul>
          </Panel>
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
        <Panel title="Order ticket" right={<Badge tone="amber">Simulated</Badge>}>
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
              <div>Pre-trade check: simulated PASS (prototype).</div>
              <div className="text-qe-amber">Live brokerage submission is disabled.</div>
            </div>
            {!preview ? (
              <Button variant="primary" className="w-full" onClick={() => setPreview(true)}>
                Preview order
              </Button>
            ) : (
              <div className="space-y-2 rounded border border-qe-amber/40 bg-qe-amber/10 p-2">
                <p className="text-xs text-qe-text">
                  Confirm {side.toUpperCase()} {qty} {selected.symbol} ({orderType}) — SIMULATED only
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

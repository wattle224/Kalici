"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildSimulatedQuotes,
  buildWinnersLosers,
  DEFAULT_WATCHLISTS,
  INSTRUMENTS as SAMPLE_INSTRUMENTS,
} from "./sampleData";
import { prepareCandlesForTimeframe, TIMEFRAME_CONFIG } from "./chartTimeframes";
import { coinbaseLedgerProvider, DEFAULT_SYMBOL } from "./providers";
import type {
  Candle,
  ChartTimeframe,
  Instrument,
  OperatingMode,
  OrderBook,
  Quote,
  SimulatedOrder,
  TickerItem,
  Watchlist,
  WorkspaceId,
} from "./types";

const MODE_STORAGE_KEY = "quantedge.operatingMode";

interface TerminalState {
  workspace: WorkspaceId;
  setWorkspace: (w: WorkspaceId) => void;
  operatingMode: OperatingMode;
  setOperatingMode: (mode: OperatingMode) => void;
  selected: Instrument;
  selectSymbol: (symbol: string, opts?: { stay?: boolean }) => void;
  instruments: Instrument[];
  coinbaseProductsLoaded: boolean;
  coinbaseProductCount: number;
  productsLoadError: string | null;
  reloadCoinbaseProducts: () => Promise<void>;
  search: string;
  setSearch: (s: string) => void;
  quotes: Quote[];
  quoteMap: Map<string, Quote>;
  candles: Candle[];
  chartTimeframe: ChartTimeframe;
  setChartTimeframe: (tf: ChartTimeframe) => void;
  chartStatus: "idle" | "loading" | "ready" | "empty" | "error";
  chartError: string | null;
  book: OrderBook | null;
  watchlists: Watchlist[];
  activeWatchlistId: string;
  setActiveWatchlistId: (id: string) => void;
  winners: TickerItem[];
  losers: TickerItem[];
  feedStatus: "connected" | "degraded" | "disconnected";
  sessionLabel: string;
  dataAsOf: string | null;
  tickerFreshness: "live" | "mixed" | "simulated" | "delayed";
  orders: SimulatedOrder[];
  placeSimulatedOrder: (
    order: Omit<SimulatedOrder, "id" | "createdAt" | "updatedAt" | "status" | "mode">
  ) => void;
  cancelOrder: (id: string) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  providerNote: string;
  refreshMarket: () => Promise<void>;
}

const Ctx = createContext<TerminalState | null>(null);

export function useTerminal(): TerminalState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerminal must be used within TerminalProvider");
  return ctx;
}

function mergeInstruments(base: Instrument[], coinbase: Instrument[]): Instrument[] {
  const map = new Map<string, Instrument>();
  for (const i of base) map.set(i.symbol.toUpperCase(), i);
  for (const i of coinbase) map.set(i.symbol.toUpperCase(), i);
  return [...map.values()].sort((a, b) => {
    if (a.assetClass === "crypto" && b.assetClass !== "crypto") return -1;
    if (a.assetClass !== "crypto" && b.assetClass === "crypto") return 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

export function TerminalProvider({
  children,
  initialProducts = [],
}: {
  children: ReactNode;
  initialProducts?: Instrument[];
}) {
  const [workspace, setWorkspace] = useState<WorkspaceId>("trading");
  const [operatingMode, setOperatingModeState] = useState<OperatingMode>("production");
  const [instruments, setInstruments] = useState<Instrument[]>(() =>
    initialProducts.length
      ? mergeInstruments(SAMPLE_INSTRUMENTS, initialProducts)
      : SAMPLE_INSTRUMENTS
  );
  const [coinbaseProductsLoaded, setCoinbaseProductsLoaded] = useState(
    () => initialProducts.length > 0
  );
  const [coinbaseProductCount, setCoinbaseProductCount] = useState(
    () => initialProducts.length
  );
  const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Instrument>(() => {
    const merged = initialProducts.length
      ? mergeInstruments(SAMPLE_INSTRUMENTS, initialProducts)
      : SAMPLE_INSTRUMENTS;
    return merged.find((i) => i.symbol === DEFAULT_SYMBOL) ?? merged[0];
  });
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>("1h");
  const [chartStatus, setChartStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">(
    "idle"
  );
  const [chartError, setChartError] = useState<string | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [watchlists, setWatchlists] = useState(() => {
    if (!initialProducts.length) return DEFAULT_WATCHLISTS;
    const cryptoIds = initialProducts.map((p) => p.symbol);
    return DEFAULT_WATCHLISTS.map((w) =>
      w.id === "wl-crypto"
        ? { ...w, name: `All Coinbase USD (${initialProducts.length})`, symbols: cryptoIds }
        : w
    );
  });
  const [activeWatchlistId, setActiveWatchlistId] = useState(DEFAULT_WATCHLISTS[0].id);
  const [feedStatus, setFeedStatus] = useState<"connected" | "degraded" | "disconnected">(
    "disconnected"
  );
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === "simulated" || saved === "production") {
        setOperatingModeState(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const findInstrument = useCallback(
    (symbol: string): Instrument => {
      const up = symbol.toUpperCase();
      const hit = instruments.find((i) => i.symbol.toUpperCase() === up);
      if (hit) return hit;
      if (up.includes("-")) {
        return {
          id: `dyn-${up.toLowerCase()}`,
          symbol: up,
          name: up.replace("-", " / "),
          exchange: "Coinbase",
          assetClass: "crypto",
          currency: up.split("-")[1] || "USD",
          providerId: up,
        };
      }
      return instruments[0] ?? SAMPLE_INSTRUMENTS[0];
    },
    [instruments]
  );

  const selectSymbol = useCallback(
    (symbol: string, opts?: { stay?: boolean }) => {
      setSelected(findInstrument(symbol));
      if (!opts?.stay) setWorkspace("trading");
    },
    [findInstrument]
  );

  const setOperatingMode = useCallback(
    (mode: OperatingMode) => {
      setOperatingModeState(mode);
      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
      if (mode === "production") {
        setActiveWatchlistId("wl-crypto");
        setSelected((prev) => {
          if (prev.assetClass === "crypto" || prev.symbol.includes("-")) return prev;
          return findInstrument(DEFAULT_SYMBOL);
        });
      }
    },
    [findInstrument]
  );

  const reloadCoinbaseProducts = useCallback(async () => {
    setProductsLoadError(null);
    try {
      const products = await coinbaseLedgerProvider.fetchProducts();
      if (!products.length) {
        setProductsLoadError("Coinbase product catalog returned 0 USD pairs.");
        setCoinbaseProductsLoaded(false);
        setCoinbaseProductCount(0);
        return;
      }
      setInstruments((prev) => mergeInstruments(prev, products));
      setCoinbaseProductsLoaded(true);
      setCoinbaseProductCount(products.length);
      const cryptoIds = products.map((p) => p.symbol);
      setWatchlists((prev) =>
        prev.map((w) =>
          w.id === "wl-crypto"
            ? {
                ...w,
                name: `All Coinbase USD (${products.length})`,
                symbols: cryptoIds,
              }
            : w
        )
      );
    } catch (err) {
      setCoinbaseProductsLoaded(false);
      setCoinbaseProductCount(0);
      setProductsLoadError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void reloadCoinbaseProducts();
  }, [reloadCoinbaseProducts]);

  const refreshMarket = useCallback(async () => {
    const cryptoSyms = instruments
      .filter((i) => i.assetClass === "crypto")
      .map((i) => i.symbol);
    const quoteSyms = Array.from(
      new Set([
        selected.symbol,
        ...cryptoSyms.slice(0, 24),
        ...(operatingMode === "simulated"
          ? DEFAULT_WATCHLISTS.flatMap((w) => w.symbols)
          : []),
      ])
    ).filter((s) => s.includes("-") || operatingMode === "simulated");

    const prodQuoteSyms = quoteSyms.filter((s) => s.includes("-"));

    try {
      const live = await coinbaseLedgerProvider.fetchQuotes(
        operatingMode === "production" ? prodQuoteSyms : quoteSyms.filter((s) => s.includes("-"))
      );

      let combined: Quote[];
      if (operatingMode === "production") {
        // Production: live Coinbase quotes only — never mix simulated equities into the tape
        combined = live;
        setFeedStatus(live.length ? "connected" : "disconnected");
      } else {
        const merged = buildSimulatedQuotes(live);
        const byLive = new Map(live.map((q) => [q.symbol, q]));
        combined = merged.map((q) => byLive.get(q.symbol) ?? q);
        for (const q of live) {
          if (!combined.find((c) => c.symbol === q.symbol)) combined.push(q);
        }
        setFeedStatus(live.length ? "connected" : "degraded");
      }
      setQuotes(combined);
      setDataAsOf(new Date().toISOString());

      const isCrypto =
        selected.assetClass === "crypto" || selected.symbol.includes("-");
      if (isCrypto) {
        setChartStatus("loading");
        setChartError(null);
        const tfCfg = TIMEFRAME_CONFIG[chartTimeframe];
        try {
          const [rawCandles, b] = await Promise.all([
            coinbaseLedgerProvider.fetchCandles(
              selected.symbol,
              tfCfg.apiGranularitySec,
              tfCfg.limit
            ),
            coinbaseLedgerProvider.fetchOrderBook(selected.symbol),
          ]);
          const c = prepareCandlesForTimeframe(rawCandles, chartTimeframe);
          if (c.length >= 2) {
            const first = c[0].open;
            const last = c[c.length - 1].close;
            const change = last - first;
            const changePct = first ? (change / first) * 100 : 0;
            setQuotes((prev) => {
              const next = prev.map((q) =>
                q.symbol === selected.symbol
                  ? {
                      ...q,
                      last,
                      change: Number(change.toFixed(6)),
                      changePct: Number(changePct.toFixed(2)),
                      freshness: "live" as const,
                    }
                  : q
              );
              if (!next.find((q) => q.symbol === selected.symbol)) {
                next.push({
                  symbol: selected.symbol,
                  last,
                  change: Number(change.toFixed(6)),
                  changePct: Number(changePct.toFixed(2)),
                  timestamp: new Date().toISOString(),
                  freshness: "live",
                });
              }
              return next;
            });
            setCandles(c);
            setChartStatus("ready");
          } else {
            setCandles([]);
            setChartStatus("empty");
            setChartError(
              operatingMode === "production"
                ? "Production feed: Coinbase returned no candles for this product."
                : "Coinbase returned no candles for this product."
            );
          }
          setBook(b);
        } catch (err) {
          setCandles([]);
          setBook(null);
          setChartStatus("error");
          setChartError(err instanceof Error ? err.message : String(err));
        }
      } else if (operatingMode === "production") {
        setCandles([]);
        setBook(null);
        setChartStatus("empty");
        setChartError("Production mode supports live Coinbase crypto only. Switch security or use Simulated.");
      } else {
        setCandles([]);
        setBook(null);
        setChartStatus("empty");
        setChartError(null);
      }
    } catch {
      setFeedStatus("disconnected");
      if (operatingMode === "simulated") {
        setQuotes(buildSimulatedQuotes([]));
      } else {
        setQuotes([]);
      }
      setChartStatus("error");
      setChartError(
        operatingMode === "production"
          ? "Production feed unavailable (Coinbase unreachable). Check network or switch to Simulated."
          : "Market refresh failed"
      );
    }
  }, [selected, instruments, chartTimeframe, operatingMode]);

  useEffect(() => {
    void refreshMarket();
    const refreshMs = TIMEFRAME_CONFIG[chartTimeframe].refreshMs;
    const id = window.setInterval(() => void refreshMarket(), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMarket, chartTimeframe]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const quoteMap = useMemo(() => new Map(quotes.map((q) => [q.symbol, q])), [quotes]);
  const { winners, losers } = useMemo(() => buildWinnersLosers(quotes), [quotes]);

  const tickerFreshness = useMemo(() => {
    if (operatingMode === "production") {
      if (feedStatus === "disconnected" || !quotes.length) return "delayed" as const;
      const live = quotes.filter((q) => q.freshness === "live").length;
      if (live === 0) return "delayed" as const;
      if (live === quotes.length) return "live" as const;
      return "mixed" as const;
    }
    if (!quotes.length) return "simulated" as const;
    const live = quotes.filter((q) => q.freshness === "live").length;
    if (live === quotes.length) return "live" as const;
    if (live === 0) return "simulated" as const;
    return "mixed" as const;
  }, [quotes, operatingMode, feedStatus]);

  const placeSimulatedOrder = useCallback(
    (order: Omit<SimulatedOrder, "id" | "createdAt" | "updatedAt" | "status" | "mode">) => {
      const now = new Date().toISOString();
      const prefix = operatingMode === "production" ? "PAPER" : "SIM";
      const id = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
      const filled: SimulatedOrder = {
        ...order,
        id,
        status: order.type === "market" ? "filled" : "open",
        createdAt: now,
        updatedAt: now,
        mode: operatingMode === "production" ? "paper" : "simulated",
        fillPrice:
          order.type === "market"
            ? order.limitPrice ?? quoteMap.get(order.symbol)?.last
            : undefined,
      };
      setOrders((prev) => [filled, ...prev]);
    },
    [quoteMap, operatingMode]
  );

  const cancelOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id && o.status === "open"
          ? { ...o, status: "cancelled", updatedAt: new Date().toISOString() }
          : o
      )
    );
  }, []);

  const sessionLabel =
    operatingMode === "production"
      ? feedStatus === "connected"
        ? "PRODUCTION · LIVE MARKET DATA"
        : "PRODUCTION · FEED DOWN"
      : "SIMULATED · PAPER SESSION";

  const providerNote =
    operatingMode === "production"
      ? "Production mode: live Coinbase USD market data (candles, depth, quotes). Order ticket remains PAPER — no live brokerage submission."
      : "Simulated mode: sample multi-asset quotes + Coinbase when reachable. Orders are fully simulated.";

  const value: TerminalState = {
    workspace,
    setWorkspace,
    operatingMode,
    setOperatingMode,
    selected,
    selectSymbol,
    instruments,
    coinbaseProductsLoaded,
    coinbaseProductCount,
    productsLoadError,
    reloadCoinbaseProducts,
    search,
    setSearch,
    quotes,
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
    winners,
    losers,
    feedStatus,
    sessionLabel,
    dataAsOf,
    tickerFreshness,
    orders,
    placeSimulatedOrder,
    cancelOrder,
    commandOpen,
    setCommandOpen,
    providerNote,
    refreshMarket,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

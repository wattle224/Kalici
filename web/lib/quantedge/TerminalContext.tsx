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
import { coinbaseLedgerProvider, DEFAULT_SYMBOL } from "./providers";
import type {
  Candle,
  Instrument,
  OrderBook,
  Quote,
  SimulatedOrder,
  TickerItem,
  Watchlist,
  WorkspaceId,
} from "./types";

interface TerminalState {
  workspace: WorkspaceId;
  setWorkspace: (w: WorkspaceId) => void;
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
  tickerFreshness: "live" | "mixed" | "simulated";
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

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceId>("trading");
  const [instruments, setInstruments] = useState<Instrument[]>(SAMPLE_INSTRUMENTS);
  const [coinbaseProductsLoaded, setCoinbaseProductsLoaded] = useState(false);
  const [coinbaseProductCount, setCoinbaseProductCount] = useState(0);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Instrument>(
    () => SAMPLE_INSTRUMENTS.find((i) => i.symbol === DEFAULT_SYMBOL) ?? SAMPLE_INSTRUMENTS[0]
  );
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartStatus, setChartStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">(
    "idle"
  );
  const [chartError, setChartError] = useState<string | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [watchlists, setWatchlists] = useState(DEFAULT_WATCHLISTS);
  const [activeWatchlistId, setActiveWatchlistId] = useState(DEFAULT_WATCHLISTS[0].id);
  const [feedStatus, setFeedStatus] = useState<"connected" | "degraded" | "disconnected">(
    "disconnected"
  );
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);

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
      new Set([selected.symbol, ...cryptoSyms.slice(0, 24), ...DEFAULT_WATCHLISTS.flatMap((w) => w.symbols)])
    ).filter((s) => s.includes("-"));

    try {
      const live = await coinbaseLedgerProvider.fetchQuotes(quoteSyms);
      const merged = buildSimulatedQuotes(live);
      // Prefer live for any crypto we have
      const byLive = new Map(live.map((q) => [q.symbol, q]));
      const combined = merged.map((q) => byLive.get(q.symbol) ?? q);
      for (const q of live) {
        if (!combined.find((c) => c.symbol === q.symbol)) combined.push(q);
      }
      setQuotes(combined);
      setFeedStatus(live.length ? "connected" : "degraded");
      setDataAsOf(new Date().toISOString());

      const isCrypto =
        selected.assetClass === "crypto" || selected.symbol.includes("-");
      if (isCrypto) {
        setChartStatus("loading");
        setChartError(null);
        try {
          const [c, b] = await Promise.all([
            coinbaseLedgerProvider.fetchCandles(selected.symbol),
            coinbaseLedgerProvider.fetchOrderBook(selected.symbol),
          ]);
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
            setChartError("Coinbase returned no candles for this product.");
          }
          setBook(b);
        } catch (err) {
          setCandles([]);
          setBook(null);
          setChartStatus("error");
          setChartError(err instanceof Error ? err.message : String(err));
        }
      } else {
        setCandles([]);
        setBook(null);
        setChartStatus("empty");
        setChartError(null);
      }
    } catch {
      setFeedStatus("disconnected");
      setQuotes(buildSimulatedQuotes([]));
      setChartStatus("error");
      setChartError("Market refresh failed");
    }
  }, [selected, instruments]);

  useEffect(() => {
    void refreshMarket();
    const id = window.setInterval(() => void refreshMarket(), 12_000);
    return () => window.clearInterval(id);
  }, [refreshMarket]);

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
    if (!quotes.length) return "simulated" as const;
    const live = quotes.filter((q) => q.freshness === "live").length;
    if (live === quotes.length) return "live" as const;
    if (live === 0) return "simulated" as const;
    return "mixed" as const;
  }, [quotes]);

  const placeSimulatedOrder = useCallback(
    (order: Omit<SimulatedOrder, "id" | "createdAt" | "updatedAt" | "status" | "mode">) => {
      const now = new Date().toISOString();
      const id = `SIM-${Date.now().toString(36).toUpperCase()}`;
      const filled: SimulatedOrder = {
        ...order,
        id,
        status: order.type === "market" ? "filled" : "open",
        createdAt: now,
        updatedAt: now,
        mode: "simulated",
        fillPrice:
          order.type === "market"
            ? order.limitPrice ?? quoteMap.get(order.symbol)?.last
            : undefined,
      };
      setOrders((prev) => [filled, ...prev]);
    },
    [quoteMap]
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

  const value: TerminalState = {
    workspace,
    setWorkspace,
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
    chartStatus,
    chartError,
    book,
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    winners,
    losers,
    feedStatus,
    sessionLabel: "SIM / LOCAL SESSION",
    dataAsOf,
    tickerFreshness,
    orders,
    placeSimulatedOrder,
    cancelOrder,
    commandOpen,
    setCommandOpen,
    providerNote: coinbaseLedgerProvider.searchCoverageNote,
    refreshMarket,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

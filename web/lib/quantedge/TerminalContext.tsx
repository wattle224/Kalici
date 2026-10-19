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
  INSTRUMENTS,
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
  selectSymbol: (symbol: string) => void;
  search: string;
  setSearch: (s: string) => void;
  quotes: Quote[];
  quoteMap: Map<string, Quote>;
  candles: Candle[];
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
  placeSimulatedOrder: (order: Omit<SimulatedOrder, "id" | "createdAt" | "updatedAt" | "status" | "mode">) => void;
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

function findInstrument(symbol: string): Instrument {
  return (
    INSTRUMENTS.find((i) => i.symbol.toUpperCase() === symbol.toUpperCase()) ??
    INSTRUMENTS[0]
  );
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceId>("trading");
  const [selected, setSelected] = useState<Instrument>(() => findInstrument(DEFAULT_SYMBOL));
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [watchlists] = useState(DEFAULT_WATCHLISTS);
  const [activeWatchlistId, setActiveWatchlistId] = useState(DEFAULT_WATCHLISTS[0].id);
  const [feedStatus, setFeedStatus] = useState<"connected" | "degraded" | "disconnected">("disconnected");
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);

  const selectSymbol = useCallback((symbol: string) => {
    setSelected(findInstrument(symbol));
    setWorkspace("trading");
  }, []);

  const refreshMarket = useCallback(async () => {
    const cryptoSyms = INSTRUMENTS.filter((i) => i.assetClass === "crypto").map((i) => i.symbol);
    try {
      const live = await coinbaseLedgerProvider.fetchQuotes(cryptoSyms);
      const merged = buildSimulatedQuotes(live);
      // Approximate daily change for live crypto from candle open when possible
      setQuotes(merged);
      setFeedStatus(live.length ? "connected" : "degraded");
      setDataAsOf(new Date().toISOString());

      const isCrypto = selected.assetClass === "crypto";
      if (isCrypto) {
        const [c, b] = await Promise.all([
          coinbaseLedgerProvider.fetchCandles(selected.symbol),
          coinbaseLedgerProvider.fetchOrderBook(selected.symbol),
        ]);
        if (c.length >= 2) {
          const first = c[0].open;
          const last = c[c.length - 1].close;
          const change = last - first;
          const changePct = first ? (change / first) * 100 : 0;
          setQuotes((prev) =>
            prev.map((q) =>
              q.symbol === selected.symbol
                ? {
                    ...q,
                    last,
                    change: Number(change.toFixed(6)),
                    changePct: Number(changePct.toFixed(2)),
                    freshness: "live",
                  }
                : q
            )
          );
        }
        setCandles(c);
        setBook(b);
      } else {
        setCandles([]);
        setBook(null);
      }
    } catch {
      setFeedStatus("disconnected");
      setQuotes(buildSimulatedQuotes([]));
    }
  }, [selected]);

  useEffect(() => {
    void refreshMarket();
    const id = window.setInterval(() => void refreshMarket(), 10_000);
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
        fillPrice: order.type === "market" ? order.limitPrice ?? quoteMap.get(order.symbol)?.last : undefined,
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
    search,
    setSearch,
    quotes,
    quoteMap,
    candles,
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

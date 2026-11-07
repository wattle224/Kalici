"use client";

import { create } from "zustand";
import type { Instrument, AssetClass } from "../data/markets";
import { INSTRUMENTS } from "../data/markets";

export type Workspace = "global" | "trading" | "system";

export type TickerItem = {
  id: string;
  kind: "equity" | "crypto" | "index" | "alert" | "incident" | "volume";
  label: string;
  value?: string;
  chg?: number;
  severity?: "info" | "warn" | "crit";
};

export type Notification = {
  id: string;
  level: "info" | "warn" | "crit";
  source: string;
  text: string;
  at: number;
};

type AppState = {
  workspace: Workspace;
  selectedCentre: string | null;
  selectedCubeFace: number | null;
  selectedInstrument: Instrument;
  compareInstruments: string[];
  cubeMode: "3d" | "faces";
  assetFilter: AssetClass | "all";
  tickerFilter: "all" | "equity" | "crypto" | "index" | "alert";
  notifications: Notification[];
  ticker: TickerItem[];
  latencyMs: number;
  setWorkspace: (w: Workspace) => void;
  selectCentre: (id: string | null) => void;
  selectCubeFace: (i: number | null) => void;
  setInstrument: (sym: string) => void;
  toggleCompare: (sym: string) => void;
  setCubeMode: (m: "3d" | "faces") => void;
  setAssetFilter: (c: AssetClass | "all") => void;
  setTickerFilter: (f: AppState["tickerFilter"]) => void;
  pushNotification: (n: Omit<Notification, "id" | "at">) => void;
  tickTicker: (items: TickerItem[]) => void;
  setLatency: (ms: number) => void;
};

const seedTicker: TickerItem[] = [
  { id: "t1", kind: "index", label: "SPX", value: "5812.42", chg: 0.42 },
  { id: "t2", kind: "index", label: "NDX", value: "20410.6", chg: 0.71 },
  { id: "t3", kind: "crypto", label: "BTC", value: "72431", chg: 1.84 },
  { id: "t4", kind: "crypto", label: "ETH", value: "2581.7", chg: 0.92 },
  { id: "t5", kind: "equity", label: "NVDA", value: "141.9", chg: 2.11 },
  { id: "t6", kind: "equity", label: "TSLA", value: "268.1", chg: -1.23 },
  { id: "t7", kind: "alert", label: "VIX 17.2 (+6.1%)", severity: "warn" },
  { id: "t8", kind: "incident", label: "INC-20470 feed-lse backlog", severity: "warn" },
  { id: "t9", kind: "volume", label: "SPY vol 1.8× 20d avg" },
  { id: "t10", kind: "index", label: "FTSE", value: "8231.4", chg: -0.18 },
  { id: "t11", kind: "index", label: "DAX", value: "19422.1", chg: -0.32 },
  { id: "t12", kind: "crypto", label: "SOL", value: "172.3", chg: 3.10 },
];

export const useAppStore = create<AppState>((set) => ({
  workspace: "global",
  selectedCentre: null,
  selectedCubeFace: null,
  selectedInstrument: INSTRUMENTS.find((i) => i.symbol === "NVDA")!,
  compareInstruments: ["AAPL", "MSFT"],
  cubeMode: "3d",
  assetFilter: "all",
  tickerFilter: "all",
  notifications: [
    { id: "n1", level: "warn", source: "oms-core", text: "p95 latency 84ms exceeds 60ms SLO", at: Date.now() - 42 * 60_000 },
    { id: "n2", level: "info", source: "md-router", text: "Reconnected to feed-tse (seq resumed)", at: Date.now() - 11 * 60_000 },
    { id: "n3", level: "crit", source: "risk-engine", text: "NVDA single-name exposure 7.2% (limit 7%)", at: Date.now() - 2 * 60_000 },
  ],
  ticker: seedTicker,
  latencyMs: 24,
  setWorkspace: (w) => set({ workspace: w }),
  selectCentre: (id) => set({ selectedCentre: id }),
  selectCubeFace: (i) => set({ selectedCubeFace: i }),
  setInstrument: (sym) =>
    set((s) => ({
      selectedInstrument:
        INSTRUMENTS.find((i) => i.symbol === sym) ?? s.selectedInstrument,
    })),
  toggleCompare: (sym) =>
    set((s) => ({
      compareInstruments: s.compareInstruments.includes(sym)
        ? s.compareInstruments.filter((x) => x !== sym)
        : [...s.compareInstruments, sym].slice(0, 4),
    })),
  setCubeMode: (m) => set({ cubeMode: m }),
  setAssetFilter: (c) => set({ assetFilter: c }),
  setTickerFilter: (f) => set({ tickerFilter: f }),
  pushNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: `n${Math.random().toString(36).slice(2, 8)}`, at: Date.now() },
        ...s.notifications,
      ].slice(0, 50),
    })),
  tickTicker: (items) => set({ ticker: items }),
  setLatency: (ms) => set({ latencyMs: ms }),
}));

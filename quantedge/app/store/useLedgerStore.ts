"use client";

import { create } from "zustand";
import {
  EMPTY_SUMMARY,
  fetchLedger,
  setDeposit as postDeposit,
  summariseLedger,
  type SimulationSummary,
} from "../lib/ledgerApi";

type LedgerState = {
  summary: SimulationSummary;
  loading: boolean;
  refresh: () => Promise<void>;
  fundDeposit: (amount: number) => Promise<void>;
};

export const useLedgerStore = create<LedgerState>((set) => ({
  summary: EMPTY_SUMMARY,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const payload = await fetchLedger();
      set({ summary: summariseLedger(payload), loading: false });
    } catch (e) {
      set({
        loading: false,
        summary: {
          ...EMPTY_SUMMARY,
          error:
            e instanceof Error
              ? e.message
              : "Ledger API unreachable on :8000",
          fetchedAt: Date.now(),
        },
      });
    }
  },
  fundDeposit: async (amount: number) => {
    set({ loading: true });
    try {
      const payload = await postDeposit(amount);
      set({ summary: summariseLedger(payload), loading: false });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not set deposit";
      // Keep prior connected state so a fund failure doesn't look like
      // a total ledger outage (common when only the Next proxy is broken).
      set((state) => ({
        loading: false,
        summary: {
          ...state.summary,
          error: `Fund failed: ${msg}`,
          fetchedAt: Date.now(),
        },
      }));
    }
  },
}));

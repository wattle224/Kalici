"use client";

import { create } from "zustand";
import {
  EMPTY_SUMMARY,
  fetchLedger,
  summariseLedger,
  type SimulationSummary,
} from "../lib/ledgerApi";

type LedgerState = {
  summary: SimulationSummary;
  loading: boolean;
  refresh: () => Promise<void>;
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
}));

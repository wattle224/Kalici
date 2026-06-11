import type { TradingSnapshotWithAutomation } from "./automation";

export const LEDGER_API_URL =
  process.env.NEXT_PUBLIC_LEDGER_API_URL ?? "http://127.0.0.1:8000";

export const LEDGER_LOAD_ERROR =
  "Ledger data could not be loaded from the API. Restart the backend (port 8000) and refresh.";

export interface LedgerApiResponse {
  ok?: boolean;
  snapshot?: TradingSnapshotWithAutomation;
  executionState?: string;
  totalRealizedPnL?: number;
  realisedPnL?: number;
  tradeHistory?: unknown[];
  orders?: unknown[];
}

export async function fetchLedger(): Promise<LedgerApiResponse> {
  const urls = [
    `${LEDGER_API_URL}/api/ledger`,
    `${LEDGER_API_URL}/ledger`,
    `${LEDGER_API_URL}/api/trading`,
  ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as LedgerApiResponse;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Failed to fetch");
    }
  }
  throw lastError ?? new Error("Failed to fetch");
}

export async function postCleanRestart(): Promise<LedgerApiResponse> {
  const res = await fetch(`${LEDGER_API_URL}/api/ledger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clean-restart" }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as LedgerApiResponse;
}

export async function saveLedgerSnapshot(
  snapshot: TradingSnapshotWithAutomation
): Promise<void> {
  const res = await fetch(`${LEDGER_API_URL}/api/ledger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function isLedgerApiUp(): Promise<boolean> {
  try {
    const res = await fetch(`${LEDGER_API_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

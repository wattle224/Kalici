import type { TradingSnapshotWithAutomation } from "./automation";

export interface LedgerApiResponse {
  ok?: boolean;
  snapshot?: TradingSnapshotWithAutomation;
  executionState?: string;
  totalRealizedPnL?: number;
  realisedPnL?: number;
  tradeHistory?: unknown[];
  orders?: unknown[];
}

const LOCAL_PATHS = ["/api/ledger", "/api/trading"];

/** External IAM app may call port 8000 — tried after same-origin routes. */
const REMOTE_BASES = ["http://127.0.0.1:8000", "http://localhost:8000"];

const REMOTE_PATHS = [
  "/api/ledger",
  "/ledger",
  "/api/trading",
  "/api/orders",
  "/orders",
];

async function tryFetch(
  url: string,
  init?: RequestInit
): Promise<LedgerApiResponse> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as LedgerApiResponse;
  if (data.snapshot) return data;
  if (data.tradeHistory || data.orders) {
    return data;
  }
  throw new Error("No ledger data in response");
}

function ledgerGetUrls(): string[] {
  return [
    ...LOCAL_PATHS,
    ...REMOTE_BASES.flatMap((base) => REMOTE_PATHS.map((p) => `${base}${p}`)),
  ];
}

function ledgerPostUrls(): string[] {
  return [
    ...LOCAL_PATHS,
    ...REMOTE_BASES.flatMap((base) =>
      ["/api/ledger", "/api/trading", "/ledger"].map((p) => `${base}${p}`)
    ),
  ];
}

export async function fetchLedger(): Promise<LedgerApiResponse> {
  let lastError: Error | null = null;
  for (const url of ledgerGetUrls()) {
    try {
      return await tryFetch(url);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Failed to fetch");
    }
  }
  throw lastError ?? new Error("Failed to fetch");
}

async function postLedger(
  body: Record<string, unknown>
): Promise<LedgerApiResponse> {
  let lastError: Error | null = null;
  for (const url of ledgerPostUrls()) {
    try {
      return await tryFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Failed to fetch");
    }
  }
  throw lastError ?? new Error("Failed to fetch");
}

export async function postCleanRestart(): Promise<LedgerApiResponse> {
  return postLedger({ action: "clean-restart" });
}

export async function saveLedgerSnapshot(
  snapshot: TradingSnapshotWithAutomation
): Promise<void> {
  await postLedger({ snapshot });
}

export async function isLedgerApiUp(): Promise<boolean> {
  for (const url of ["/api/ledger", ...REMOTE_BASES.map((b) => `${b}/health`)]) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* next */
    }
  }
  return false;
}

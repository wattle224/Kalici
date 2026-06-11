import type { TradingSnapshotWithAutomation } from "./automation";

export const LEDGER_LOAD_ERROR =
  "Ledger data could not be loaded from the API. Restart the backend (port 8000) and refresh.";

const REMOTE_BASES = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

export interface LedgerApiResponse {
  ok?: boolean;
  snapshot?: TradingSnapshotWithAutomation;
  executionState?: string;
  totalRealizedPnL?: number;
  realisedPnL?: number;
  tradeHistory?: unknown[];
  orders?: unknown[];
}

function ledgerUrls(): string[] {
  const paths = ["/api/ledger", "/api/trading", "/ledger"];
  const local = paths.map((p) => p);
  const remote = REMOTE_BASES.flatMap((base) =>
    paths.map((p) => `${base}${p}`)
  );
  return [...local, ...remote];
}

async function tryFetch(url: string, init?: RequestInit): Promise<LedgerApiResponse> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const data = (await res.json()) as LedgerApiResponse;
  if (!data.snapshot && data.tradeHistory) {
    return data;
  }
  if (!data.snapshot) throw new Error(`No snapshot from ${url}`);
  return data;
}

export async function fetchLedger(): Promise<LedgerApiResponse> {
  let lastError: Error | null = null;
  for (const url of ledgerUrls()) {
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
  const postPaths = ["/api/ledger", "/api/trading", "/ledger"];
  const urls = [
    ...postPaths,
    ...REMOTE_BASES.flatMap((base) => postPaths.map((p) => `${base}${p}`)),
  ];

  let lastError: Error | null = null;
  for (const url of urls) {
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
  const checks = ["/api/ledger", "/health", ...REMOTE_BASES.map((b) => `${b}/health`)];
  for (const url of checks) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

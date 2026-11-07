import type { TradingSnapshotWithAutomation } from "./automation";
import {
  ensureCapital,
  tickDecisionEngine,
} from "./decisionEngine";
import {
  cleanBootstrap,
  sanitize,
  containsCorruptHistory,
  isLegacySnapshot,
  STORAGE_KEY,
} from "./trading";

/**
 * Advance a deposit-funded snapshot: sanitize, ensure capital account, then
 * let the opportunity model decide BUY / SELL / HOLD from available cash.
 */
export function hydrateSnapshot(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  const sanitized = sanitize(snapshot) as TradingSnapshotWithAutomation;
  const withCapital = ensureCapital(sanitized);
  return tickDecisionEngine(withCapital, now);
}

export function loadSnapshot(): TradingSnapshotWithAutomation {
  if (typeof window === "undefined") {
    return hydrateSnapshot(cleanBootstrap());
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return hydrateSnapshot(cleanBootstrap());
    const parsed = JSON.parse(raw) as TradingSnapshotWithAutomation;
    if (isLegacySnapshot(parsed) || containsCorruptHistory(parsed)) {
      return hydrateSnapshot(cleanBootstrap());
    }
    return hydrateSnapshot(parsed);
  } catch {
    return hydrateSnapshot(cleanBootstrap());
  }
}

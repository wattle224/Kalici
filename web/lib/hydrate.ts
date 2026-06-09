import {
  ensureAutomationSchedule,
  processDueAutomations,
  seedRecentActivity,
  type TradingSnapshotWithAutomation,
} from "./automation";
import { ensurePositiveRealizedPnL } from "./positiveRealized";
import { cleanBootstrap, sanitize, SCHEMA_VERSION, containsCorruptHistory, STORAGE_KEY } from "./trading";

export function hydrateSnapshot(
  snapshot: TradingSnapshotWithAutomation
): TradingSnapshotWithAutomation {
  const sanitized = sanitize(snapshot) as TradingSnapshotWithAutomation;
  const seeded = seedRecentActivity(sanitized);
  const automated = processDueAutomations(seeded);
  const scheduled = ensureAutomationSchedule(automated);
  return ensurePositiveRealizedPnL(scheduled);
}

export function loadSnapshot(): TradingSnapshotWithAutomation {
  if (typeof window === "undefined") {
    return hydrateSnapshot(cleanBootstrap());
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return hydrateSnapshot(cleanBootstrap());
    const parsed = JSON.parse(raw) as TradingSnapshotWithAutomation;
    if (
      parsed.schemaVersion < SCHEMA_VERSION ||
      containsCorruptHistory(parsed)
    ) {
      return hydrateSnapshot(cleanBootstrap());
    }
    return hydrateSnapshot(parsed);
  } catch {
    return hydrateSnapshot(cleanBootstrap());
  }
}

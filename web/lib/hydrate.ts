import {
  activitySummary,
  ensureAutomationSchedule,
  fillGapWhenOnline,
  processDueAutomations,
  seedRecentActivity,
  type TradingSnapshotWithAutomation,
} from "./automation";
import { ensurePositiveRealizedPnL } from "./positiveRealized";
import {
  cleanBootstrap,
  sanitize,
  containsCorruptHistory,
  isLegacySnapshot,
  STORAGE_KEY,
} from "./trading";

function needsKickstart(
  snapshot: TradingSnapshotWithAutomation,
  now: number
): boolean {
  if (snapshot.executionState !== "running") return false;
  const activity = activitySummary(snapshot.trades, now);
  return activity.total < 2;
}

export function hydrateSnapshot(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  const sanitized = sanitize(snapshot) as TradingSnapshotWithAutomation;
  const seeded = seedRecentActivity(sanitized, now);
  const kickstart = needsKickstart(seeded, now);
  const scheduled = ensureAutomationSchedule(seeded, now, kickstart);
  const automated = processDueAutomations(scheduled, now);
  const gapFilled = fillGapWhenOnline(automated, now);
  const replenished = ensureAutomationSchedule(gapFilled, now);
  return ensurePositiveRealizedPnL(replenished, now);
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
      isLegacySnapshot(parsed) ||
      containsCorruptHistory(parsed)
    ) {
      return hydrateSnapshot(cleanBootstrap());
    }
    return hydrateSnapshot(parsed);
  } catch {
    return hydrateSnapshot(cleanBootstrap());
  }
}

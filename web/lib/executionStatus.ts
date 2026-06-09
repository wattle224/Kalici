import type { PendingAutomation } from "./automation";
import type { ExecutionState, Trade } from "./trading";

export interface ExecutionStatus {
  label: "ONLINE" | "OFFLINE";
  state: ExecutionState;
  isOnline: boolean;
  pendingCount: number;
  dueNowCount: number;
  executingNow: boolean;
  lastFillAt: string | null;
  nextOrderAt: string | null;
  nextOrderSymbol: string | null;
  nextOrderSide: string | null;
}

export function getExecutionStatus(
  state: ExecutionState,
  trades: Trade[],
  pending: PendingAutomation[] | undefined,
  now = Date.now()
): ExecutionStatus {
  const isOnline = state === "running";
  const fills = trades
    .filter((t) => t.status === "filled" && t.executionPrice > 0)
    .sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );

  const queue = pending ?? [];
  const due = queue.filter((p) => new Date(p.executeAt).getTime() <= now);
  const future = queue
    .filter((p) => new Date(p.executeAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.executeAt).getTime() - new Date(b.executeAt).getTime()
    );

  const next = future[0];

  return {
    label: isOnline ? "ONLINE" : "OFFLINE",
    state,
    isOnline,
    pendingCount: queue.length,
    dueNowCount: due.length,
    executingNow: isOnline && due.length > 0,
    lastFillAt: fills[0]?.executedAt ?? null,
    nextOrderAt: next?.executeAt ?? null,
    nextOrderSymbol: next?.symbol ?? null,
    nextOrderSide: next?.side ?? null,
  };
}

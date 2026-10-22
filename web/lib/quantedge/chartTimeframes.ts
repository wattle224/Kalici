import type { Candle, ChartTimeframe } from "./types";

export interface TimeframeConfig {
  /** Coinbase API granularity (seconds). */
  apiGranularitySec: number;
  /** Candle bucket after optional aggregation. */
  displayBucketSec: number;
  /** How many candles to request / keep. */
  limit: number;
  /** Poll interval for chart refresh. */
  refreshMs: number;
  note: string;
}

export const TIMEFRAME_CONFIG: Record<ChartTimeframe, TimeframeConfig> = {
  live: {
    apiGranularitySec: 60,
    displayBucketSec: 60,
    limit: 180,
    refreshMs: 5_000,
    note: "1-minute candles, refreshing every 5s",
  },
  "3m": {
    // Coinbase has no 180s granularity — build 3m bars from 1m candles.
    apiGranularitySec: 60,
    displayBucketSec: 180,
    limit: 300,
    refreshMs: 15_000,
    note: "3-minute bars aggregated from Coinbase 1m candles",
  },
  "5m": {
    apiGranularitySec: 300,
    displayBucketSec: 300,
    limit: 200,
    refreshMs: 20_000,
    note: "Coinbase 5-minute candles",
  },
  "15m": {
    apiGranularitySec: 900,
    displayBucketSec: 900,
    limit: 168,
    refreshMs: 30_000,
    note: "Coinbase 15-minute candles",
  },
  "1h": {
    apiGranularitySec: 3600,
    displayBucketSec: 3600,
    limit: 168,
    refreshMs: 60_000,
    note: "Coinbase 1-hour candles",
  },
};

/** Aggregate finer candles into larger OHLC buckets. */
export function aggregateCandles(candles: Candle[], bucketSec: number): Candle[] {
  if (bucketSec <= 0 || candles.length === 0) return candles;
  const map = new Map<number, Candle>();
  for (const c of candles) {
    const bucket = Math.floor(c.time / bucketSec) * bucketSec;
    const existing = map.get(bucket);
    if (!existing) {
      map.set(bucket, {
        time: bucket,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

export function prepareCandlesForTimeframe(
  candles: Candle[],
  timeframe: ChartTimeframe
): Candle[] {
  const cfg = TIMEFRAME_CONFIG[timeframe];
  const prepared =
    cfg.displayBucketSec === cfg.apiGranularitySec
      ? candles
      : aggregateCandles(candles, cfg.displayBucketSec);
  return prepared.slice(-Math.max(2, Math.floor(cfg.limit / (cfg.displayBucketSec / cfg.apiGranularitySec))));
}

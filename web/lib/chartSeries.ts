import type { Trade } from "./trading";

export interface ChartPoint {
  t: number;
  price: number;
  label: string;
}

export interface ChartSeries {
  symbol: string;
  points: ChartPoint[];
  min: number;
  max: number;
}

export function buildPriceSeries(
  trades: Trade[],
  symbol: string
): ChartSeries | null {
  const fills = trades
    .filter(
      (t) =>
        t.symbol === symbol &&
        t.status === "filled" &&
        t.executionPrice > 0
    )
    .sort(
      (a, b) =>
        new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
    );

  if (fills.length === 0) return null;

  const points: ChartPoint[] = fills.map((t) => ({
    t: new Date(t.executedAt).getTime(),
    price: t.executionPrice,
    label: new Date(t.executedAt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const prices = points.map((p) => p.price);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const pad = (rawMax - rawMin) * 0.08 || rawMin * 0.02 || 0.01;

  return {
    symbol,
    points,
    min: rawMin - pad,
    max: rawMax + pad,
  };
}

export function formatAxisPrice(value: number, symbol: string): string {
  if (symbol.startsWith("SKL") || value < 100) {
    return value.toFixed(4);
  }
  if (value >= 1000) {
    return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }
  return value.toFixed(2);
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  const range = max - min;
  if (range <= 0) return [min];

  const rough = range / Math.max(count - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / magnitude;
  let step = magnitude;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;

  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) {
    if (v >= min - step * 0.5) ticks.push(Math.round(v * 10000) / 10000);
    if (ticks.length > count + 2) break;
  }
  return ticks.length > 0 ? ticks : [min, max];
}

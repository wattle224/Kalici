"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
  ColorType,
} from "lightweight-charts";
import type { Candle } from "@/lib/quantedge/types";

export default function CandleChart({
  candles,
  symbol,
  status,
  error,
}: {
  candles: Candle[];
  symbol: string;
  status: "idle" | "loading" | "ready" | "empty" | "error";
  error?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#12161c" },
        textColor: "#8b97a8",
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#2a3340" },
        horzLines: { color: "#2a3340" },
      },
      rightPriceScale: { borderColor: "#2a3340" },
      timeScale: { borderColor: "#2a3340", timeVisible: true },
      crosshair: { mode: 0 },
      height: 360,
      width: el.clientWidth || 640,
    });
    const candlesApi = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderUpColor: "#0ecb81",
      borderDownColor: "#f6465d",
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });
    const volApi = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    chartRef.current = chart;
    candleSeries.current = candlesApi;
    volumeSeries.current = volApi;

    const ro = new ResizeObserver(() => {
      if (ref.current) chart.applyOptions({ width: Math.max(ref.current.clientWidth, 100) });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeries.current = null;
      volumeSeries.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current) return;
    if (candles.length < 2) {
      candleSeries.current.setData([]);
      volumeSeries.current.setData([]);
      return;
    }
    // Deduplicate / sort times for lightweight-charts
    const byTime = new Map<number, Candle>();
    for (const c of candles) {
      const t = Math.floor(c.time);
      byTime.set(t, c);
    }
    const sorted = [...byTime.entries()].sort((a, b) => a[0] - b[0]);
    const cdata: CandlestickData[] = sorted.map(([time, c]) => ({
      time: time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const vdata: HistogramData[] = sorted.map(([time, c]) => ({
      time: time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "rgba(14,203,129,0.35)" : "rgba(246,70,93,0.35)",
    }));
    candleSeries.current.setData(cdata);
    volumeSeries.current.setData(vdata);
    chartRef.current?.timeScale().fitContent();
  }, [candles, symbol]);

  const overlay =
    status === "loading"
      ? `Loading live candles for ${symbol}…`
      : status === "error"
        ? error || `Failed to load chart for ${symbol}`
        : status === "empty" || candles.length < 2
          ? `No live candle series for ${symbol}. Pick a Coinbase USD crypto from the dropdown.`
          : null;

  return (
    <div className="relative h-[360px] w-full">
      <div ref={ref} className="h-full w-full" />
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded border border-dashed border-qe-border bg-qe-bg/80 px-4 text-center text-xs text-qe-muted">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}

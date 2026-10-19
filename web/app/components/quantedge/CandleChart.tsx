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
}: {
  candles: Candle[];
  symbol: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
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
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    });
    ro.observe(ref.current);
    chart.applyOptions({ width: ref.current.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current) return;
    if (candles.length < 2) {
      candleSeries.current.setData([]);
      volumeSeries.current.setData([]);
      return;
    }
    const cdata: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const vdata: HistogramData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "rgba(14,203,129,0.35)" : "rgba(246,70,93,0.35)",
    }));
    candleSeries.current.setData(cdata);
    volumeSeries.current.setData(vdata);
    chartRef.current?.timeScale().fitContent();
  }, [candles, symbol]);

  if (candles.length < 2) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded border border-dashed border-qe-border bg-qe-bg text-xs text-qe-muted">
        No candle series for {symbol}. Crypto products load live from Coinbase; other
        asset classes show simulated quotes only until a vendor feed is connected.
      </div>
    );
  }

  return <div ref={ref} className="h-[360px] w-full" />;
}

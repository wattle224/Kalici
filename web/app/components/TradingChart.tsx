"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatAxisPrice,
  niceTicks,
  type ChartPoint,
  type ChartSeries,
} from "@/lib/chartSeries";
import type { CoinbaseCandle } from "@/lib/coinbase";

const VIEW_W = 640;
const VIEW_H = 280;
const MARGIN = { top: 16, right: 16, bottom: 40, left: 72 };

interface TradingChartProps {
  symbol: string;
  candles: CoinbaseCandle[];
  loading?: boolean;
  error?: string | null;
}

export default function TradingChart({
  symbol,
  candles,
  loading = false,
  error = null,
}: TradingChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(VIEW_W);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? VIEW_W;
      setWidth(Math.max(320, Math.round(w)));
    });
    ro.observe(el);
    setWidth(Math.max(320, Math.round(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => candlesToSeries(symbol, candles), [symbol, candles]);

  return (
    <div className="chart-card">
      <header className="chart-header">
        <span className="symbol">{symbol} price</span>
        <span className="meta">
          {loading
            ? "Loading Coinbase…"
            : series
              ? `${series.points.length} hourly candles · Coinbase`
              : "Coinbase candles"}
        </span>
      </header>
      {error ? (
        <p className="meta" style={{ color: "var(--red)" }}>
          {error}
        </p>
      ) : null}
      {!series || series.points.length < 2 ? (
        <p className="meta">
          {loading
            ? "Fetching live price history from Coinbase…"
            : `No candle data for ${symbol} yet.`}
        </p>
      ) : (
        <div ref={wrapRef} className="chart-wrap">
          <ChartSvg series={series} width={width} />
        </div>
      )}
    </div>
  );
}

function candlesToSeries(
  symbol: string,
  candles: CoinbaseCandle[]
): ChartSeries | null {
  if (!candles.length) return null;
  const points: ChartPoint[] = candles.map((c) => ({
    t: c.time * 1000,
    price: c.close,
    label: new Date(c.time * 1000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
  const prices = points.map((p) => p.price);
  const rawMin = Math.min(...prices, ...candles.map((c) => c.low));
  const rawMax = Math.max(...prices, ...candles.map((c) => c.high));
  const pad = (rawMax - rawMin) * 0.08 || rawMin * 0.002 || 0.01;
  return {
    symbol,
    points,
    min: rawMin - pad,
    max: rawMax + pad,
  };
}

function ChartSvg({ series, width }: { series: ChartSeries; width: number }) {
  const plotW = VIEW_W - MARGIN.left - MARGIN.right;
  const plotH = VIEW_H - MARGIN.top - MARGIN.bottom;

  const tMin = series.points[0].t;
  const tMax = series.points[series.points.length - 1].t;
  const tSpan = Math.max(tMax - tMin, 1);

  const x = (t: number) => MARGIN.left + ((t - tMin) / tSpan) * plotW;
  const y = (price: number) =>
    MARGIN.top +
    plotH -
    ((price - series.min) / Math.max(series.max - series.min, 1e-9)) * plotH;

  const yTicks = niceTicks(series.min, series.max, 5);
  const linePath = series.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t)} ${y(p.price)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(tMax)} ${MARGIN.top + plotH} L ${x(tMin)} ${
    MARGIN.top + plotH
  } Z`;

  const xLabels = pickXLabels(series.points, 5);
  const last = series.points[series.points.length - 1];

  return (
    <svg
      className="trading-chart-svg"
      width={width}
      height={VIEW_H}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${series.symbol} price chart`}
    >
      <defs>
        <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={MARGIN.left}
            x2={VIEW_W - MARGIN.right}
            y1={y(tick)}
            y2={y(tick)}
            className="chart-grid"
          />
          <text
            x={MARGIN.left - 8}
            y={y(tick)}
            className="chart-axis-y"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {formatAxisPrice(tick, series.symbol)}
          </text>
        </g>
      ))}

      {xLabels.map((p) => (
        <text
          key={p.t}
          x={x(p.t)}
          y={VIEW_H - 12}
          className="chart-axis-x"
          textAnchor="middle"
        >
          {p.label}
        </text>
      ))}

      <path d={areaPath} fill="url(#priceFill)" />
      <path d={linePath} className="chart-line" fill="none" />
      <circle
        cx={x(last.t)}
        cy={y(last.price)}
        r={4}
        className="chart-dot"
      />
    </svg>
  );
}

function pickXLabels(
  points: ChartSeries["points"],
  maxLabels: number
): ChartSeries["points"] {
  if (points.length <= maxLabels) return points;
  const step = Math.ceil(points.length / maxLabels);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

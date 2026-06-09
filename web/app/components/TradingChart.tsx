"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPriceSeries,
  formatAxisPrice,
  niceTicks,
  type ChartSeries,
} from "@/lib/chartSeries";
import type { Trade } from "@/lib/trading";

const VIEW_W = 640;
const VIEW_H = 280;
const MARGIN = { top: 16, right: 16, bottom: 40, left: 72 };

interface TradingChartProps {
  trades: Trade[];
  symbol: string;
}

export default function TradingChart({ trades, symbol }: TradingChartProps) {
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

  const series = useMemo(
    () => buildPriceSeries(trades, symbol),
    [trades, symbol]
  );

  if (!series || series.points.length < 2) {
    return (
      <div className="chart-card">
        <p className="meta">Not enough {symbol} fills to chart yet.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <header className="chart-header">
        <span className="symbol">{symbol}</span>
        <span className="meta">Price history</span>
      </header>
      <div ref={wrapRef} className="chart-wrap">
        <ChartSvg series={series} width={width} />
      </div>
    </div>
  );
}

function ChartSvg({ series, width }: { series: ChartSeries; width: number }) {
  const plotW = VIEW_W - MARGIN.left - MARGIN.right;
  const plotH = VIEW_H - MARGIN.top - MARGIN.bottom;

  const tMin = series.points[0].t;
  const tMax = series.points[series.points.length - 1].t;
  const tSpan = Math.max(tMax - tMin, 1);

  const x = (t: number) =>
    MARGIN.left + ((t - tMin) / tSpan) * plotW;
  const y = (price: number) =>
    MARGIN.top +
    plotH -
    ((price - series.min) / (series.max - series.min)) * plotH;

  const yTicks = niceTicks(series.min, series.max, 5);
  const linePath = series.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t)} ${y(p.price)}`)
    .join(" ");

  const xLabels = pickXLabels(series.points, 5);

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

      <path d={linePath} className="chart-line" fill="none" />
      {series.points.map((p) => (
        <circle
          key={p.t}
          cx={x(p.t)}
          cy={y(p.price)}
          r={3}
          className="chart-dot"
        />
      ))}
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

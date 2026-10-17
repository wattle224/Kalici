"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  illustrativeRegimes,
  REGIME_METHOD,
  RISK_LIMITS,
  RISK_SNAPSHOT,
  sampleSeries,
} from "@/lib/quantedge/sampleData";
import { Badge, Button, Panel, PnL } from "./ui";

function LineChart({
  points,
  color,
  height = 120,
}: {
  points: { t: number; v: number }[];
  color: string;
  height?: number;
}) {
  const w = 480;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 1e-9);
  const d = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = height - ((v - min) / span) * (height - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-[120px] w-full">
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" />
    </svg>
  );
}

function Heatmap() {
  const labels = ["XRP", "BTC", "ETH", "SOL", "SPY"];
  const matrix = [
    [1, 0.62, 0.58, 0.51, 0.22],
    [0.62, 1, 0.81, 0.66, 0.31],
    [0.58, 0.81, 1, 0.72, 0.28],
    [0.51, 0.66, 0.72, 1, 0.19],
    [0.22, 0.31, 0.28, 0.19, 1],
  ];
  return (
    <div className="overflow-auto">
      <table className="text-[10px]">
        <thead>
          <tr>
            <th />
            {labels.map((l) => (
              <th key={l} className="px-1 text-qe-muted">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <td className="pr-1 text-qe-muted">{labels[i]}</td>
              {row.map((v, j) => {
                const intensity = Math.round(v * 180);
                return (
                  <td key={`${i}-${j}`} className="p-0.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded font-mono text-[9px] text-qe-text"
                      style={{ background: `rgba(61,139,253,${0.15 + v * 0.55})`, boxShadow: `inset 0 0 0 1px rgba(${255 - intensity},${intensity},120,0.25)` }}
                    >
                      {v.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-qe-muted">Simulated correlation matrix for UI demonstration.</p>
    </div>
  );
}

export default function RiskWorkspace() {
  const risk = RISK_SNAPSHOT;
  const [shock, setShock] = useState(-0.1);
  const [limits, setLimits] = useState(RISK_LIMITS);
  const regimes = useMemo(() => illustrativeRegimes(60), []);
  const perf = sampleSeries(90, 100, 0.015);
  const dd = sampleSeries(90, -0.02, 0.2).map((p) => ({ ...p, v: -Math.abs(p.v / 20) }));
  const vol = sampleSeries(90, 0.14, 0.05);

  const scenarioPnl = risk.marketValue * shock;
  const currentRegime = regimes[regimes.length - 1];

  const runScenario = () => {
    setLimits((prev) =>
      prev.map((l) => {
        if (l.metric === "dailyPnl") {
          const current = scenarioPnl;
          const status = current < l.limit ? "breach" : current < l.limit * 0.5 ? "warning" : "ok";
          return { ...l, current, status: status as "ok" | "warning" | "breach" };
        }
        return l;
      })
    );
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-2 p-2">
      <div className="col-span-12">
        <Badge tone="amber">Risk metrics & regimes are illustrative / simulated unless noted</Badge>
      </div>

      <Panel title="Portfolio risk overview" className="col-span-12 lg:col-span-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Market value" value={`$${(risk.marketValue / 1e6).toFixed(2)}M`} />
          <Stat label="Daily P&L" value={<PnL value={risk.dailyPnl} />} />
          <Stat label="Cumulative P&L" value={<PnL value={risk.cumulativePnl} />} />
          <Stat label="Unrealized" value={<PnL value={risk.unrealizedPnl} />} />
          <Stat label="Gross / Net" value={`$${(risk.grossExposure / 1e6).toFixed(1)}M / $${(risk.netExposure / 1e6).toFixed(1)}M`} />
          <Stat label="Vol (ann.)" value={`${(risk.volatility * 100).toFixed(1)}%`} />
          <Stat label="Max DD" value={<PnL pct={risk.maxDrawdown * 100} />} />
          <Stat label="Leverage" value={risk.leverage.toFixed(2)} />
          <Stat label="VaR 95% 1d" value={`$${(risk.var95 / 1000).toFixed(0)}k`} />
          <Stat label="ES 95% 1d" value={`$${(risk.es95 / 1000).toFixed(0)}k`} />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-qe-muted">{risk.methodology}</p>
      </Panel>

      <Panel title="Performance / drawdown / vol" className="col-span-12 lg:col-span-5">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Equity curve (sim)</div>
            <LineChart points={perf} color="#0ecb81" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Drawdown (sim)</div>
            <LineChart points={dd} color="#f6465d" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Rolling volatility (sim)</div>
            <LineChart points={vol} color="#f0b90b" />
          </div>
        </div>
      </Panel>

      <Panel title="Correlation heatmap" className="col-span-12 lg:col-span-3">
        <Heatmap />
      </Panel>

      <Panel title="Market regime analysis" className="col-span-12 lg:col-span-7">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-qe-muted">Current estimated regime:</span>
          <Badge tone="blue">{currentRegime.regime.replaceAll("_", " ")}</Badge>
          <span className="font-mono text-qe-muted">
            confidence {(currentRegime.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="relative h-10 overflow-hidden rounded border border-qe-border bg-qe-bg">
          <div className="flex h-full w-full">
            {regimes.map((r) => {
              const colors: Record<string, string> = {
                trending_up: "#0ecb8144",
                trending_down: "#f6465d44",
                range: "#3d8bfd33",
                high_vol: "#f0b90b55",
                low_vol: "#8b97a833",
                risk_on: "#0ecbff33",
                risk_off: "#f6465d33",
              };
              const width = Math.max(4, ((r.end - r.start) / (regimes[regimes.length - 1].end - regimes[0].start)) * 100);
              return (
                <div
                  key={`${r.start}-${r.regime}`}
                  title={`${r.regime} (${(r.confidence * 100).toFixed(0)}%)`}
                  style={{ width: `${width}%`, background: colors[r.regime] }}
                  className="h-full border-r border-qe-border/40"
                />
              );
            })}
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-[11px] text-qe-text">
          <li>Evidence: illustrative rolling vol + trend heuristic (prototype).</li>
          <li>Indicators used: return sign persistence, realized vol bucket, risk-on/off proxy.</li>
          <li>Limitations: not statistically validated; do not use for live risk decisions.</li>
        </ul>
        <p className="mt-2 text-[10px] text-qe-muted">{REGIME_METHOD}</p>
      </Panel>

      <Panel title="Scenario analysis" className="col-span-12 lg:col-span-5">
        <p className="mb-2 text-[11px] text-qe-muted">
          Hypothetical shock applied to current simulated market value. Not a historical backtest.
        </p>
        <div className="flex flex-wrap gap-2">
          {[ -0.05, -0.1, -0.2, 0.05 ].map((s) => (
            <Button key={s} variant={shock === s ? "primary" : "ghost"} onClick={() => setShock(s)}>
              {s > 0 ? "+" : ""}
              {(s * 100).toFixed(0)}% equity
            </Button>
          ))}
        </div>
        <div className="mt-3 rounded border border-qe-border bg-qe-bg p-3 text-xs">
          <div>
            Estimated portfolio P&L: <PnL value={scenarioPnl} />
          </div>
          <div className="mt-1 text-qe-muted">
            Limit impact preview updates Daily loss row when you run the scenario.
          </div>
          <Button className="mt-2" variant="primary" onClick={runScenario}>
            Apply scenario to limits (sim)
          </Button>
        </div>
      </Panel>

      <Panel title="Risk limits & alerts" className="col-span-12">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase text-qe-muted">
            <tr>
              <th className="py-1">Limit</th>
              <th>Current</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {limits.map((l) => (
              <tr key={l.id} className="border-t border-qe-border text-qe-text">
                <td className="py-1.5">{l.name}</td>
                <td className="font-mono">
                  {l.unit === "frac"
                    ? `${(l.current * 100).toFixed(1)}%`
                    : l.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="font-mono">
                  {l.unit === "frac"
                    ? `${(l.limit * 100).toFixed(1)}%`
                    : l.limit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td>
                  <Badge
                    tone={l.status === "ok" ? "green" : l.status === "warning" ? "amber" : "red"}
                  >
                    {l.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border border-qe-border bg-qe-bg p-2">
      <div className="text-[10px] uppercase text-qe-muted">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-qe-text">{value}</div>
    </div>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  illustrativeRegimes,
  REGIME_METHOD,
  RISK_LIMITS,
  RISK_SNAPSHOT,
  sampleSeries,
} from "@/lib/quantedge/sampleData";
import { useTerminal } from "@/lib/quantedge/TerminalContext";
import type { InstrumentAnalysis } from "@/lib/quantedge/analysis";
import { Badge, Button, Field, Panel, PnL, Select } from "./ui";

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

function Heatmap({ symbols }: { symbols: string[] }) {
  const labels = symbols.slice(0, 5).map((s) => s.replace("-USD", ""));
  const n = labels.length || 1;
  const matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 1 : Number((0.2 + ((i * 7 + j * 3) % 9) * 0.07).toFixed(2))
    )
  );
  return (
    <div className="overflow-auto">
      <table className="text-[10px]">
        <thead>
          <tr>
            <th />
            {labels.map((l) => (
              <th key={l} className="px-1 text-qe-muted">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i] ?? i}>
              <td className="pr-1 text-qe-muted">{labels[i]}</td>
              {row.map((v, j) => (
                <td key={`${i}-${j}`} className="p-0.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded font-mono text-[9px] text-qe-text"
                    style={{ background: `rgba(61,139,253,${0.15 + v * 0.55})` }}
                  >
                    {v.toFixed(2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-qe-muted">
        Correlation cells are illustrative unless marked otherwise.
      </p>
    </div>
  );
}

export default function RiskWorkspace() {
  const { selected, selectSymbol, instruments, candles, quoteMap } = useTerminal();
  const risk = RISK_SNAPSHOT;
  const [shock, setShock] = useState(-0.1);
  const [limits, setLimits] = useState(RISK_LIMITS);
  const [analysis, setAnalysis] = useState<InstrumentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [useGemini, setUseGemini] = useState(true);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);

  const cryptoList = useMemo(
    () => instruments.filter((i) => i.assetClass === "crypto"),
    [instruments]
  );

  const regimes = useMemo(() => illustrativeRegimes(60), []);
  const perfFromCandles = useMemo(() => {
    if (candles.length < 2) return sampleSeries(90, 100, 0.015);
    const base = candles[0].close || 1;
    return candles.map((c) => ({ t: c.time * 1000, v: (c.close / base) * 100 }));
  }, [candles]);

  const dd = useMemo(() => {
    if (candles.length < 2) {
      return sampleSeries(90, -0.02, 0.2).map((p) => ({ ...p, v: -Math.abs(p.v / 20) }));
    }
    let peak = candles[0].close;
    return candles.map((c) => {
      if (c.close > peak) peak = c.close;
      return { t: c.time * 1000, v: peak ? (c.close - peak) / peak : 0 };
    });
  }, [candles]);

  const vol = sampleSeries(90, 0.14, 0.05);
  const scenarioPnl = risk.marketValue * shock;
  const currentRegime = analysis?.regime ?? {
    label: regimes[regimes.length - 1].regime,
    confidence: regimes[regimes.length - 1].confidence,
  };

  const runScenario = () => {
    setLimits((prev) =>
      prev.map((l) => {
        if (l.metric === "dailyPnl") {
          const current = scenarioPnl;
          const status =
            current < l.limit ? "breach" : current < l.limit * 0.5 ? "warning" : "ok";
          return { ...l, current, status: status as "ok" | "warning" | "breach" };
        }
        return l;
      })
    );
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisNote(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selected.symbol,
          candles,
          useGemini,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        analysis?: InstrumentAnalysis;
        geminiConfigured?: boolean;
        error?: string;
      };
      if (!data.ok || !data.analysis) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);
      setAnalysisNote(
        data.geminiConfigured
          ? "Local QuantEdge tool + Gemini narrative (if enabled)."
          : "Local QuantEdge analysis tool (GEMINI_API_KEY not set — add free Google AI Studio key to enable Gemini)."
      );
    } catch (err) {
      setAnalysisNote(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const q = quoteMap.get(selected.symbol);

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-2 p-2">
      <div className="col-span-12 flex flex-wrap items-center gap-2">
        <Badge tone="amber">Portfolio VaR/limits remain illustrative; instrument analysis uses live candles when available</Badge>
        <Field label="Analyze security">
          <Select
            value={selected.symbol}
            onChange={(e) => selectSymbol(e.target.value, { stay: true })}
          >
            {cryptoList.map((ins) => (
              <option key={ins.id} value={ins.symbol}>
                {ins.symbol} — {ins.name}
              </option>
            ))}
            {instruments
              .filter((i) => i.assetClass !== "crypto")
              .map((ins) => (
                <option key={ins.id} value={ins.symbol}>
                  {ins.symbol} (simulated)
                </option>
              ))}
          </Select>
        </Field>
        <label className="flex items-center gap-1 text-[11px] text-qe-muted">
          <input
            type="checkbox"
            checked={useGemini}
            onChange={(e) => setUseGemini(e.target.checked)}
          />
          Use Gemini if configured
        </label>
        <Button variant="primary" disabled={analyzing} onClick={() => void runAnalysis()}>
          {analyzing ? "Analyzing…" : "Run analysis tool"}
        </Button>
        {q ? (
          <span className="font-mono text-xs text-qe-text">
            {selected.symbol} {q.last} ({q.changePct.toFixed(2)}%)
          </span>
        ) : null}
      </div>

      <Panel title={`Instrument analysis · ${selected.symbol}`} className="col-span-12 lg:col-span-5">
        {!analysis ? (
          <p className="text-xs text-qe-muted">
            Select a Coinbase security and click Run analysis tool. Uses the built-in QuantEdge
            local analyzer on live OHLC; optionally Google Gemini (free-tier API key) for narrative.
          </p>
        ) : (
          <div className="space-y-2 text-xs text-qe-text">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{analysis.source}</Badge>
              <Badge tone={analysis.freshness === "live" ? "green" : "amber"}>
                {analysis.freshness}
              </Badge>
              <Badge tone="blue">{analysis.regime.label.replaceAll("_", " ")}</Badge>
              <span className="font-mono text-qe-muted">
                conf {(analysis.regime.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Last" value={analysis.facts.last} />
              <Stat label="Window %" value={<PnL pct={analysis.facts.changePct} />} />
              <Stat
                label="Vol ann."
                value={`${(analysis.calculated.realizedVolAnn * 100).toFixed(1)}%`}
              />
              <Stat
                label="Max DD"
                value={<PnL pct={analysis.calculated.maxDrawdown * 100} />}
              />
              <Stat label="RSI(14)" value={analysis.calculated.rsi14 ?? "—"} />
              <Stat label="Mom 20" value={analysis.calculated.momentum20 ?? "—"} />
            </div>
            <ul className="list-disc space-y-1 pl-4 text-qe-muted">
              {analysis.regime.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-qe-border bg-qe-bg p-2 text-[11px]">
              {analysis.narrative}
            </pre>
            <p className="text-[10px] text-qe-muted">{analysis.limitations}</p>
            <p className="text-[10px] text-qe-muted">{analysis.regime.methodology}</p>
          </div>
        )}
        {analysisNote ? <p className="mt-2 text-[11px] text-qe-amber">{analysisNote}</p> : null}
      </Panel>

      <Panel title="Portfolio risk overview" className="col-span-12 lg:col-span-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Market value" value={`$${(risk.marketValue / 1e6).toFixed(2)}M`} />
          <Stat label="Daily P&L" value={<PnL value={risk.dailyPnl} />} />
          <Stat label="VaR 95% 1d" value={`$${(risk.var95 / 1000).toFixed(0)}k`} />
          <Stat label="ES 95% 1d" value={`$${(risk.es95 / 1000).toFixed(0)}k`} />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-qe-muted">{risk.methodology}</p>
      </Panel>

      <Panel title="Performance / drawdown (selected)" className="col-span-12 lg:col-span-4">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase text-qe-muted">
              Equity / price index {candles.length >= 2 ? "(live candles)" : "(sim)"}
            </div>
            <LineChart points={perfFromCandles} color="#0ecb81" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Drawdown</div>
            <LineChart points={dd} color="#f6465d" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Rolling vol (sim band)</div>
            <LineChart points={vol} color="#f0b90b" />
          </div>
        </div>
      </Panel>

      <Panel title="Correlation heatmap" className="col-span-12 lg:col-span-3">
        <Heatmap
          symbols={[
            selected.symbol,
            ...cryptoList.map((c) => c.symbol).filter((s) => s !== selected.symbol),
          ]}
        />
      </Panel>

      <Panel title="Market regime analysis" className="col-span-12 lg:col-span-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-qe-muted">Current estimated regime:</span>
          <Badge tone="blue">{String(currentRegime.label).replaceAll("_", " ")}</Badge>
          <span className="font-mono text-qe-muted">
            confidence {(Number(currentRegime.confidence) * 100).toFixed(0)}%
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
              const width = Math.max(
                4,
                ((r.end - r.start) /
                  (regimes[regimes.length - 1].end - regimes[0].start)) *
                  100
              );
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
        <p className="mt-2 text-[10px] text-qe-muted">
          {analysis ? analysis.regime.methodology : REGIME_METHOD}
        </p>
      </Panel>

      <Panel title="Scenario analysis" className="col-span-12 lg:col-span-4">
        <p className="mb-2 text-[11px] text-qe-muted">
          Hypothetical shock on simulated portfolio MV. Instrument analysis is separate.
        </p>
        <div className="flex flex-wrap gap-2">
          {[-0.05, -0.1, -0.2, 0.05].map((s) => (
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

"use client";

import { useMemo, useState } from "react";
import { INCIDENTS, SERVICES, sampleSeries } from "@/lib/quantedge/sampleData";
import type { Incident, IncidentSeverity, ServiceStatus } from "@/lib/quantedge/types";
import { Badge, Button, Panel, StatusDot } from "./ui";

function MiniSpark({ points, color }: { points: { t: number; v: number }[]; color: string }) {
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 1e-9);
  const w = 160;
  const h = 40;
  const d = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mt-1">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function SupportWorkspace() {
  const [incidents, setIncidents] = useState(INCIDENTS);
  const [severity, setSeverity] = useState<"all" | IncidentSeverity>("all");
  const [selectedApp, setSelectedApp] = useState(SERVICES[0].id);
  const [logs, setLogs] = useState<string[]>([
    "[SIM] 15:01:02 INFO  ledger-api health ok latency=48ms",
    "[SIM] 15:01:08 WARN  md-feed reconnect attempt=2 product=ETH-USD",
    "[SIM] 15:01:14 INFO  oms queue_depth=12 lag_ms=210",
    "[SIM] 15:01:22 ERROR md-feed websocket close code=1006",
    "[SIM] 15:01:30 INFO  md-feed restored products=3",
  ]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const filtered = useMemo(
    () => incidents.filter((i) => (severity === "all" ? true : i.severity === severity)),
    [incidents, severity]
  );

  const app = SERVICES.find((s) => s.id === selectedApp) ?? SERVICES[0];
  const latency = sampleSeries(40, 90, 0.08);
  const errors = sampleSeries(40, 0.4, 0.2);
  const throughput = sampleSeries(40, 1200, 0.05);

  const ack = (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "acknowledged" as const } : i))
    );
    setLogs((l) => [`[SIM] ${new Date().toISOString()} INFO  incident ${id} acknowledged`, ...l].slice(0, 40));
  };

  const simulateRestart = () => {
    setLogs((l) => [
      `[SIM] ${new Date().toISOString()} WARN  restart requested for ${app.id} (dry-run, no production action)`,
      ...l,
    ].slice(0, 40));
  };

  const askAi = () => {
    setAiAnswer(
      [
        "Summary (simulated AI assistant): INC-1042 correlates with md-feed reconnect warnings after the 09:10 deploy.",
        "Suggested checks: 1) WS heartbeat metrics 2) compare error budget burn 3) review runbook #runbook-md section 'reconnect storm'.",
        "Citations: simulated runbook index md-feed/reconnect.md; log lines 15:01:08–15:01:30. Do not treat as confirmed RCA.",
      ].join(" ")
    );
  };

  const healthTone = (s: ServiceStatus) =>
    s === "healthy" ? "green" : s === "degraded" ? "amber" : "red";

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-2 p-2">
      <div className="col-span-12">
        <Badge tone="neutral">All operational data in this workspace is simulated for prototype UI</Badge>
      </div>

      <Panel title="Application health" className="col-span-12 lg:col-span-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Availability" value="99.92%" tone="green" />
          <Metric label="Open incidents" value={String(incidents.filter((i) => i.status !== "resolved").length)} tone="amber" />
          <Metric label="API p95" value="128ms" tone="green" />
          <Metric label="Error rate" value="0.18%" tone="amber" />
          <Metric label="Queue depth" value="12" tone="neutral" />
          <Metric label="MD feed" value="degraded" tone="amber" />
        </div>
        <div className="mt-3 space-y-2">
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Latency (sim)</div>
            <MiniSpark points={latency} color="#3d8bfd" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Error rate (sim)</div>
            <MiniSpark points={errors} color="#f0b90b" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-qe-muted">Throughput (sim)</div>
            <MiniSpark points={throughput} color="#0ecb81" />
          </div>
        </div>
      </Panel>

      <Panel title="Service inventory" className="col-span-12 lg:col-span-4">
        <ul className="space-y-1">
          {SERVICES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedApp(s.id)}
                className={`flex w-full items-start justify-between rounded px-2 py-2 text-left text-xs hover:bg-qe-elevated ${
                  selectedApp === s.id ? "bg-qe-elevated" : ""
                }`}
              >
                <span>
                  <span className="flex items-center gap-2 font-medium text-qe-text">
                    <StatusDot status={s.status} />
                    {s.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-qe-muted">
                    {s.team} · {s.environment} · SLO {s.slo}%
                  </span>
                </span>
                <Badge tone={healthTone(s.status) as "green" | "amber" | "red"}>{s.status}</Badge>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded border border-qe-border bg-qe-bg p-2 text-[11px] text-qe-muted">
          <div>Owner: {app.owner}</div>
          <div>Deps: {app.dependencies.join(", ") || "—"}</div>
          <div>Last deploy: {app.lastDeploy}</div>
          <div>Runbook: {app.runbookUrl}</div>
        </div>
      </Panel>

      <Panel title="Operational controls" className="col-span-12 lg:col-span-4">
        <p className="mb-2 text-[11px] text-qe-amber">
          Prototype dry-run only. No production credentials or destructive actions from the browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={simulateRestart}>Request restart (sim)</Button>
          <Button onClick={() => setLogs((l) => [`[SIM] health check ${app.id} OK`, ...l])}>
            Health check
          </Button>
          <Button onClick={() => setLogs((l) => [`[SIM] queue inspect depth=12`, ...l])}>
            Inspect queue
          </Button>
          <Button onClick={askAi} variant="primary">
            AI support assist
          </Button>
        </div>
        {aiAnswer ? (
          <div className="mt-3 rounded border border-qe-accent/30 bg-qe-accent/10 p-2 text-[11px] text-qe-text">
            {aiAnswer}
          </div>
        ) : null}
        <div className="mt-3 max-h-40 overflow-auto rounded border border-qe-border bg-qe-bg p-2 font-mono text-[10px] text-qe-muted">
          {logs.map((line, i) => (
            <div key={`${line}-${i}`}>{line}</div>
          ))}
        </div>
      </Panel>

      <Panel title="Incident management" className="col-span-12">
        <div className="mb-2 flex flex-wrap gap-1">
          {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                severity === s ? "bg-qe-elevated text-qe-text" : "text-qe-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-qe-muted">
              <tr>
                <th className="py-1">ID</th>
                <th>Title</th>
                <th>Sev</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Age</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc: Incident) => (
                <tr key={inc.id} className="border-t border-qe-border text-qe-text">
                  <td className="py-1.5 font-mono">{inc.id}</td>
                  <td>{inc.title}</td>
                  <td>
                    <Badge tone={inc.severity === "critical" || inc.severity === "high" ? "red" : "amber"}>
                      {inc.severity}
                    </Badge>
                  </td>
                  <td>{inc.status}</td>
                  <td>{inc.owner}</td>
                  <td className="font-mono">{inc.ageMinutes}m</td>
                  <td>
                    {inc.status === "open" || inc.status === "investigating" ? (
                      <Button onClick={() => ack(inc.id)}>Ack</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "neutral";
}) {
  const color =
    tone === "green"
      ? "text-qe-green"
      : tone === "amber"
        ? "text-qe-amber"
        : tone === "red"
          ? "text-qe-red"
          : "text-qe-text";
  return (
    <div className="rounded border border-qe-border bg-qe-bg p-2">
      <div className="text-[10px] uppercase text-qe-muted">{label}</div>
      <div className={`font-mono text-sm ${color}`}>{value}</div>
    </div>
  );
}

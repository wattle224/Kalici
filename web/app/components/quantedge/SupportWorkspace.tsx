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
  const [selectedIncidentId, setSelectedIncidentId] = useState(INCIDENTS[0]?.id ?? "");
  const [logs, setLogs] = useState<string[]>([
    "[SIM] 15:01:02 INFO  ledger-api health ok latency=48ms",
    "[SIM] 15:01:08 WARN  md-feed reconnect attempt=2 product=ETH-USD",
    "[SIM] 15:01:14 INFO  oms queue_depth=12 lag_ms=210",
    "[SIM] 15:01:22 ERROR md-feed websocket close code=1006",
    "[SIM] 15:01:30 INFO  md-feed restored products=3",
  ]);
  const [cursorPrompt, setCursorPrompt] = useState<string | null>(null);
  const [cursorReply, setCursorReply] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => incidents.filter((i) => (severity === "all" ? true : i.severity === severity)),
    [incidents, severity]
  );

  const app = SERVICES.find((s) => s.id === selectedApp) ?? SERVICES[0];
  const incident =
    incidents.find((i) => i.id === selectedIncidentId) ??
    filtered[0] ??
    incidents[0];
  const latency = sampleSeries(40, 90, 0.08);
  const errors = sampleSeries(40, 0.4, 0.2);
  const throughput = sampleSeries(40, 1200, 0.05);

  const ack = (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "acknowledged" as const } : i))
    );
    setLogs((l) =>
      [`[SIM] ${new Date().toISOString()} INFO  incident ${id} acknowledged`, ...l].slice(0, 40)
    );
  };

  const simulateRestart = () => {
    setLogs((l) =>
      [
        `[SIM] ${new Date().toISOString()} WARN  restart requested for ${app.id} (dry-run, no production action)`,
        ...l,
      ].slice(0, 40)
    );
  };

  const openInCursor = async (target?: Incident) => {
    const inc = target ?? incident;
    if (!inc) return;
    setSelectedIncidentId(inc.id);
    setBusy(true);
    setAiStatus(null);
    try {
      const service = SERVICES.find((s) => s.id === inc.serviceId);
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: inc,
          service,
          logs,
          draftWithGemini: true,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        prompt?: string;
        cursorUrl?: string;
        draft?: string | null;
        geminiConfigured?: boolean;
        error?: string;
      };
      if (!data.ok || !data.prompt) throw new Error(data.error || "Failed to build prompt");
      setCursorPrompt(data.prompt);
      if (data.draft) setCursorReply(data.draft);
      await navigator.clipboard.writeText(data.prompt);
      window.open(data.cursorUrl || "https://cursor.com/agents", "_blank", "noopener,noreferrer");
      setAiStatus(
        data.geminiConfigured
          ? "Cursor prompt copied. Cursor Agents opened. Optional Gemini draft prefilled below — review before applying."
          : "Cursor prompt copied to clipboard and Cursor Agents opened. Paste Cursor's reply below, then Apply."
      );
      setLogs((l) =>
        [
          `[SIM] ${new Date().toISOString()} INFO  Cursor prompt generated for ${inc.id}`,
          ...l,
        ].slice(0, 40)
      );
    } catch (err) {
      setAiStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const applyCursorResponse = async () => {
    if (!incident || !cursorReply.trim()) return;
    setBusy(true);
    try {
      const service = SERVICES.find((s) => s.id === incident.serviceId);
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident,
          service,
          logs,
          cursorResponse: cursorReply,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        actions?: {
          checklist: string[];
          suggestedStatus?: "acknowledged" | "investigating" | "resolved";
          restartService?: boolean;
        } | null;
        error?: string;
      };
      if (!data.ok) throw new Error(data.error || "Parse failed");
      const actions = data.actions;
      if (actions?.checklist?.length) setChecklist(actions.checklist);
      if (actions?.suggestedStatus) {
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === incident.id ? { ...i, status: actions.suggestedStatus! } : i
          )
        );
      }
      if (actions?.restartService) simulateRestart();
      setAiStatus(
        "Applied Cursor response locally: checklist updated" +
          (actions?.suggestedStatus ? `, status -> ${actions.suggestedStatus}` : "") +
          (actions?.restartService ? ", dry-run restart queued" : "") +
          ". No production credentials used."
      );
      setLogs((l) =>
        [
          `[SIM] ${new Date().toISOString()} INFO  applied Cursor response for ${incident.id}`,
          ...l,
        ].slice(0, 40)
      );
    } catch (err) {
      setAiStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const healthTone = (s: ServiceStatus) =>
    s === "healthy" ? "green" : s === "degraded" ? "amber" : "red";

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-2 p-2">
      <div className="col-span-12">
        <Badge tone="neutral">
          Ops metrics are simulated. AI Support can open Cursor with a generated prompt; remediations stay dry-run.
        </Badge>
      </div>

      <Panel title="Application health" className="col-span-12 lg:col-span-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Availability" value="99.92%" tone="green" />
          <Metric
            label="Open incidents"
            value={String(incidents.filter((i) => i.status !== "resolved").length)}
            tone="amber"
          />
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

      <Panel title="AI Support Assistant (Cursor)" className="col-span-12 lg:col-span-4">
        <p className="mb-2 text-[11px] text-qe-muted">
          Generates a Cursor Cloud Agent prompt for the selected alert, copies it, opens Cursor, then
          lets you paste the reply so QuantEdge can apply checklist / dry-run actions.
        </p>
        <div className="mb-2 text-[11px] text-qe-text">
          Active alert: <span className="font-mono">{incident?.id ?? "—"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy || !incident} onClick={() => void openInCursor()}>
            Fix with Cursor
          </Button>
          <Button onClick={simulateRestart}>Restart (sim)</Button>
          <Button onClick={() => setLogs((l) => [`[SIM] health check ${app.id} OK`, ...l])}>
            Health check
          </Button>
        </div>
        {aiStatus ? (
          <div className="mt-2 rounded border border-qe-accent/30 bg-qe-accent/10 p-2 text-[11px] text-qe-text">
            {aiStatus}
          </div>
        ) : null}
        {cursorPrompt ? (
          <details className="mt-2 rounded border border-qe-border bg-qe-bg p-2 text-[10px] text-qe-muted">
            <summary className="cursor-pointer text-qe-text">Generated Cursor prompt</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">{cursorPrompt}</pre>
          </details>
        ) : null}
        <label className="mt-2 block text-[10px] uppercase text-qe-muted">
          Paste Cursor response
          <textarea
            value={cursorReply}
            onChange={(e) => setCursorReply(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded border border-qe-border bg-qe-panel p-2 font-mono text-[11px] text-qe-text"
            placeholder="Paste Cursor agent output here…"
          />
        </label>
        <Button
          className="mt-2"
          disabled={busy || !cursorReply.trim()}
          onClick={() => void applyCursorResponse()}
        >
          Apply Cursor response (dry-run)
        </Button>
        {checklist.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-qe-text">
            {checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 max-h-32 overflow-auto rounded border border-qe-border bg-qe-bg p-2 font-mono text-[10px] text-qe-muted">
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
                <tr
                  key={inc.id}
                  className={`border-t border-qe-border text-qe-text ${
                    selectedIncidentId === inc.id ? "bg-qe-elevated/60" : ""
                  }`}
                >
                  <td className="py-1.5 font-mono">
                    <button type="button" onClick={() => setSelectedIncidentId(inc.id)}>
                      {inc.id}
                    </button>
                  </td>
                  <td>{inc.title}</td>
                  <td>
                    <Badge
                      tone={
                        inc.severity === "critical" || inc.severity === "high" ? "red" : "amber"
                      }
                    >
                      {inc.severity}
                    </Badge>
                  </td>
                  <td>{inc.status}</td>
                  <td>{inc.owner}</td>
                  <td className="font-mono">{inc.ageMinutes}m</td>
                  <td className="space-x-1">
                    <Button onClick={() => void openInCursor(inc)}>Fix w/ Cursor</Button>
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

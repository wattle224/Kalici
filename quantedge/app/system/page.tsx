"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import {
  IntelligenceCube,
  type CubeFace,
} from "../components/three/IntelligenceCube";
import { ServiceGraph } from "../components/system/ServiceGraph";
import { ServiceDetail } from "../components/system/ServiceDetail";
import { IncidentsPanel } from "../components/system/IncidentsPanel";
import { SreAssistant } from "../components/system/SreAssistant";
import { InfraMetricsStrip } from "../components/system/InfraMetricsStrip";
import { useAppStore } from "../store/useAppStore";
import { SERVICES } from "../data/system";

export default function SystemWorkspace() {
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  useEffect(() => setWorkspace("system"), [setWorkspace]);

  const [serviceId, setServiceId] = useState<string | null>("oms");

  const groups = useMemo(() => {
    const byGroup = (g: string) =>
      SERVICES.filter((s) => s.group === g);
    return {
      app: byGroup("app"),
      oms: byGroup("oms"),
      exec: byGroup("exec"),
      md: byGroup("md"),
      data: byGroup("data"),
      report: byGroup("report"),
    };
  }, []);

  const faces: CubeFace[] = useMemo(() => {
    const summ = (ss: typeof SERVICES) => {
      const avg = ss.reduce((s, x) => s + x.availability, 0) / Math.max(1, ss.length);
      const deg = ss.filter((s) => s.status === "degraded").length;
      const fail = ss.filter((s) => s.status === "failed").length;
      const unk = ss.filter((s) => s.status === "unknown").length;
      return { avg, deg, fail, unk };
    };
    const s1 = summ(groups.app);
    const s2 = summ(groups.oms);
    const s3 = summ(groups.exec);
    const s4 = summ(groups.md);
    const s5 = summ(groups.data);
    const s6 = summ(groups.report);
    return [
      {
        code: "F1",
        title: "Application Health",
        accent: "#ffb4a6",
        metrics: [
          { label: "Services", value: `${groups.app.length}` },
          { label: "Avg availability", value: `${(s1.avg * 100).toFixed(2)}%`, tone: "good" },
          { label: "Degraded", value: `${s1.deg}`, tone: s1.deg ? "warn" : "good" },
          { label: "Primary", value: "api-gateway" },
        ],
      },
      {
        code: "F2",
        title: "Order Management",
        accent: "#ff8a7a",
        metrics: [
          { label: "Services", value: `${groups.oms.length}` },
          { label: "Avg availability", value: `${(s2.avg * 100).toFixed(2)}%`, tone: s2.avg >= 0.999 ? "good" : "warn" },
          { label: "p95 (oms-core)", value: "84 ms", tone: "warn" },
          { label: "Open orders", value: "2,140" },
        ],
      },
      {
        code: "F3",
        title: "Execution Services",
        accent: "#ffb4a6",
        metrics: [
          { label: "Venues", value: `${groups.exec.length - 1}` },
          { label: "Avg availability", value: `${(s3.avg * 100).toFixed(2)}%`, tone: s3.deg ? "warn" : "good" },
          { label: "Reject rate", value: "0.9%", tone: "warn" },
          { label: "Throughput", value: "1,890 ord/s" },
        ],
      },
      {
        code: "F4",
        title: "Market Data Feeds",
        accent: "#ff8a7a",
        metrics: [
          { label: "Feeds", value: `${groups.md.length}` },
          { label: "Avg availability", value: `${(s4.avg * 100).toFixed(2)}%`, tone: s4.deg ? "warn" : "good" },
          { label: "Tick rate", value: "71,120/s", tone: "good" },
          { label: "Backlog (lse p3)", value: "92 msgs", tone: "warn" },
        ],
      },
      {
        code: "F5",
        title: "Databases & Messaging",
        accent: "#ffb4a6",
        metrics: [
          { label: "Stores", value: `${groups.data.length}` },
          { label: "Avg availability", value: `${(s5.avg * 100).toFixed(2)}%`, tone: "good" },
          { label: "Kafka lag total", value: "112", tone: "good" },
          { label: "pg replica lag", value: "7.4s", tone: "warn" },
        ],
      },
      {
        code: "F6",
        title: "Reporting · Downstream",
        accent: "#ff8a7a",
        metrics: [
          { label: "Services", value: `${groups.report.length}` },
          { label: "Avg availability", value: `${(s6.avg * 100).toFixed(2)}%`, tone: s6.unk ? "warn" : "good" },
          { label: "Partners", value: s6.unk ? "1 unknown" : "ok", tone: s6.unk ? "warn" : "good" },
          { label: "Backlog", value: "7 reports" },
        ],
      },
    ];
  }, [groups]);

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-edge-crimson/30 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-edge-pale text-xs uppercase tracking-widest">
            WS-03 · System Intelligence & Monitoring
          </span>
          <span className="text-edge-dim text-xxs">
            SIMULATED DATA · trading-infra · click any node or face
          </span>
        </div>
        <div className="text-xxs text-edge-dim">
          <span className="text-edge-green">● 2 healthy groups</span> ·{" "}
          <span className="text-edge-amber">● 3 degraded</span> ·{" "}
          <span className="text-edge-salmon">● 0 failed</span>
        </div>
      </div>

      <div className="flex-shrink-0 h-[88px]">
        <InfraMetricsStrip />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-6 gap-2">
        <div className="col-start-1 col-span-5 row-start-1 row-span-4 min-h-0">
          <Panel
            title="Service Dependency Map"
            code="SRE-GRF"
            right="drag · zoom · click"
            className="h-full"
          >
            <ServiceGraph
              onPick={setServiceId}
              selectedId={serviceId}
            />
          </Panel>
        </div>

        <div className="col-start-6 col-span-4 row-start-1 row-span-4 min-h-0">
          <Panel
            title="Infrastructure Cube"
            code="SRE-CUB"
            right="6 faces · drag · zoom"
            className="h-full"
          >
            <IntelligenceCube
              faces={faces}
              title="INFRASTRUCTURE INTELLIGENCE CUBE"
            />
          </Panel>
        </div>

        <div className="col-start-10 col-span-3 row-start-1 row-span-6 min-h-0">
          <Panel
            title={`Service Dossier · ${serviceId ?? "—"}`}
            code="SRE-DET"
            className="h-full"
          >
            <ServiceDetail serviceId={serviceId} />
          </Panel>
        </div>

        <div className="col-start-1 col-span-5 row-start-5 row-span-2 min-h-0">
          <IncidentsPanel />
        </div>

        <div className="col-start-6 col-span-4 row-start-5 row-span-2 min-h-0">
          <Panel
            title="AI SRE Assistant"
            code="SRE-AI"
            right="evidence · runbooks"
            className="h-full"
          >
            <SreAssistant />
          </Panel>
        </div>
      </div>
    </div>
  );
}

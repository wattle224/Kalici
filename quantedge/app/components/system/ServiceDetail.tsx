"use client";

import { useEffect, useMemo, useState } from "react";
import { SERVICES, type Service } from "../../data/system";

function sparkline(seed: number, n = 40) {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  let v = 0.5;
  for (let i = 0; i < n; i++) {
    v = Math.max(0, Math.min(1, v + (rnd() - 0.5) * 0.14));
    out.push(v);
  }
  return out;
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 160;
  const h = 32;
  const path = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = (1 - v) * h;
      return (i === 0 ? "M" : "L") + x + "," + y;
    })
    .join(" ");
  return (
    <svg width={w} height={h}>
      <path d={path} stroke={color} fill="none" strokeWidth={1} />
    </svg>
  );
}

export function ServiceDetail({ serviceId }: { serviceId: string | null }) {
  const svc = useMemo(
    () => SERVICES.find((s) => s.id === serviceId) ?? null,
    [serviceId]
  );
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 2500);
    return () => clearInterval(i);
  }, []);
  const sparkSeed = useMemo(() => {
    let s = 1;
    for (const ch of (svc?.id ?? "x") + tick) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
    return s;
  }, [svc, tick]);
  const cpuSeries = useMemo(() => sparkline(sparkSeed, 60), [sparkSeed]);
  const latSeries = useMemo(() => sparkline(sparkSeed + 1, 60), [sparkSeed]);
  const rpsSeries = useMemo(() => sparkline(sparkSeed + 2, 60), [sparkSeed]);

  if (!svc) {
    return (
      <div className="p-4 text-xs text-edge-dim">
        Select a node on the graph or cube to open its operational dossier.
      </div>
    );
  }

  const colour =
    svc.status === "healthy"
      ? "text-edge-green"
      : svc.status === "degraded"
      ? "text-edge-amber"
      : svc.status === "failed"
      ? "text-edge-salmon"
      : "text-edge-dim";

  const rows: { k: string; v: string; t?: "good" | "warn" | "bad" }[] = [
    { k: "availability (1d)", v: `${(svc.availability * 100).toFixed(2)}%`, t: svc.availability >= 0.999 ? "good" : "warn" },
    { k: "p95 latency", v: `${svc.latencyMs.toFixed(1)} ms`, t: svc.latencyMs > 60 ? "warn" : "good" },
    { k: "cpu", v: `${(svc.cpu * 100).toFixed(0)}%`, t: svc.cpu > 0.75 ? "warn" : "good" },
    { k: "memory", v: `${(svc.mem * 100).toFixed(0)}%`, t: svc.mem > 0.75 ? "warn" : "good" },
    { k: "queue depth", v: `${svc.queueDepth}`, t: svc.queueDepth > 100 ? "warn" : "good" },
    { k: "rps", v: svc.rps.toLocaleString() },
    { k: "error rate", v: `${(svc.errorRate * 100).toFixed(3)}%`, t: svc.errorRate > 0.005 ? "bad" : "good" },
  ];

  return (
    <div className="p-3 text-xs overflow-auto scrollbar h-full">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-edge-pale text-sm">{svc.name}</div>
          <div className="text-xxs text-edge-dim uppercase">
            {svc.group} · {svc.id}
          </div>
        </div>
        <div className={"text-xs uppercase " + colour}>● {svc.status}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-xxs text-edge-dim">CPU</div>
          <Spark data={cpuSeries} color="#ffb4a6" />
        </div>
        <div>
          <div className="text-xxs text-edge-dim">LATENCY</div>
          <Spark data={latSeries} color="#ffb020" />
        </div>
        <div>
          <div className="text-xxs text-edge-dim">RPS</div>
          <Spark data={rpsSeries} color="#2fe08a" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 tabular">
        {rows.map((r) => (
          <div key={r.k} className="flex justify-between border-b border-edge-crimson/10 py-[2px]">
            <span className="text-edge-dim">{r.k}</span>
            <span
              className={
                r.t === "good"
                  ? "text-edge-green"
                  : r.t === "warn"
                  ? "text-edge-amber"
                  : r.t === "bad"
                  ? "text-edge-salmon"
                  : "text-edge-text"
              }
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="text-xxs text-edge-dim mb-1">UPSTREAM DEPENDENCIES</div>
        <div className="flex flex-wrap gap-1">
          {svc.deps.length === 0 && (
            <span className="text-edge-dim text-xxs">(leaf — no upstream)</span>
          )}
          {svc.deps.map((d) => (
            <span
              key={d}
              className="badge text-edge-pale"
              title={d}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xxs text-edge-dim mb-1">RECENT ACTIONS</div>
        <div className="text-xxs space-y-[2px]">
          <div>▸ auto-restart on exec-router-3 (T-00:12)</div>
          <div>▸ scaled replica 4 → 6 (T-00:34)</div>
          <div>▸ cache warm complete (T-01:02)</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="border border-edge-crimson/60 text-edge-pale px-3 py-1 text-xxs uppercase hover:bg-edge-crimson/15">
          Acknowledge
        </button>
        <button className="border border-edge-amber/50 text-edge-amber px-3 py-1 text-xxs uppercase hover:bg-edge-amber/10">
          Escalate
        </button>
        <button className="border border-edge-crimson/40 text-edge-dim px-3 py-1 text-xxs uppercase hover:text-edge-text">
          Simulate Failover
        </button>
      </div>
      <div className="mt-2 text-xxs text-edge-dim">
        Production write actions require 2-person approval + MFA + audit — simulated here.
      </div>
    </div>
  );
}

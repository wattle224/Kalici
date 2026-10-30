"use client";

import { Panel } from "../Panel";
import { SERVICES } from "../../data/system";

export function InfraMetricsStrip() {
  const feeds = SERVICES.filter((s) => s.group === "md");
  const feedUp = feeds.filter((s) => s.status === "healthy").length;
  const avail = SERVICES.reduce((s, x) => s + x.availability, 0) / SERVICES.length;
  const totalRps = SERVICES.reduce((s, x) => s + x.rps, 0);
  const err = SERVICES.reduce((s, x) => s + x.errorRate, 0) / SERVICES.length;
  const degraded = SERVICES.filter((s) => s.status === "degraded").length;
  const failed = SERVICES.filter((s) => s.status === "failed").length;

  const items = [
    { k: "Fleet availability", v: `${(avail * 100).toFixed(3)}%`, t: "good" },
    { k: "Services degraded", v: `${degraded}`, t: degraded ? "warn" : "good" },
    { k: "Services failed", v: `${failed}`, t: failed ? "bad" : "good" },
    { k: "Market-data feeds", v: `${feedUp}/${feeds.length}`, t: feedUp === feeds.length ? "good" : "warn" },
    { k: "Fleet RPS", v: totalRps.toLocaleString(), t: "info" },
    { k: "Avg error rate", v: `${(err * 100).toFixed(3)}%`, t: "info" },
    { k: "Active incidents", v: "4", t: "warn" },
  ];

  return (
    <Panel title="Operational Snapshot" code="SRE-OPS" right="updated · live">
      <div className="h-full flex items-stretch overflow-x-auto scrollbar">
        {items.map((i) => (
          <div
            key={i.k}
            className="flex-1 min-w-[150px] px-3 py-2 border-r border-edge-crimson/20"
          >
            <div className="text-edge-dim text-xxs uppercase">{i.k}</div>
            <div
              className={
                "tabular text-lg " +
                (i.t === "good"
                  ? "text-edge-green"
                  : i.t === "warn"
                  ? "text-edge-amber"
                  : i.t === "bad"
                  ? "text-edge-salmon"
                  : "text-edge-pale")
              }
            >
              {i.v}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

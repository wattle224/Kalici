"use client";

import { useState } from "react";

type Line = { role: "sys" | "user" | "ai"; text: string; evidence?: string[] };

function reply(prompt: string): Line {
  const p = prompt.toLowerCase();
  if (p.includes("oms") || p.includes("latency") || p.includes("INC-20471".toLowerCase())) {
    return {
      role: "ai",
      text:
        "Likely root cause for INC-20471 (oms-core p95 84ms): pg-oms replica lag spike at 03:12Z coincided with the latency rise, and risk-engine healthy. Suggest: fail over pg-oms replica, drain replica_3, verify with slow query log. Confluence runbook RUN-OMS-14 covers this.",
      evidence: [
        "metrics: pg-oms replica_lag 1.8s → 7.4s (T-00:46)",
        "trace: oms.store.save p95 65ms (prev 11ms)",
        "incident: INC-20471 ack'd by on-call 23m ago",
        "runbook: Confluence · RUN-OMS-14 · OMS p95 breach",
      ],
    };
  }
  if (p.includes("feed-lse") || p.includes("backlog") || p.includes("INC-20470".toLowerCase())) {
    return {
      role: "ai",
      text:
        "feed-lse partition 3 backlog is growing because consumer-group ‘md-lse’ has 1 unhealthy member. Signatures match RUN-MD-07 (consumer stuck on compressed-batch deserialisation). Suggest a rolling restart of pods md-lse-2 and md-lse-3.",
      evidence: [
        "kafka: partition 3 lag 92 → 1,420 msgs over 8 min",
        "k8s: pod md-lse-2 CPU idle 0.4%, no new offsets committed",
        "log: 'DecompressionException' x 11 in last 5 min",
        "runbook: Confluence · RUN-MD-07",
      ],
    };
  }
  if (p.includes("venue-lse") || p.includes("reject")) {
    return {
      role: "ai",
      text:
        "venue-lse reject rate 0.9% is 'TOO_MANY_REQUESTS' from the venue gateway. Over the last 10 min outgoing rate 240 msg/s exceeds negotiated 220 msg/s. Suggest throttling exec-router outbound to venue-lse to 200 msg/s pending a limit renegotiation.",
      evidence: [
        "exec-router metrics: lse_out_rate 240 (SLA 220)",
        "venue gateway responses: 'TOO_MANY_REQUESTS' x 112",
        "no latency anomaly on venue uplink",
      ],
    };
  }
  return {
    role: "ai",
    text:
      "Try: 'why is oms-core latency high?', 'feed-lse backlog cause?', or 'venue-lse rejects?' — I correlate metrics, traces, logs and Confluence.",
  };
}

export function SreAssistant() {
  const [log, setLog] = useState<Line[]>([
    { role: "sys", text: "AI SRE · evidence-cited · simulated · write-safe mode" },
    {
      role: "ai",
      text: "I correlate metrics, logs, traces, deploy events and runbooks. Describe a symptom or ask about an active incident.",
    },
  ]);
  const [q, setQ] = useState("");
  const submit = () => {
    const t = q.trim();
    if (!t) return;
    setLog((l) => [...l, { role: "user", text: t }, reply(t)]);
    setQ("");
  };
  return (
    <div className="h-full flex flex-col text-xs">
      <div className="flex-1 overflow-auto scrollbar p-2 space-y-2">
        {log.map((l, i) => (
          <div key={i} className="space-y-1">
            <div
              className={
                "text-xxs uppercase tracking-widest " +
                (l.role === "ai"
                  ? "text-edge-pale"
                  : l.role === "user"
                  ? "text-edge-amber"
                  : "text-edge-dim")
              }
            >
              {l.role === "ai" ? "AI · SRE" : l.role === "user" ? "YOU" : "SYSTEM"}
            </div>
            <div className="text-edge-text leading-snug">{l.text}</div>
            {l.evidence && (
              <div className="pl-3 border-l border-edge-crimson/40 text-xxs text-edge-dim space-y-[2px]">
                {l.evidence.map((e, j) => (
                  <div key={j}>▸ {e}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-edge-crimson/40 p-2 flex gap-2">
        <input
          className="flex-1 bg-bg-1 border border-edge-crimson/50 px-2 py-1 text-xs text-edge-text placeholder:text-edge-dim focus:outline-none focus:border-edge-pale"
          placeholder="e.g. 'why is oms-core latency high?' or 'feed-lse backlog cause?'"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          className="border border-edge-crimson text-edge-pale text-xxs px-3 hover:bg-edge-crimson/20"
        >
          INVESTIGATE
        </button>
      </div>
    </div>
  );
}

export type ServiceStatus = "healthy" | "degraded" | "failed" | "unknown";

export type Service = {
  id: string;
  name: string;
  group:
    | "app"
    | "oms"
    | "exec"
    | "md"
    | "data"
    | "report";
  status: ServiceStatus;
  availability: number; // 0..1
  latencyMs: number;
  cpu: number;
  mem: number;
  queueDepth: number;
  rps: number;
  errorRate: number;
  deps: string[];
};

export const SERVICES: Service[] = [
  { id: "gw", name: "api-gateway", group: "app", status: "healthy", availability: 0.9998, latencyMs: 24, cpu: 0.37, mem: 0.48, queueDepth: 12, rps: 8420, errorRate: 0.0004, deps: ["oms-core", "md-router", "sess-store"] },
  { id: "sess", name: "sess-store", group: "data", status: "healthy", availability: 0.9999, latencyMs: 3, cpu: 0.22, mem: 0.61, queueDepth: 0, rps: 11210, errorRate: 0.0001, deps: ["kv-primary"] },
  { id: "oms", name: "oms-core", group: "oms", status: "degraded", availability: 0.9961, latencyMs: 84, cpu: 0.71, mem: 0.73, queueDepth: 480, rps: 2130, errorRate: 0.012, deps: ["risk-engine", "exec-router", "pg-oms"] },
  { id: "risk", name: "risk-engine", group: "oms", status: "healthy", availability: 0.9994, latencyMs: 11, cpu: 0.44, mem: 0.52, queueDepth: 2, rps: 2130, errorRate: 0.0002, deps: ["pg-oms", "kv-primary"] },
  { id: "exec", name: "exec-router", group: "exec", status: "healthy", availability: 0.9991, latencyMs: 29, cpu: 0.58, mem: 0.49, queueDepth: 44, rps: 1890, errorRate: 0.0008, deps: ["venue-nyse", "venue-nasdaq", "venue-lse", "venue-xetra", "kafka-exec"] },
  { id: "vn", name: "venue-nyse", group: "exec", status: "healthy", availability: 0.9989, latencyMs: 18, cpu: 0.21, mem: 0.33, queueDepth: 3, rps: 740, errorRate: 0.0005, deps: [] },
  { id: "vq", name: "venue-nasdaq", group: "exec", status: "healthy", availability: 0.9994, latencyMs: 17, cpu: 0.19, mem: 0.31, queueDepth: 2, rps: 820, errorRate: 0.0004, deps: [] },
  { id: "vl", name: "venue-lse", group: "exec", status: "degraded", availability: 0.9972, latencyMs: 61, cpu: 0.42, mem: 0.44, queueDepth: 22, rps: 220, errorRate: 0.009, deps: [] },
  { id: "vx", name: "venue-xetra", group: "exec", status: "healthy", availability: 0.9986, latencyMs: 22, cpu: 0.24, mem: 0.32, queueDepth: 1, rps: 180, errorRate: 0.0007, deps: [] },
  { id: "md", name: "md-router", group: "md", status: "healthy", availability: 0.9997, latencyMs: 6, cpu: 0.65, mem: 0.57, queueDepth: 11, rps: 71000, errorRate: 0.00005, deps: ["feed-nyse", "feed-nasdaq", "feed-lse", "feed-tse", "feed-cme"] },
  { id: "fn", name: "feed-nyse", group: "md", status: "healthy", availability: 0.9996, latencyMs: 2.1, cpu: 0.33, mem: 0.44, queueDepth: 0, rps: 24000, errorRate: 0.00002, deps: [] },
  { id: "fq", name: "feed-nasdaq", group: "md", status: "healthy", availability: 0.9997, latencyMs: 1.8, cpu: 0.31, mem: 0.42, queueDepth: 0, rps: 26000, errorRate: 0.00002, deps: [] },
  { id: "fl", name: "feed-lse", group: "md", status: "degraded", availability: 0.9929, latencyMs: 14, cpu: 0.27, mem: 0.39, queueDepth: 92, rps: 6400, errorRate: 0.004, deps: [] },
  { id: "ft", name: "feed-tse", group: "md", status: "healthy", availability: 0.9994, latencyMs: 4.5, cpu: 0.22, mem: 0.33, queueDepth: 1, rps: 7800, errorRate: 0.0001, deps: [] },
  { id: "fc", name: "feed-cme", group: "md", status: "healthy", availability: 0.9992, latencyMs: 3.1, cpu: 0.19, mem: 0.3, queueDepth: 0, rps: 6800, errorRate: 0.0001, deps: [] },
  { id: "pg", name: "pg-oms", group: "data", status: "healthy", availability: 0.9993, latencyMs: 7, cpu: 0.49, mem: 0.68, queueDepth: 4, rps: 3100, errorRate: 0.0003, deps: [] },
  { id: "kv", name: "kv-primary", group: "data", status: "healthy", availability: 0.9999, latencyMs: 1.1, cpu: 0.3, mem: 0.55, queueDepth: 0, rps: 42000, errorRate: 0.00001, deps: [] },
  { id: "ke", name: "kafka-exec", group: "data", status: "healthy", availability: 0.9995, latencyMs: 4, cpu: 0.4, mem: 0.6, queueDepth: 112, rps: 9400, errorRate: 0.00008, deps: [] },
  { id: "rpt", name: "report-service", group: "report", status: "healthy", availability: 0.9988, latencyMs: 48, cpu: 0.18, mem: 0.34, queueDepth: 7, rps: 42, errorRate: 0.0006, deps: ["pg-oms", "kafka-exec"] },
  { id: "ds", name: "downstream-regs", group: "report", status: "unknown", availability: 0, latencyMs: 0, cpu: 0, mem: 0, queueDepth: 0, rps: 0, errorRate: 0, deps: ["report-service"] },
];

export type Incident = {
  id: string;
  service: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  status: "open" | "ack" | "resolved";
  summary: string;
  openedAt: string;
};

export const INCIDENTS: Incident[] = [
  { id: "INC-20471", service: "oms-core", severity: "SEV2", status: "ack", summary: "p95 latency 84ms (SLO 60ms) — pg-oms replica lag suspected", openedAt: "T-00:42" },
  { id: "INC-20470", service: "feed-lse", severity: "SEV2", status: "open", summary: "Backlog growing on LSE feed partition 3", openedAt: "T-01:14" },
  { id: "INC-20468", service: "venue-lse", severity: "SEV3", status: "open", summary: "Reject rate 0.9% — gateway 'TOO_MANY_REQUESTS'", openedAt: "T-02:08" },
  { id: "INC-20463", service: "downstream-regs", severity: "SEV3", status: "ack", summary: "Reg-reporting partner heartbeat not received", openedAt: "T-03:51" },
];

export const DEPLOYMENTS = [
  { id: "D-9142", service: "oms-core", ts: "T-00:58", by: "release-bot", status: "success", version: "4.11.2" },
  { id: "D-9141", service: "md-router", ts: "T-04:21", by: "a.hughes", status: "success", version: "6.3.0" },
  { id: "D-9140", service: "risk-engine", ts: "T-09:03", by: "release-bot", status: "success", version: "2.19.0" },
  { id: "D-9139", service: "report-service", ts: "T-11:47", by: "d.chen", status: "rolled-back", version: "1.8.1" },
];

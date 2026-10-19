import type { Incident, AppService } from "./types";

/** Build a Cursor Cloud Agent / Composer prompt for an ops incident. */
export function buildCursorIncidentPrompt(
  incident: Incident,
  service: AppService | undefined,
  logs: string[]
): string {
  const svc = service?.name ?? incident.serviceId;
  return [
    "You are assisting Institutional AI Trading (QuantEdge / Kalici) production support.",
    "Act as an SRE: diagnose, propose a safe remediation plan, and list concrete file/API checks.",
    "Do NOT claim production changes were applied unless evidence is provided.",
    "Keep secrets out of the browser; prefer dry-run / config review steps.",
    "",
    "## Incident",
    `- ID: ${incident.id}`,
    `- Title: ${incident.title}`,
    `- Severity: ${incident.severity}`,
    `- Status: ${incident.status}`,
    `- Owner: ${incident.owner}`,
    `- Age (minutes): ${incident.ageMinutes}`,
    `- Impact: ${incident.impact}`,
    `- Service id: ${incident.serviceId}`,
    "",
    "## Service inventory (simulated catalog)",
    service
      ? [
          `- Name: ${svc}`,
          `- Criticality: ${service.criticality}`,
          `- Team: ${service.team}`,
          `- Environment: ${service.environment}`,
          `- Status: ${service.status}`,
          `- Dependencies: ${service.dependencies.join(", ") || "none"}`,
          `- Last deploy: ${service.lastDeploy}`,
          `- Runbook: ${service.runbookUrl}`,
          `- SLO: ${service.slo}%`,
        ].join("\n")
      : `- Service ${incident.serviceId} not in inventory`,
    "",
    "## Recent simulated log lines",
    ...logs.slice(0, 12).map((l) => `- ${l}`),
    "",
    "## Required output format",
    "1. Summary (facts only)",
    "2. Likely causes (ranked, with uncertainty)",
    "3. Investigation checklist (commands / UI paths in this repo)",
    "4. Safe remediation steps (dry-run first; mark anything that needs approval)",
    "5. Verification: how to confirm recovery",
    "6. Cursor follow-ups: exact file paths under web/ and backend/ to inspect",
    "",
    "Repository: wattle224/Kalici — QuantEdge Terminal front end + IAM ledger on :8000.",
  ].join("\n");
}

export function parseCursorActions(responseText: string): {
  checklist: string[];
  suggestedStatus?: "acknowledged" | "investigating" | "resolved";
  restartService?: boolean;
} {
  const lines = responseText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const checklist = lines
    .filter((l) => /^[-*]\s+|^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .slice(0, 12);

  const lower = responseText.toLowerCase();
  let suggestedStatus: "acknowledged" | "investigating" | "resolved" | undefined;
  if (lower.includes("mark resolved") || lower.includes("status: resolved")) {
    suggestedStatus = "resolved";
  } else if (lower.includes("investigating")) {
    suggestedStatus = "investigating";
  } else if (lower.includes("acknowledge")) {
    suggestedStatus = "acknowledged";
  }

  const restartService =
    lower.includes("restart") &&
    (lower.includes("service") || lower.includes("md-feed") || lower.includes("oms"));

  return { checklist, suggestedStatus, restartService };
}

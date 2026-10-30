"use client";

import { INCIDENTS, DEPLOYMENTS } from "../../data/system";
import { Panel } from "../Panel";

export function IncidentsPanel() {
  return (
    <Panel title="Active Incidents" code="SRE-INC" right="live">
      <div className="h-full overflow-auto scrollbar">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-xxs text-edge-dim">
              <th className="text-left px-2 py-1">ID</th>
              <th className="text-left px-2 py-1">SEV</th>
              <th className="text-left px-2 py-1">SVC</th>
              <th className="text-left px-2 py-1">SUMMARY</th>
              <th className="text-right px-2 py-1">AGE</th>
              <th className="text-right px-2 py-1">STATE</th>
            </tr>
          </thead>
          <tbody>
            {INCIDENTS.map((i) => (
              <tr key={i.id} className="border-b border-edge-crimson/10">
                <td className="px-2 py-[3px] text-edge-dim">{i.id}</td>
                <td
                  className={
                    "px-2 py-[3px] " +
                    (i.severity === "SEV1"
                      ? "text-edge-salmon"
                      : i.severity === "SEV2"
                      ? "text-edge-amber"
                      : "text-edge-pale")
                  }
                >
                  {i.severity}
                </td>
                <td className="px-2 py-[3px] text-edge-text">{i.service}</td>
                <td className="px-2 py-[3px] text-edge-text">{i.summary}</td>
                <td className="px-2 py-[3px] text-right text-edge-dim">
                  {i.openedAt}
                </td>
                <td
                  className={
                    "px-2 py-[3px] text-right uppercase " +
                    (i.status === "open"
                      ? "text-edge-salmon"
                      : i.status === "ack"
                      ? "text-edge-amber"
                      : "text-edge-green")
                  }
                >
                  {i.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 border-t border-edge-crimson/30">
          <div className="text-xxs text-edge-crimson/80 px-2 py-1 uppercase">
            Deployments
          </div>
          <table className="w-full text-xs tabular">
            <tbody>
              {DEPLOYMENTS.map((d) => (
                <tr key={d.id} className="border-b border-edge-crimson/5">
                  <td className="px-2 py-[2px] text-edge-dim">{d.id}</td>
                  <td className="px-2 py-[2px] text-edge-text">{d.service}</td>
                  <td className="px-2 py-[2px] text-edge-dim">{d.version}</td>
                  <td className="px-2 py-[2px] text-edge-dim">{d.by}</td>
                  <td
                    className={
                      "px-2 py-[2px] text-right uppercase " +
                      (d.status === "success"
                        ? "text-edge-green"
                        : "text-edge-salmon")
                    }
                  >
                    {d.status}
                  </td>
                  <td className="px-2 py-[2px] text-right text-edge-dim">
                    {d.ts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

"use client";

import { Panel } from "../Panel";
import { CENTRES } from "../../data/markets";

export function SessionsBar() {
  return (
    <Panel title="Active Exchange Sessions" code="MKT-SES" right="UTC">
      <div className="p-2 h-full overflow-auto scrollbar">
        {CENTRES.map((c) => (
          <div
            key={c.id}
            className="flex items-center text-xxs border-b border-edge-crimson/10 py-[3px]"
          >
            <span className="w-20 text-edge-dim">{c.city}</span>
            <span className="w-28 text-edge-text">{c.exchange}</span>
            <span
              className={
                "w-16 uppercase " +
                (c.session === "open"
                  ? "text-edge-green"
                  : c.session === "closed"
                  ? "text-edge-salmon"
                  : "text-edge-amber")
              }
            >
              ● {c.session}
            </span>
            <div className="flex-1 relative h-[6px] bg-edge-crimson/10 ml-2">
              <div
                className="absolute top-0 bottom-0 bg-edge-crimson/70"
                style={{ width: `${c.activity * 100}%` }}
              />
            </div>
            <span className="ml-2 w-10 text-right text-edge-pale">
              {(c.activity * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

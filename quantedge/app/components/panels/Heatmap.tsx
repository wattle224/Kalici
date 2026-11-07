"use client";

import { Panel } from "../Panel";
import { Fragment, useMemo } from "react";

export function Heatmap() {
  const cells = useMemo(() => {
    const sectors = [
      "Tech",
      "Fin",
      "Energy",
      "Health",
      "Cons",
      "Ind",
      "Mat",
      "Util",
      "Comm",
      "RE",
      "Stap",
      "Discr",
    ];
    const regions = ["US", "EU", "UK", "JP", "HK", "SG"];
    let s = 42;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return regions.map((r) => ({
      r,
      cells: sectors.map((sec) => ({
        sec,
        v: (rnd() - 0.5) * 4,
      })),
    }));
  }, []);

  return (
    <Panel title="Global Financial Activity Heatmap" code="MKT-HEAT">
      <div className="p-2 h-full overflow-auto scrollbar">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[48px_repeat(12,1fr)] gap-[2px] text-xxs">
            <div />
            {["Tech","Fin","Energy","Health","Cons","Ind","Mat","Util","Comm","RE","Stap","Discr"].map((s) => (
              <div key={s} className="text-edge-dim text-center">{s}</div>
            ))}
            {cells.map((row) => (
              <Fragment key={row.r}>
                <div className="text-edge-dim text-center self-center">
                  {row.r}
                </div>
                {row.cells.map((c, i) => {
                  const pos = c.v >= 0;
                  const a = Math.min(1, Math.abs(c.v) / 3);
                  const bg = pos
                    ? `rgba(47,224,138,${0.15 + a * 0.6})`
                    : `rgba(255,138,122,${0.15 + a * 0.6})`;
                  return (
                    <div
                      key={row.r + i}
                      className="h-7 flex items-center justify-center text-[9px] tabular"
                      style={{
                        background: bg,
                        color: pos ? "#dafff0" : "#ffe8e2",
                      }}
                    >
                      {c.v >= 0 ? "+" : ""}
                      {c.v.toFixed(1)}%
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { fmtClock } from "../lib/format";

const WORKSPACES: {
  id: "global" | "trading" | "system";
  label: string;
  href: string;
  code: string;
}[] = [
  { id: "global", label: "Global Market Intelligence", href: "/", code: "WS-01" },
  { id: "trading", label: "Trading & Portfolio", href: "/trading", code: "WS-02" },
  { id: "system", label: "System Intelligence", href: "/system", code: "WS-03" },
];

export function TopBar() {
  const path = usePathname();
  const instrument = useAppStore((s) => s.selectedInstrument);
  const notifications = useAppStore((s) => s.notifications);
  const latency = useAppStore((s) => s.latencyMs);

  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    setClock(fmtClock());
    const i = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(i);
  }, []);

  const activeId: "global" | "trading" | "system" =
    path?.startsWith("/trading")
      ? "trading"
      : path?.startsWith("/system")
      ? "system"
      : "global";

  const crits = notifications.filter((n) => n.level === "crit").length;
  const warns = notifications.filter((n) => n.level === "warn").length;

  return (
    <header className="absolute inset-x-0 top-0 h-[52px] z-20 flex items-center border-b border-edge-crimson/60 bg-bg-0/90 backdrop-blur">
      <div className="flex items-center gap-3 pl-4 pr-6 border-r border-edge-crimson/40 h-full">
        <div className="relative">
          <div className="h-7 w-7 border border-edge-crimson relative">
            <div className="absolute inset-[2px] border border-edge-salmon/60" />
            <div className="absolute inset-[5px] bg-edge-crimson/70" />
          </div>
          <div className="absolute -right-1 -top-1 h-2 w-2 bg-edge-green animate-pulse2" />
        </div>
        <div className="leading-tight">
          <div className="text-edge-pale tracking-[0.22em] text-[11px]">
            QUANTEDGE
          </div>
          <div className="text-edge-dim text-[9px] tracking-widest">
            INTELLIGENCE // v0.1.0
          </div>
        </div>
      </div>

      <nav className="flex h-full">
        {WORKSPACES.map((w) => {
          const active = w.id === activeId;
          return (
            <Link
              key={w.id}
              href={w.href}
              className={
                "relative px-5 h-full flex items-center gap-3 border-r border-edge-crimson/30 text-[11px] uppercase tracking-[0.18em] " +
                (active
                  ? "bg-edge-crimson/15 text-edge-pale"
                  : "text-edge-dim hover:text-edge-text hover:bg-edge-crimson/5")
              }
            >
              <span className="text-edge-crimson/80 text-xxs">{w.code}</span>
              <span>{w.label}</span>
              {active && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-edge-crimson" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center h-full">
        <div className="hidden md:flex items-center gap-2 px-4 border-l border-edge-crimson/30 h-full">
          <span className="text-xxs text-edge-dim">INSTRUMENT</span>
          <span className="text-edge-pale text-sm">{instrument.symbol}</span>
          <span className="text-edge-dim text-xxs">{instrument.venue}</span>
          <span
            className={
              "text-xxs tabular " +
              (instrument.chg >= 0 ? "text-edge-green" : "text-edge-salmon")
            }
          >
            {instrument.chg >= 0 ? "+" : ""}
            {instrument.chg.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-2 px-4 border-l border-edge-crimson/30 h-full">
          <span className="text-xxs text-edge-dim">LAT</span>
          <span className="text-edge-pale tabular text-xs">{latency}ms</span>
        </div>

        <div className="flex items-center gap-2 px-4 border-l border-edge-crimson/30 h-full">
          {crits > 0 && (
            <span className="badge text-edge-salmon">CRIT {crits}</span>
          )}
          {warns > 0 && (
            <span className="badge text-edge-amber">WARN {warns}</span>
          )}
          <span className="badge text-edge-green">OK</span>
        </div>

        <div className="flex items-center gap-2 px-4 border-l border-edge-crimson/30 h-full">
          <span className="text-xxs text-edge-dim">UTC</span>
          <span className="text-edge-text tabular text-xs">{clock}</span>
        </div>
      </div>
    </header>
  );
}

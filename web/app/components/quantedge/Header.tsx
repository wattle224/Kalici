"use client";

import {
  Bell,
  Command,
  Search,
  Settings,
  User,
  Activity,
  Circle,
} from "lucide-react";
import clsx from "clsx";
import { useTerminal } from "@/lib/quantedge/TerminalContext";
import { Badge, Button, FreshnessBadge } from "./ui";
import type { WorkspaceId } from "@/lib/quantedge/types";

const TABS: { id: WorkspaceId; label: string }[] = [
  { id: "trading", label: "Trading & Analysis" },
  { id: "support", label: "Technical Support & Monitoring" },
  { id: "risk", label: "Risk & Regime Analysis" },
];

export default function Header() {
  const {
    workspace,
    setWorkspace,
    search,
    setSearch,
    selectSymbol,
    feedStatus,
    sessionLabel,
    selected,
    setCommandOpen,
    dataAsOf,
    tickerFreshness,
  } = useTerminal();

  return (
    <header className="shrink-0 border-b border-qe-border bg-qe-panel">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex items-center gap-2 pr-3 border-r border-qe-border">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-qe-accent/20 text-[11px] font-bold text-qe-accent">
            QE
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-qe-text">
              QuantEdge Terminal
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-qe-muted">
              Institutional AI Trading
            </div>
          </div>
        </div>

        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-qe-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                selectSymbol(search.trim().toUpperCase());
                setSearch("");
              }
            }}
            placeholder="Search ticker, name, ISIN, asset class…"
            className="w-full rounded border border-qe-border bg-qe-bg py-1.5 pl-8 pr-16 text-xs text-qe-text outline-none focus:border-qe-accent"
          />
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-qe-border px-1.5 py-0.5 text-[10px] text-qe-muted"
            title="Command palette (Ctrl+K)"
          >
            <Command className="h-3 w-3" />K
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px]">
          <Badge tone="blue">{selected.exchange}</Badge>
          <span className="font-mono text-qe-text">{selected.symbol}</span>
          <Badge>{sessionLabel}</Badge>
          <span className="inline-flex items-center gap-1 text-qe-muted">
            <Circle
              className={clsx(
                "h-2.5 w-2.5 fill-current",
                feedStatus === "connected" && "text-qe-green",
                feedStatus === "degraded" && "text-qe-amber",
                feedStatus === "disconnected" && "text-qe-red"
              )}
            />
            Feed {feedStatus}
          </span>
          <FreshnessBadge freshness={tickerFreshness} />
          {dataAsOf ? (
            <span className="hidden font-mono text-qe-muted lg:inline" suppressHydrationWarning>
              {new Date(dataAsOf).toLocaleTimeString("en-GB", { hour12: false })}
            </span>
          ) : null}
          <Button onClick={() => setCommandOpen(true)} className="!py-1">
            <Activity className="mr-1 inline h-3 w-3" />
            Alerts
          </Button>
          <Button className="!py-1" aria-label="Notifications">
            <Bell className="h-3.5 w-3.5" />
          </Button>
          <Button className="!py-1" aria-label="Settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button className="!py-1" aria-label="Profile">
            <User className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 px-3 pb-2" aria-label="Primary workspaces">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setWorkspace(tab.id)}
            className={clsx(
              "rounded px-3 py-1.5 text-xs font-medium transition",
              workspace === tab.id
                ? "bg-qe-elevated text-qe-text shadow-panel"
                : "text-qe-muted hover:bg-qe-elevated/60 hover:text-qe-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import type { DataFreshness, ServiceStatus } from "@/lib/quantedge/types";

export function Panel({
  title,
  right,
  children,
  className,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "flex min-h-0 flex-col overflow-hidden rounded border border-qe-border bg-qe-panel",
        className
      )}
    >
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 border-b border-qe-border px-3 py-2">
          {title ? (
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-qe-muted">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {right}
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "red" | "amber" | "blue";
}) {
  const tones = {
    neutral: "bg-qe-elevated text-qe-muted border-qe-border",
    green: "bg-qe-green/15 text-qe-green border-qe-green/30",
    red: "bg-qe-red/15 text-qe-red border-qe-red/30",
    amber: "bg-qe-amber/15 text-qe-amber border-qe-amber/30",
    blue: "bg-qe-accent/15 text-qe-accent border-qe-accent/30",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function FreshnessBadge({ freshness }: { freshness: DataFreshness | "mixed" }) {
  if (freshness === "live") return <Badge tone="green">Live</Badge>;
  if (freshness === "delayed") return <Badge tone="amber">Delayed</Badge>;
  if (freshness === "mixed") return <Badge tone="amber">Mixed</Badge>;
  return <Badge tone="neutral">Simulated</Badge>;
}

export function StatusDot({ status }: { status: ServiceStatus }) {
  const color =
    status === "healthy"
      ? "bg-qe-green"
      : status === "degraded"
        ? "bg-qe-amber"
        : status === "maintenance"
          ? "bg-qe-accent"
          : "bg-qe-red";
  return <span className={clsx("inline-block h-2 w-2 rounded-full", color)} />;
}

export function PnL({ value, pct }: { value?: number; pct?: number }) {
  const v = pct ?? value ?? 0;
  const positive = v > 0;
  const negative = v < 0;
  return (
    <span
      className={clsx(
        "font-mono tabular-nums",
        positive && "text-qe-green",
        negative && "text-qe-red",
        !positive && !negative && "text-qe-muted"
      )}
    >
      {pct != null
        ? `${positive ? "+" : ""}${pct.toFixed(2)}%`
        : `${positive ? "+" : ""}${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "primary" | "danger" | "buy" | "sell";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const variants = {
    ghost: "border-qe-border bg-qe-elevated text-qe-text hover:border-qe-muted",
    primary: "border-qe-accent/40 bg-qe-accent/20 text-qe-accent hover:bg-qe-accent/30",
    danger: "border-qe-red/40 bg-qe-red/15 text-qe-red",
    buy: "border-qe-green/40 bg-qe-green/20 text-qe-green",
    sell: "border-qe-red/40 bg-qe-red/20 text-qe-red",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "rounded border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-qe-muted">
      <span className="uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded border border-qe-border bg-qe-bg px-2 py-1.5 font-mono text-xs text-qe-text outline-none focus:border-qe-accent",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded border border-qe-border bg-qe-bg px-2 py-1.5 text-xs text-qe-text outline-none focus:border-qe-accent",
        props.className
      )}
    />
  );
}

"use client";

import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";
import { BottomTicker } from "./BottomTicker";
import { useAppStore } from "../store/useAppStore";

export function Shell({ children }: { children: React.ReactNode }) {
  const setLatency = useAppStore((s) => s.setLatency);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const tickTicker = useAppStore((s) => s.tickTicker);
  const ticker = useAppStore((s) => s.ticker);

  useEffect(() => {
    const i = setInterval(() => {
      setLatency(18 + Math.floor(Math.random() * 20));
    }, 2000);
    return () => clearInterval(i);
  }, [setLatency]);

  useEffect(() => {
    const i = setInterval(() => {
      tickTicker(
        ticker.map((t) => {
          if (typeof t.chg !== "number") return t;
          const drift = (Math.random() - 0.5) * 0.12;
          const chg = +(t.chg + drift).toFixed(2);
          const v = t.value
            ? (+t.value.replace(/,/g, "") * (1 + drift / 100)).toFixed(
                t.value.includes(".") ? 2 : 0
              )
            : t.value;
          return { ...t, chg, value: v };
        })
      );
    }, 2500);
    return () => clearInterval(i);
  }, [tickTicker, ticker]);

  useEffect(() => {
    const i = setInterval(() => {
      const pool = [
        { source: "md-router", text: "feed-tse p99 spike 12ms (<30 SLO)", level: "info" as const },
        { source: "oms-core", text: "order burst 2,140 msg/s — queue 480", level: "warn" as const },
        { source: "risk-engine", text: "VaR 1D 1.42M (budget 1.80M)", level: "info" as const },
        { source: "exec-router", text: "venue-lse reject rate 0.9%", level: "warn" as const },
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      pushNotification(pick);
    }, 14000);
    return () => clearInterval(i);
  }, [pushNotification]);

  return (
    <div className="relative h-screen w-screen overflow-hidden text-edge-text">
      <div className="scanlines absolute inset-0 pointer-events-none" />
      <TopBar />
      <main className="absolute inset-x-0 top-[52px] bottom-[70px] overflow-hidden">
        {children}
      </main>
      <StatusBar />
      <BottomTicker />
    </div>
  );
}

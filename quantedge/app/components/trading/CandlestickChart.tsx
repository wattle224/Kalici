"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { genCandles, sma, rsi, type Candle } from "../../lib/simData";

type Props = {
  symbol: string;
  seedBase?: number;
  compare?: string[];
};

export function CandlestickChart({ symbol, seedBase = 101, compare = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; c: Candle } | null>(null);
  const [tick, setTick] = useState(0);

  const seed = useMemo(() => {
    let s = 0;
    for (const ch of symbol) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
    return s + seedBase;
  }, [symbol, seedBase]);

  const data = useMemo(() => genCandles(seed, 160, 100 + (seed % 80)), [seed, tick]);
  const sma20 = useMemo(() => sma(data, 20), [data]);
  const sma50 = useMemo(() => sma(data, 50), [data]);
  const r = useMemo(() => rsi(data, 14), [data]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 2500);
    return () => clearInterval(i);
  }, []);

  const compareData = useMemo(
    () =>
      compare.map((sym) => {
        let s = 0;
        for (const ch of sym) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
        return { sym, candles: genCandles(s + seedBase + 7, 160, 100 + (s % 80)) };
      }),
    [compare, seedBase]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 48;
    const padR = 10;
    const padT = 10;
    const padB = 70;
    const chartH = H - padT - padB;
    const n = data.length;

    const highs = data.map((d) => d.h);
    const lows = data.map((d) => d.l);
    const hi = Math.max(...highs);
    const lo = Math.min(...lows);
    const span = hi - lo || 1;
    const px = (i: number) => padL + ((W - padL - padR) * i) / (n - 1);
    const py = (v: number) => padT + (1 - (v - lo) / span) * chartH;

    ctx.fillStyle = "#060608";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(160,19,36,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = padT + (chartH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = "#6b6b76";
      ctx.font = "10px JetBrains Mono, monospace";
      const v = hi - (span * i) / 5;
      ctx.fillText(v.toFixed(2), 4, y + 3);
    }

    const bw = Math.max(1.5, (W - padL - padR) / n - 1);
    data.forEach((d, i) => {
      const x = px(i);
      const up = d.c >= d.o;
      ctx.strokeStyle = up ? "#2fe08a" : "#ff8a7a";
      ctx.fillStyle = up ? "rgba(47,224,138,0.85)" : "rgba(255,138,122,0.85)";
      ctx.beginPath();
      ctx.moveTo(x, py(d.h));
      ctx.lineTo(x, py(d.l));
      ctx.stroke();
      const yO = py(d.o);
      const yC = py(d.c);
      ctx.fillRect(x - bw / 2, Math.min(yO, yC), bw, Math.max(1, Math.abs(yC - yO)));
    });

    const drawLine = (arr: (number | null)[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      arr.forEach((v, i) => {
        if (v == null) return;
        const x = px(i);
        const y = py(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    drawLine(sma20, "#ffb4a6");
    drawLine(sma50, "#a01324");

    const supp = Math.min(...data.slice(-40).map((d) => d.l));
    const res = Math.max(...data.slice(-40).map((d) => d.h));
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(255,180,166,0.6)";
    ctx.beginPath();
    ctx.moveTo(padL, py(supp));
    ctx.lineTo(W - padR, py(supp));
    ctx.moveTo(padL, py(res));
    ctx.lineTo(W - padR, py(res));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffb4a6";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillText(`R ${res.toFixed(2)}`, W - padR - 50, py(res) - 2);
    ctx.fillText(`S ${supp.toFixed(2)}`, W - padR - 50, py(supp) + 10);

    if (compareData.length) {
      compareData.forEach((cd, idx) => {
        const closes = cd.candles.map((c) => c.c);
        const chi = Math.max(...closes);
        const clo = Math.min(...closes);
        const cspan = chi - clo || 1;
        ctx.strokeStyle = ["#9a9aa6", "#ffb020", "#2fe08a", "#8fb4ff"][idx % 4];
        ctx.lineWidth = 1;
        ctx.beginPath();
        closes.forEach((v, i) => {
          const x = px(i);
          const y = padT + (1 - (v - clo) / cspan) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.fillStyle = ["#9a9aa6", "#ffb020", "#2fe08a", "#8fb4ff"][idx % 4];
        ctx.fillText(`▬ ${cd.sym} (norm)`, padL + 6 + idx * 100, padT + 10);
      });
    }

    const volH = 40;
    const volTop = H - padB + 4;
    const maxV = Math.max(...data.map((d) => d.v));
    data.forEach((d, i) => {
      const x = px(i);
      const h = (d.v / maxV) * volH;
      ctx.fillStyle =
        d.c >= d.o ? "rgba(47,224,138,0.45)" : "rgba(255,138,122,0.45)";
      ctx.fillRect(x - bw / 2, volTop + volH - h, bw, h);
    });
    ctx.fillStyle = "#6b6b76";
    ctx.fillText("VOL", 4, volTop + 10);

    const rsiTop = H - padB + 48;
    const rsiH = 18;
    ctx.strokeStyle = "rgba(160,19,36,0.3)";
    ctx.strokeRect(padL, rsiTop, W - padL - padR, rsiH);
    ctx.strokeStyle = "#ffb4a6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    r.forEach((v, i) => {
      if (v == null) return;
      const x = px(i);
      const y = rsiTop + (1 - v / 100) * rsiH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#6b6b76";
    ctx.fillText("RSI14", 4, rsiTop + 10);

    const last = data[n - 1];
    ctx.fillStyle = "rgba(10,10,13,0.9)";
    ctx.fillRect(padL + 6, padT + 6, 190, 44);
    ctx.strokeStyle = "rgba(160,19,36,0.5)";
    ctx.strokeRect(padL + 6, padT + 6, 190, 44);
    ctx.fillStyle = "#ffb4a6";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText(`${symbol}`, padL + 12, padT + 20);
    ctx.fillStyle = "#e6e6ea";
    ctx.fillText(
      `O ${last.o.toFixed(2)}  H ${last.h.toFixed(2)}  L ${last.l.toFixed(2)}  C ${last.c.toFixed(2)}`,
      padL + 12,
      padT + 36
    );
    ctx.fillStyle = last.c >= last.o ? "#2fe08a" : "#ff8a7a";
    ctx.fillText(
      `Δ ${(last.c - last.o).toFixed(2)}  V ${last.v.toLocaleString()}`,
      padL + 12,
      padT + 48
    );
  }, [data, sma20, sma50, r, compareData, symbol]);

  return (
    <div
      className="relative h-full w-full"
      onMouseMove={(e) => {
        const el = canvasRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const n = data.length;
        const padL = 48;
        const padR = 10;
        const i = Math.round(((x - padL) * (n - 1)) / (rect.width - padL - padR));
        const c = data[Math.max(0, Math.min(n - 1, i))];
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, c });
      }}
      onMouseLeave={() => setTooltip(null)}
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
      {tooltip && (
        <div
          className="absolute pointer-events-none text-xxs bg-bg-0/90 border border-edge-crimson/40 px-2 py-1 tabular"
          style={{ left: Math.min(tooltip.x + 10, 260), top: tooltip.y + 10 }}
        >
          <div className="text-edge-pale">
            {new Date(tooltip.c.t).toISOString().slice(11, 16)} UTC
          </div>
          <div>O {tooltip.c.o.toFixed(2)}</div>
          <div>H {tooltip.c.h.toFixed(2)}</div>
          <div>L {tooltip.c.l.toFixed(2)}</div>
          <div>C {tooltip.c.c.toFixed(2)}</div>
          <div>V {tooltip.c.v.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

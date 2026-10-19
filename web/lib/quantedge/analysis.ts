import type { Candle, MarketRegime } from "./types";

export interface InstrumentAnalysis {
  symbol: string;
  source: "local-tool" | "gemini";
  freshness: "live" | "simulated" | "mixed";
  asOf: string;
  facts: {
    last: number;
    changePct: number;
    high: number;
    low: number;
    volumeSum: number;
    candleCount: number;
    granularityNote: string;
  };
  calculated: {
    realizedVolAnn: number;
    maxDrawdown: number;
    rsi14: number | null;
    momentum20: number | null;
    avgVolume: number;
  };
  regime: {
    label: MarketRegime;
    confidence: number;
    evidence: string[];
    methodology: string;
  };
  narrative: string;
  limitations: string;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

export function analyzeCandles(symbol: string, candles: Candle[]): InstrumentAnalysis {
  if (candles.length < 5) {
    return {
      symbol,
      source: "local-tool",
      freshness: "simulated",
      asOf: new Date().toISOString(),
      facts: {
        last: 0,
        changePct: 0,
        high: 0,
        low: 0,
        volumeSum: 0,
        candleCount: candles.length,
        granularityNote: "Insufficient OHLC history",
      },
      calculated: {
        realizedVolAnn: 0,
        maxDrawdown: 0,
        rsi14: null,
        momentum20: null,
        avgVolume: 0,
      },
      regime: {
        label: "range",
        confidence: 0.2,
        evidence: ["Not enough candles for regime estimate"],
        methodology:
          "Local QuantEdge analysis tool — needs live Coinbase candles for this symbol.",
      },
      narrative:
        "No usable candle series. Select a live Coinbase crypto product to run analysis.",
      limitations:
        "Prototype local tool only. Not a licensed risk model. Gemini enhancement optional via GEMINI_API_KEY.",
    };
  }

  const closes = candles.map((c) => c.close);
  const first = candles[0].open;
  const last = closes[closes.length - 1];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const volumeSum = candles.reduce((s, c) => s + c.volume, 0);

  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((s, r) => s + r, 0) / Math.max(rets.length, 1);
  const variance =
    rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(rets.length - 1, 1);
  const realizedVolAnn = Math.sqrt(variance) * Math.sqrt(24 * 365);

  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = peak > 0 ? (c - peak) / peak : 0;
    if (dd < maxDd) maxDd = dd;
  }

  const mom20 =
    closes.length > 20
      ? ((closes[closes.length - 1] - closes[closes.length - 21]) /
          closes[closes.length - 21]) *
        100
      : null;

  const rsi14 = rsi(closes);
  const evidence: string[] = [];
  let label: MarketRegime = "range";
  let confidence = 0.45;

  if (realizedVolAnn > 0.8) {
    label = "high_vol";
    evidence.push(`Annualized realized vol ${(realizedVolAnn * 100).toFixed(0)}% (elevated)`);
    confidence = 0.55;
  } else if (realizedVolAnn < 0.35) {
    label = "low_vol";
    evidence.push(`Annualized realized vol ${(realizedVolAnn * 100).toFixed(0)}% (compressed)`);
    confidence = 0.5;
  }

  if (mom20 != null && Math.abs(mom20) > 8) {
    label = mom20 > 0 ? "trending_up" : "trending_down";
    evidence.push(`20-bar momentum ${mom20.toFixed(1)}%`);
    confidence = Math.min(0.75, confidence + 0.15);
  } else {
    evidence.push("Momentum near flat — range-leaning");
  }

  if (changePct < -5) {
    evidence.push("Window return negative — risk-off leaning");
    if (label === "range" || label === "high_vol") label = "risk_off";
  } else if (changePct > 5) {
    evidence.push("Window return positive — risk-on leaning");
    if (label === "range" || label === "low_vol") label = "risk_on";
  }

  return {
    symbol,
    source: "local-tool",
    freshness: "live",
    asOf: new Date().toISOString(),
    facts: {
      last: Number(last.toFixed(6)),
      changePct: Number(changePct.toFixed(2)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      volumeSum: Number(volumeSum.toFixed(2)),
      candleCount: candles.length,
      granularityNote: "Derived from live Coinbase OHLC window",
    },
    calculated: {
      realizedVolAnn: Number(realizedVolAnn.toFixed(4)),
      maxDrawdown: Number(maxDd.toFixed(4)),
      rsi14,
      momentum20: mom20 != null ? Number(mom20.toFixed(2)) : null,
      avgVolume: Number((volumeSum / candles.length).toFixed(2)),
    },
    regime: {
      label,
      confidence: Number(confidence.toFixed(2)),
      evidence,
      methodology:
        "Local QuantEdge tool: log-return vol (ann.), 20-bar momentum, window return, RSI(14). Illustrative classification only.",
    },
    narrative: [
      `${symbol} last ${last.toFixed(4)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% over window).`,
      `Regime estimate: ${label.replaceAll("_", " ")} @ ${(confidence * 100).toFixed(0)}% confidence.`,
      rsi14 != null ? `RSI(14)=${rsi14}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    limitations:
      "Facts and calculated fields are from candles. Regime label is a heuristic, not a validated model. Optional Gemini narrative requires GEMINI_API_KEY (server-side).",
  };
}

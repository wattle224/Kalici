import { NextResponse } from "next/server";
import { analyzeCandles } from "@/lib/quantedge/analysis";
import { fetchCoinbaseCandles } from "@/lib/coinbase";
import type { Candle } from "@/lib/quantedge/types";

export const dynamic = "force-dynamic";

/**
 * Instrument analysis: always runs local QuantEdge tool on candles.
 * If GEMINI_API_KEY is set, appends a Gemini free-tier narrative (server-side only).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      symbol?: string;
      candles?: Candle[];
      useGemini?: boolean;
    };
    const symbol = (body.symbol || "XRP-USD").toUpperCase();
    let candles = Array.isArray(body.candles) ? body.candles : [];
    if (candles.length < 5) {
      try {
        candles = await fetchCoinbaseCandles(symbol, 3600, 168);
      } catch {
        /* keep empty */
      }
    }

    const local = analyzeCandles(symbol, candles);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    let geminiNote: string | null = null;
    let source = local.source;

    if (body.useGemini !== false && geminiKey) {
      try {
        const prompt = [
          "You are a markets analyst. Use ONLY the facts and calculated fields below.",
          "Do not invent prices. Distinguish facts vs interpretation. No certainty language for forecasts.",
          JSON.stringify({ facts: local.facts, calculated: local.calculated, regime: local.regime }, null, 2),
          "Write 4 short bullets: setup, risks, what would invalidate the regime view, data gaps.",
        ].join("\n");

        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          geminiNote =
            data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") ||
            null;
          if (geminiNote) source = "gemini";
        } else {
          geminiNote = `Gemini request failed HTTP ${res.status} — local analysis retained.`;
        }
      } catch (err) {
        geminiNote = `Gemini unavailable: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else if (body.useGemini) {
      geminiNote =
        "GEMINI_API_KEY not configured on server. Showing local QuantEdge analysis tool only. Get a free key at Google AI Studio and set GEMINI_API_KEY in web/.env.local.";
    }

    return NextResponse.json({
      ok: true,
      analysis: {
        ...local,
        source,
        narrative: geminiNote
          ? `${local.narrative}\n\n--- Gemini / model interpretation ---\n${geminiNote}`
          : local.narrative,
      },
      geminiConfigured: Boolean(geminiKey),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

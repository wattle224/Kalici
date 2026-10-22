import { NextResponse } from "next/server";
import { buildCursorIncidentPrompt, parseCursorActions } from "@/lib/quantedge/cursorPrompt";
import type { AppService, Incident } from "@/lib/quantedge/types";

export const dynamic = "force-dynamic";

/** Build Cursor-ready prompt + optional Gemini draft for an incident. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      incident: Incident;
      service?: AppService;
      logs?: string[];
      cursorResponse?: string;
      draftWithGemini?: boolean;
    };

    if (!body.incident?.id) {
      return NextResponse.json({ ok: false, error: "incident required" }, { status: 400 });
    }

    const prompt = buildCursorIncidentPrompt(
      body.incident,
      body.service,
      body.logs ?? []
    );

    const actions = body.cursorResponse
      ? parseCursorActions(body.cursorResponse)
      : null;

    let draft: string | null = null;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (body.draftWithGemini && geminiKey) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Draft an SRE response to this Cursor prompt. Keep checklist actionable. " +
                    "Do not claim production was fixed.\n\n" +
                    prompt,
                },
              ],
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        draft =
          data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") ||
          null;
      }
    }

    return NextResponse.json({
      ok: true,
      prompt,
      cursorUrl: "https://cursor.com/agents",
      actions,
      draft,
      geminiConfigured: Boolean(geminiKey),
      instructions: [
        "1. Copy the prompt into a new Cursor Cloud Agent / Composer chat.",
        "2. Paste Cursor's reply back into QuantEdge 'Apply Cursor response'.",
        "3. Review checklist before any dry-run control is executed.",
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

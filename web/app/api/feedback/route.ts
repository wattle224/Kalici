import { NextResponse } from "next/server";
import {
  buildFeedbackSubject,
  buildMailtoUrl,
  FEEDBACK_CATEGORIES,
  validateFeedback,
  type FeedbackCategory,
  type FeedbackPayload,
} from "@/lib/feedback";
import { isSmtpConfigured, sendFeedbackEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: Partial<FeedbackPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload: FeedbackPayload = {
    category: body.category as FeedbackCategory,
    message: body.message ?? "",
    rating:
      body.rating != null ? Math.round(Number(body.rating)) : undefined,
    replyEmail: body.replyEmail?.trim() || undefined,
    pageUrl: body.pageUrl?.trim() || undefined,
  };

  const validationError = validateFeedback(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        error: "SMTP not configured on server.",
        mailto: buildMailtoUrl(payload),
        subject: buildFeedbackSubject(payload),
      },
      { status: 503 }
    );
  }

  try {
    await sendFeedbackEmail(payload);
    return NextResponse.json({
      ok: true,
      message: `Feedback sent to ${process.env.FEEDBACK_TO ?? "sbarryfr@gmail.com"}.`,
      subject: buildFeedbackSubject(payload),
    });
  } catch (err) {
    console.error("Feedback email failed:", err);
    return NextResponse.json(
      {
        error: "Failed to send email. Try the mail app fallback.",
        mailto: buildMailtoUrl(payload),
        subject: buildFeedbackSubject(payload),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    categories: FEEDBACK_CATEGORIES,
    to: process.env.FEEDBACK_TO ?? "sbarryfr@gmail.com",
    smtpConfigured: isSmtpConfigured(),
  });
}

export const FEEDBACK_TO = "sbarryfr@gmail.com";

export const FEEDBACK_CATEGORIES = [
  "Bug report",
  "Feature request",
  "Trading automation",
  "UI / UX",
  "Performance",
  "Other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  rating?: number;
  replyEmail?: string;
  pageUrl?: string;
}

export function buildFeedbackSubject(payload: FeedbackPayload): string {
  const preview = payload.message.trim().slice(0, 48).replace(/\s+/g, " ");
  const suffix = payload.message.length > 48 ? "…" : "";
  return `[Kalici Trading Feedback] ${payload.category} — ${preview}${suffix}`;
}

export function buildFeedbackBody(payload: FeedbackPayload): string {
  const lines = [
    "Kalici Trading — user feedback",
    "",
    `Category: ${payload.category}`,
    payload.rating ? `Rating: ${payload.rating}/5` : null,
    payload.replyEmail ? `Reply to: ${payload.replyEmail}` : null,
    payload.pageUrl ? `Page: ${payload.pageUrl}` : null,
    "",
    "Message:",
    payload.message.trim(),
    "",
    `Submitted: ${new Date().toISOString()}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildMailtoUrl(payload: FeedbackPayload): string {
  const subject = encodeURIComponent(buildFeedbackSubject(payload));
  const body = encodeURIComponent(buildFeedbackBody(payload));
  return `mailto:${FEEDBACK_TO}?subject=${subject}&body=${body}`;
}

export function validateFeedback(
  payload: Partial<FeedbackPayload>
): string | null {
  if (!payload.category || !FEEDBACK_CATEGORIES.includes(payload.category)) {
    return "Please choose a category.";
  }
  const message = payload.message?.trim() ?? "";
  if (message.length < 10) {
    return "Please enter at least 10 characters.";
  }
  if (message.length > 4000) {
    return "Message is too long (max 4000 characters).";
  }
  if (
    payload.rating != null &&
    (payload.rating < 1 || payload.rating > 5 || !Number.isInteger(payload.rating))
  ) {
    return "Rating must be between 1 and 5.";
  }
  if (payload.replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.replyEmail)) {
    return "Please enter a valid reply email.";
  }
  return null;
}

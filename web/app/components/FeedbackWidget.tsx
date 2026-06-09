"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildMailtoUrl,
  FEEDBACK_CATEGORIES,
  FEEDBACK_TO,
  type FeedbackCategory,
  type FeedbackPayload,
} from "@/lib/feedback";

type SubmitState = "idle" | "sending" | "sent" | "mailto";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("Bug report");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [replyEmail, setReplyEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentSubject, setSentSubject] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setMessage("");
    setRating(null);
    setReplyEmail("");
    setError(null);
    setSubmitState("idle");
    setSentSubject(null);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const payload = (): FeedbackPayload => ({
    category,
    message,
    rating: rating ?? undefined,
    replyEmail: replyEmail.trim() || undefined,
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });

  const submit = async () => {
    setError(null);
    setSubmitState("sending");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setSentSubject(data.subject ?? null);
        setSubmitState("sent");
        return;
      }

      if (data.mailto) {
        window.location.href = data.mailto;
        setSentSubject(data.subject ?? null);
        setSubmitState("mailto");
        return;
      }

      setError(data.error ?? "Could not send feedback.");
      setSubmitState("idle");
    } catch {
      const mailto = buildMailtoUrl(payload());
      window.location.href = mailto;
      setSubmitState("mailto");
    }
  };

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        onClick={() => setOpen(true)}
        aria-label="Share feedback"
      >
        Share feedback
      </button>

      {open && (
        <div
          className="feedback-overlay"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="feedback-modal"
            role="dialog"
            aria-labelledby="feedback-title"
            aria-modal="true"
          >
            <header className="feedback-header">
              <h2 id="feedback-title">Share feedback</h2>
              <button
                type="button"
                className="feedback-close"
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            {submitState === "sent" ? (
              <div className="feedback-success">
                <p>
                  <strong>Thank you!</strong> Your feedback was emailed to{" "}
                  <a href={`mailto:${FEEDBACK_TO}`}>{FEEDBACK_TO}</a>.
                </p>
                {sentSubject && (
                  <p className="meta">Subject: {sentSubject}</p>
                )}
                <button type="button" className="primary" onClick={close}>
                  Done
                </button>
              </div>
            ) : submitState === "mailto" ? (
              <div className="feedback-success">
                <p>
                  Opening your mail app to send feedback to{" "}
                  <strong>{FEEDBACK_TO}</strong> with the correct subject line.
                </p>
                <button type="button" className="primary" onClick={close}>
                  Done
                </button>
              </div>
            ) : (
              <form
                className="feedback-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label className="feedback-label">
                  Category
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as FeedbackCategory)
                    }
                  >
                    {FEEDBACK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="feedback-rating">
                  <legend>Rating (optional)</legend>
                  <div className="feedback-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={rating != null && n <= rating ? "active" : ""}
                        onClick={() => setRating(rating === n ? null : n)}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="feedback-label">
                  Your feedback
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What worked well? What should we improve?"
                    rows={5}
                    maxLength={4000}
                    required
                  />
                  <span className="meta">{message.length}/4000</span>
                </label>

                <label className="feedback-label">
                  Reply email (optional)
                  <input
                    type="email"
                    value={replyEmail}
                    onChange={(e) => setReplyEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                {error && <p className="feedback-error">{error}</p>}

                <div className="feedback-actions">
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitState === "sending"}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={submitState === "sending" || message.trim().length < 10}
                  >
                    {submitState === "sending" ? "Sending…" : "Send feedback"}
                  </button>
                </div>

                <p className="meta feedback-note">
                  Sent to {FEEDBACK_TO} with subject{" "}
                  <code>[Kalici Trading Feedback] {category} — …</code>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

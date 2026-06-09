import nodemailer from "nodemailer";
import {
  buildFeedbackBody,
  buildFeedbackSubject,
  FEEDBACK_TO,
  type FeedbackPayload,
} from "./feedback";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export async function sendFeedbackEmail(
  payload: FeedbackPayload
): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const to = process.env.FEEDBACK_TO ?? FEEDBACK_TO;
  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "kalici-feedback@localhost";

  await transporter.sendMail({
    from,
    to,
    replyTo: payload.replyEmail || undefined,
    subject: buildFeedbackSubject(payload),
    text: buildFeedbackBody(payload),
  });
}

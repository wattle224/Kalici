"use client";

import FeedbackWidget from "./FeedbackWidget";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FeedbackWidget />
    </>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantEdge Terminal",
  description:
    "Institutional AI trading, technical support monitoring, and quantitative risk terminal",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
      </head>
      <body>{children}</body>
    </html>
  );
}

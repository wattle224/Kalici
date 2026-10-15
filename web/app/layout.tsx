import type { Metadata } from "next";
import ClientShell from "./components/ClientShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalici Trading — LIVE",
  description: "Live Coinbase prices + local XRP-USD execution",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
      </head>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}

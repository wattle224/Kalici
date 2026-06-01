import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalici Trading",
  description: "Investment automation — trading dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

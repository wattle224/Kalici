import type { Metadata } from "next";
import ClientShell from "./components/ClientShell";
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
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}

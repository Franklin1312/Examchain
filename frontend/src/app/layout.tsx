import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inkless — CBSE OSM Audit Platform",
  description:
    "Independent verification and audit layer for CBSE OSM evaluated answer sheets. Detect unevaluated pages, blur-penalized answers, and evaluation anomalies.",
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

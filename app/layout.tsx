import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Julia — Eau de parfum",
  description: "Le rouge, à fleur de peau. Découvrez le flacon de Julia sous tous ses angles avant son lancement le 20 janvier 2027.",
};

export const viewport: Viewport = { themeColor: "#530910" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

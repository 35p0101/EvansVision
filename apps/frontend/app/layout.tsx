import "@/styles/globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "EvansVision — AI Football Predictions",
  description: "AI-powered football match predictions with machine learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans">
        <Providers>
          <Navbar />
          <main className="relative">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-inter-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stock Scanner — AI-Powered Signal Analysis",
  description:
    "AI analyzes 12 technical indicators against 10 years of historical data to find pattern matches. Probability-based signals for smarter trading decisions.",
  keywords: [
    "stock scanner",
    "trading signals",
    "technical analysis",
    "AI trading",
    "stock market",
    "probability analysis",
  ],
  openGraph: {
    title: "Stock Scanner — AI-Powered Signal Analysis",
    description:
      "Historical pattern matching across 12 technical indicators. Not predictions — probabilities.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stock Scanner — AI-Powered Signal Analysis",
    description:
      "Historical pattern matching across 12 technical indicators. Not predictions — probabilities.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

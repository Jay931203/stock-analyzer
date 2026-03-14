import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* SEO */}
        <meta name="description" content="Data-driven stock probability analysis with 10+ technical indicators. Free signal scanner for US stocks." />
        <meta name="keywords" content="stock analysis, probability, technical indicators, RSI, MACD, signal scanner, US stocks" />

        {/* Open Graph defaults */}
        <meta property="og:title" content="Stock Scanner - Probability Analysis" />
        <meta property="og:description" content="Data-driven stock probability analysis with 10+ technical indicators" />
        <meta property="og:type" content="website" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

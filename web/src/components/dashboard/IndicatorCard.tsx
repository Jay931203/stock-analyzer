"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IndicatorCardProps {
  name: string;
  value: number | string;
  state: string;
  stateColor?: "green" | "red" | "yellow" | "neutral";
  winRate?: number;
  avgReturn?: number;
  occurrences?: number;
  periodLabel?: string;
  /** Extra stats shown on hover expansion */
  bestReturn?: number;
  worstReturn?: number;
  stdDev?: number;
  /** Render as compact single-line row instead of card */
  compact?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Indicator tooltip descriptions                                     */
/* ------------------------------------------------------------------ */

const INDICATOR_TOOLTIPS: Record<string, string> = {
  RSI: "Relative Strength Index \u2014 measures momentum on a 0\u2013100 scale",
  MACD: "Moving Average Convergence Divergence \u2014 trend-following momentum indicator",
  MA: "Moving Average alignment (SMA 20/50/200)",
  BB: "Bollinger Bands \u2014 volatility and price position relative to bands",
  STOCH: "Stochastic Oscillator \u2014 compares closing price to price range over time",
  ADX: "Average Directional Index \u2014 measures trend strength (not direction)",
  OBV: "On-Balance Volume \u2014 cumulative buying/selling pressure via volume",
  VWAP: "Volume-Weighted Average Price \u2014 intraday fair value benchmark",
  ATR: "Average True Range \u2014 measures market volatility",
  CCI: "Commodity Channel Index \u2014 identifies cyclical trends",
  MFI: "Money Flow Index \u2014 volume-weighted RSI",
  WILLIAMS: "Williams %R \u2014 overbought/oversold oscillator (-100 to 0)",
  ROC: "Rate of Change \u2014 percentage change in price over N periods",
  ICHIMOKU: "Ichimoku Cloud \u2014 support/resistance, momentum, and trend direction",
  PSAR: "Parabolic SAR \u2014 trailing stop and trend reversal indicator",
  EMA: "Exponential Moving Average \u2014 weighted moving average favoring recent prices",
  SMA: "Simple Moving Average \u2014 arithmetic mean of price over N periods",
  VOL: "Volume analysis \u2014 trading activity relative to historical average",
  SQUEEZE: "Squeeze Momentum \u2014 Bollinger Bands inside Keltner Channels",
};

function getTooltip(name: string): string | null {
  const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
  for (const key of Object.keys(INDICATOR_TOOLTIPS)) {
    if (upper.includes(key)) return INDICATOR_TOOLTIPS[key];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Mini sparkline SVG                                                 */
/* ------------------------------------------------------------------ */

function generateSparklinePath(
  value: number | string,
  width: number,
  height: number,
): string {
  const numVal = typeof value === "number" ? value : parseFloat(value) || 50;
  // Seed a deterministic pseudo-random from value for variation
  const seed = Math.abs(numVal * 137.5) % 100;
  const points = 30;
  const step = width / (points - 1);

  // Generate a trend line: sine wave + linear trend based on value
  const trend = numVal > 60 ? 0.4 : numVal < 40 ? -0.4 : 0;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const sine = Math.sin(t * Math.PI * 2 + seed) * 0.25;
    const sine2 = Math.sin(t * Math.PI * 3.7 + seed * 0.7) * 0.15;
    const noise = Math.sin(t * 17 + seed * 2.3) * 0.1;
    const y = 0.5 - trend * t - sine - sine2 - noise;
    const clampedY = Math.max(0.08, Math.min(0.92, y));
    coords.push([i * step, clampedY * height]);
  }

  return (
    "M " + coords.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")
  );
}

function MiniSparkline({
  value,
  color,
}: {
  value: number | string;
  color: "green" | "red" | "neutral";
}) {
  const w = 64;
  const h = 24;
  const path = useMemo(() => generateSparklinePath(value, w, h), [value]);

  const strokeColor =
    color === "green"
      ? "#34d399"
      : color === "red"
        ? "#f87171"
        : "#71717a";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: state badge styles                                         */
/* ------------------------------------------------------------------ */

function getStateBadgeStyles(color: IndicatorCardProps["stateColor"]) {
  switch (color) {
    case "green":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "red":
      return "bg-red-500/15 text-red-400 border-red-500/25";
    case "yellow":
      return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    default:
      return "bg-zinc-700/40 text-zinc-400 border-zinc-700/60";
  }
}

function getBorderColor(color: IndicatorCardProps["stateColor"]) {
  switch (color) {
    case "green":
      return "border-l-emerald-500";
    case "red":
      return "border-l-red-500";
    case "yellow":
      return "border-l-amber-500";
    default:
      return "border-l-zinc-600";
  }
}

function getWinRateColor(wr: number | undefined) {
  if (wr == null) return { text: "text-zinc-500", bar: "bg-zinc-600" };
  if (wr >= 60) return { text: "text-emerald-400", bar: "bg-emerald-500" };
  if (wr <= 40) return { text: "text-red-400", bar: "bg-red-500" };
  return { text: "text-amber-400", bar: "bg-amber-500" };
}

function trendDirection(color: IndicatorCardProps["stateColor"]): "green" | "red" | "neutral" {
  if (color === "green") return "green";
  if (color === "red") return "red";
  return "neutral";
}

/* ------------------------------------------------------------------ */
/*  Tooltip component (pure CSS)                                       */
/* ------------------------------------------------------------------ */

function NameWithTooltip({ name }: { name: string }) {
  const tooltip = getTooltip(name);

  if (!tooltip) {
    return (
      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {name}
      </h4>
    );
  }

  return (
    <div className="relative group/tip">
      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-help border-b border-dotted border-zinc-700">
        {name}
      </h4>
      <div
        role="tooltip"
        className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/tip:block w-56 px-3 py-2 text-xs text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl leading-relaxed pointer-events-none"
      >
        {tooltip}
        <div className="absolute left-4 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-zinc-700" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact row variant                                                */
/* ------------------------------------------------------------------ */

function CompactRow({
  name,
  value,
  state,
  stateColor = "neutral",
  winRate,
  avgReturn,
  periodLabel = "20d",
}: IndicatorCardProps) {
  const { t } = useI18n();
  const wrColors = getWinRateColor(winRate);
  const tooltip = getTooltip(name);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg",
        "hover:border-zinc-700 hover:bg-zinc-900/80 transition-colors",
        "border-l-[3px]",
        getBorderColor(stateColor),
        "font-[tabular-nums]",
      )}
    >
      {/* Name */}
      <div className="relative group/tip shrink-0 w-16">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-help">
          {name}
        </span>
        {tooltip && (
          <div
            role="tooltip"
            className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/tip:block w-56 px-3 py-2 text-xs text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl leading-relaxed pointer-events-none"
          >
            {tooltip}
          </div>
        )}
      </div>

      {/* Value */}
      <span className="text-sm font-mono font-bold text-zinc-100 w-16 text-right tabular-nums">
        {typeof value === "number" ? value.toFixed(2) : value}
      </span>

      {/* State badge */}
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 w-20 justify-center",
          getStateBadgeStyles(stateColor),
        )}
      >
        {state || t("indicator.neutral")}
      </span>

      {/* Win rate mini bar */}
      {winRate != null && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden min-w-[40px]">
            <div
              className={cn("h-full rounded-full", wrColors.bar)}
              style={{ width: `${Math.min(winRate, 100)}%` }}
            />
          </div>
          <span className={cn("text-xs font-mono font-semibold shrink-0 w-12 text-right tabular-nums", wrColors.text)}>
            {winRate.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Avg return */}
      {avgReturn != null && (
        <span
          className={cn(
            "text-xs font-mono font-semibold shrink-0 w-16 text-right tabular-nums",
            avgReturn >= 0 ? "text-emerald-400" : "text-red-400",
          )}
        >
          {avgReturn >= 0 ? "+" : ""}
          {avgReturn.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full card variant (default)                                        */
/* ------------------------------------------------------------------ */

export function IndicatorCard(props: IndicatorCardProps) {
  const {
    name,
    value,
    state,
    stateColor = "neutral",
    winRate,
    avgReturn,
    occurrences,
    periodLabel = "20d",
    bestReturn,
    worstReturn,
    stdDev,
    compact = false,
  } = props;

  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const wrColors = getWinRateColor(winRate);
  const sparkColor = trendDirection(stateColor);

  const hasExpandedStats =
    bestReturn != null || worstReturn != null || stdDev != null || occurrences != null;

  if (compact) {
    return <CompactRow {...props} />;
  }

  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl",
        "border-l-[3px]",
        getBorderColor(stateColor),
        "hover:border-zinc-700 transition-all duration-200",
        "group relative",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        {/* Header: name + sparkline + state badge */}
        <div className="flex items-start justify-between mb-3">
          <NameWithTooltip name={name} />
          <div className="flex items-center gap-2">
            <MiniSparkline value={value} color={sparkColor} />
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0",
                getStateBadgeStyles(stateColor),
              )}
            >
              {state || t("indicator.neutral")}
            </span>
          </div>
        </div>

        {/* Prominent value */}
        <div className="mb-1">
          <span className="text-2xl font-mono font-bold text-zinc-100 tracking-tight tabular-nums">
            {typeof value === "number" ? value.toFixed(2) : value}
          </span>
        </div>

        {/* Condition text */}
        <p className="text-[11px] text-zinc-500 mb-3 line-clamp-2 leading-relaxed">
          {state}
        </p>

        {/* Stats section */}
        {winRate != null && (
          <div className="space-y-2.5 pt-3 border-t border-zinc-800/60">
            {/* Win rate bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  {t("indicator.winRate")} ({periodLabel})
                </span>
                <span className={cn("font-mono font-semibold tabular-nums", wrColors.text)}>
                  {winRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    wrColors.bar,
                  )}
                  style={{ width: `${Math.min(winRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Avg return + occurrences row */}
            <div className="flex items-center justify-between text-xs">
              {avgReturn != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">{t("indicator.avgReturn")}</span>
                  <span
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      avgReturn >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {avgReturn >= 0 ? "+" : ""}
                    {avgReturn.toFixed(2)}%
                  </span>
                </div>
              )}
              {occurrences != null && (
                <span className="text-zinc-600 font-mono text-[11px] tabular-nums">
                  n={occurrences}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expanded stats on hover */}
        {hasExpandedStats && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              isHovered ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0",
            )}
          >
            <div className="pt-2.5 border-t border-zinc-800/40 space-y-1.5">
              {bestReturn != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">Best return</span>
                  <span className="font-mono font-medium text-emerald-400/80 tabular-nums">
                    +{Math.abs(bestReturn).toFixed(2)}%
                  </span>
                </div>
              )}
              {worstReturn != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">Worst return</span>
                  <span className="font-mono font-medium text-red-400/80 tabular-nums">
                    {worstReturn >= 0 ? "+" : ""}{worstReturn.toFixed(2)}%
                  </span>
                </div>
              )}
              {occurrences != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">Samples</span>
                  <span className="font-mono font-medium text-zinc-400 tabular-nums">
                    {occurrences}
                  </span>
                </div>
              )}
              {stdDev != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">Std dev</span>
                  <span className="font-mono font-medium text-zinc-400 tabular-nums">
                    {stdDev.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

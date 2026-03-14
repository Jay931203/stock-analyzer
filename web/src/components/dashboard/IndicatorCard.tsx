"use client";

import { cn } from "@/lib/utils";

interface IndicatorCardProps {
  name: string;
  value: number | string;
  state: string;
  stateColor?: "green" | "red" | "yellow" | "neutral";
  winRate?: number;
  avgReturn?: number;
  occurrences?: number;
}

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

function getStateLabel(color: IndicatorCardProps["stateColor"]) {
  switch (color) {
    case "green":
      return "Oversold";
    case "red":
      return "Overbought";
    case "yellow":
      return "Unusual";
    default:
      return "Neutral";
  }
}

export function IndicatorCard({
  name,
  value,
  state,
  stateColor = "neutral",
  winRate,
  avgReturn,
  occurrences,
}: IndicatorCardProps) {
  const wrColor =
    winRate != null
      ? winRate >= 60
        ? "text-emerald-400"
        : winRate <= 40
          ? "text-red-400"
          : "text-amber-400"
      : "text-zinc-500";

  const wrBarColor =
    winRate != null
      ? winRate >= 60
        ? "bg-emerald-500"
        : winRate <= 40
          ? "bg-red-500"
          : "bg-amber-500"
      : "bg-zinc-600";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group">
      {/* Header: name + state badge */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {name}
        </h4>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0",
            getStateBadgeStyles(stateColor),
          )}
        >
          {getStateLabel(stateColor)}
        </span>
      </div>

      {/* Prominent value */}
      <div className="mb-1">
        <span className="text-2xl font-mono font-bold text-zinc-100 tracking-tight">
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
              <span className="text-zinc-500">Win Rate (20d)</span>
              <span className={cn("font-mono font-semibold", wrColor)}>
                {winRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  wrBarColor,
                )}
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Avg return + occurrences row */}
          <div className="flex items-center justify-between text-xs">
            {avgReturn != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Avg Return:</span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    avgReturn >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {avgReturn >= 0 ? "+" : ""}
                  {avgReturn.toFixed(2)}%
                </span>
              </div>
            )}
            {occurrences != null && (
              <span className="text-zinc-600 font-mono text-[11px]">
                n={occurrences}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

function getStateStyles(color: IndicatorCardProps["stateColor"]) {
  switch (color) {
    case "green":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "red":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "yellow":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-zinc-700/30 text-zinc-400 border-zinc-700";
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-zinc-300">{name}</h4>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
            getStateStyles(stateColor),
          )}
        >
          {state}
        </span>
      </div>

      {/* Value */}
      <div className="mb-4">
        <span className="text-2xl font-mono font-semibold text-zinc-100">
          {typeof value === "number" ? value.toFixed(2) : value}
        </span>
      </div>

      {/* Stats */}
      {winRate != null && (
        <div className="space-y-2">
          {/* Win rate bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Win Rate</span>
              <span className={cn("font-mono font-medium", wrColor)}>
                {winRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  winRate >= 60
                    ? "bg-emerald-500"
                    : winRate <= 40
                      ? "bg-red-500"
                      : "bg-amber-500",
                )}
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Avg return + occurrences */}
          <div className="flex items-center justify-between text-xs">
            {avgReturn != null && (
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Avg Return:</span>
                <span
                  className={cn(
                    "font-mono",
                    avgReturn >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {avgReturn >= 0 ? "+" : ""}
                  {avgReturn.toFixed(2)}%
                </span>
              </div>
            )}
            {occurrences != null && (
              <span className="text-zinc-600 font-mono">
                n={occurrences}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

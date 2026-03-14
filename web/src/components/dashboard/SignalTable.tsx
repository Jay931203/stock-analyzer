"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type SortKey =
  | "ticker"
  | "price"
  | "change_pct"
  | "win_rate_5d"
  | "win_rate_20d"
  | "win_rate_60d"
  | "avg_return_20d"
  | "strength";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  shortLabel?: string;
  align?: "left" | "right";
  width?: string;
}

const COLUMNS: Column[] = [
  { key: "ticker", label: "Ticker", align: "left", width: "w-28" },
  { key: "price", label: "Price", align: "right", width: "w-24" },
  { key: "change_pct", label: "Change%", shortLabel: "Chg%", align: "right", width: "w-20" },
  { key: "win_rate_5d", label: "WR 5d", align: "right", width: "w-16" },
  { key: "win_rate_20d", label: "WR 20d", align: "right", width: "w-16" },
  { key: "win_rate_60d", label: "WR 60d", align: "right", width: "w-16" },
  { key: "avg_return_20d", label: "Avg Ret 20d", shortLabel: "Ret 20d", align: "right", width: "w-24" },
  { key: "strength", label: "Strength", align: "right", width: "w-28" },
];

function getWinRateColor(wr: number): string {
  if (wr >= 60) return "text-emerald-400";
  if (wr <= 40) return "text-red-400";
  return "text-amber-400";
}

function getStrengthColor(s: number): string {
  if (s >= 70) return "bg-emerald-500";
  if (s >= 50) return "bg-indigo-500";
  if (s >= 30) return "bg-amber-500";
  return "bg-red-500";
}

/** Derive direction from win_rate_20d */
function getDirection(sig: Signal): "bullish" | "bearish" | "neutral" {
  if (sig.win_rate_20d > 50) return "bullish";
  if (sig.win_rate_20d < 50) return "bearish";
  return "neutral";
}

interface SignalTableProps {
  signals: Signal[];
  loading?: boolean;
}

export function SignalTable({ signals, loading }: SignalTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("strength");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  const sorted = useMemo(() => {
    const list = [...signals];
    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;

      switch (sortKey) {
        case "ticker":
          av = a.ticker;
          bv = b.ticker;
          break;
        default:
          av = (a as unknown as Record<string, number>)[sortKey] ?? 0;
          bv = (b as unknown as Record<string, number>)[sortKey] ?? 0;
      }

      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return list;
  }, [signals, sortKey, sortDir]);

  if (loading) {
    return <SignalTableSkeleton />;
  }

  if (signals.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
        No signals found. Try a different period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 w-10">
              #
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors sticky top-0 bg-zinc-900/95 backdrop-blur-sm",
                  col.align === "right" ? "text-right" : "text-left",
                  col.width,
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  <span className="hidden sm:inline">{col.label}</span>
                  <span className="sm:hidden">{col.shortLabel || col.label}</span>
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-indigo-400" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-indigo-400" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((sig, idx) => {
            const direction = getDirection(sig);
            const isBullish = direction === "bullish";
            const isExpanded = expandedTicker === sig.ticker;

            return (
              <>
                <tr
                  key={sig.ticker}
                  onClick={() =>
                    router.push(`/dashboard/analyze/${sig.ticker}`)
                  }
                  className="border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/40 transition-colors group"
                >
                  {/* # */}
                  <td className="px-3 py-2.5 text-zinc-600 font-mono text-xs">
                    {idx + 1}
                  </td>

                  {/* Ticker + name */}
                  <td className="px-3 py-2.5">
                    <div>
                      <span className="font-mono font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                        {sig.ticker}
                      </span>
                      {sig.name && (
                        <div className="text-[10px] text-zinc-600 truncate max-w-[100px]">
                          {sig.name}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-3 py-2.5 text-right font-mono text-zinc-200">
                    ${sig.price.toFixed(2)}
                  </td>

                  {/* Change% */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        sig.change_pct >= 0
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {sig.change_pct >= 0 ? "+" : ""}
                      {sig.change_pct.toFixed(2)}%
                    </span>
                  </td>

                  {/* Win Rate 5d */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        getWinRateColor(sig.win_rate_5d),
                      )}
                    >
                      {sig.win_rate_5d.toFixed(0)}%
                    </span>
                  </td>

                  {/* Win Rate 20d */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        getWinRateColor(sig.win_rate_20d),
                      )}
                    >
                      {sig.win_rate_20d.toFixed(0)}%
                    </span>
                  </td>

                  {/* Win Rate 60d */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        getWinRateColor(sig.win_rate_60d),
                      )}
                    >
                      {sig.win_rate_60d.toFixed(0)}%
                    </span>
                  </td>

                  {/* Avg Return 20d */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        sig.avg_return_20d >= 0
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {sig.avg_return_20d >= 0 ? "+" : ""}
                      {sig.avg_return_20d.toFixed(2)}%
                    </span>
                  </td>

                  {/* Strength bar */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getStrengthColor(sig.strength),
                          )}
                          style={{ width: `${Math.min(sig.strength, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-zinc-400 w-7 text-right">
                        {sig.strength.toFixed(0)}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Expand row on click to show condition + metadata */}
                {isExpanded && (
                  <tr key={`${sig.ticker}-detail`} className="border-b border-zinc-800/50">
                    <td colSpan={9} className="px-6 py-3 bg-zinc-900/80">
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="text-zinc-500">Condition:</span>{" "}
                          <span className="text-zinc-300">{sig.condition}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Sector:</span>{" "}
                          <span className="text-zinc-300">{sig.sector}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Tier:</span>{" "}
                          <span className="text-zinc-300">{sig.tier}</span>
                        </div>
                        {sig.volume_level && (
                          <div>
                            <span className="text-zinc-500">Volume:</span>{" "}
                            <span className="text-zinc-300">{sig.volume_level}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-zinc-500">Occurrences:</span>{" "}
                          <span className="text-zinc-300">{sig.occurrences}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SignalTableSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="h-10 border-b border-zinc-800 bg-zinc-900/80" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50"
        >
          <div className="w-6 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-12 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="flex-1 h-2 bg-zinc-800 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

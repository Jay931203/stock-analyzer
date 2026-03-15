"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react";

const DISPLAY_PERIODS = ["5d", "20d", "60d", "120d", "252d"] as const;
type DisplayPeriod = (typeof DISPLAY_PERIODS)[number];

/** Map display period to the Signal field suffix */
const WR_FIELD: Record<DisplayPeriod, keyof Signal> = {
  "5d": "win_rate_5d",
  "20d": "win_rate_20d",
  "60d": "win_rate_60d",
  "120d": "win_rate_120d" as keyof Signal,
  "252d": "win_rate_252d" as keyof Signal,
};
const AR_FIELD: Record<DisplayPeriod, keyof Signal> = {
  "5d": "avg_return_5d" as keyof Signal,
  "20d": "avg_return_20d",
  "60d": "avg_return_60d" as keyof Signal,
  "120d": "avg_return_120d" as keyof Signal,
  "252d": "avg_return_252d" as keyof Signal,
};

type SortKey =
  | "ticker"
  | "price"
  | "change_pct"
  | "sector"
  | "win_rate"
  | "avg_return"
  | "strength";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  shortLabel?: string;
  align?: "left" | "right";
  width?: string;
  hideOnMobile?: boolean;
}

function buildColumns(dp: DisplayPeriod): Column[] {
  return [
    { key: "ticker", label: "Ticker", align: "left", width: "w-36" },
    { key: "sector", label: "Sector", align: "left", width: "w-28", hideOnMobile: true },
    { key: "price", label: "Price", align: "right", width: "w-24" },
    { key: "change_pct", label: "Change%", shortLabel: "Chg%", align: "right", width: "w-20" },
    { key: "win_rate", label: `WR ${dp}`, align: "right", width: "w-24" },
    { key: "avg_return", label: `Avg Ret ${dp}`, shortLabel: `Ret ${dp}`, align: "right", width: "w-22", hideOnMobile: true },
    { key: "strength", label: "Strength", align: "right", width: "w-32" },
  ];
}

function getWinRateColor(wr: number): string {
  if (wr >= 60) return "text-emerald-400";
  if (wr <= 40) return "text-red-400";
  return "text-amber-400";
}

function getWinRateBarColor(wr: number): string {
  if (wr >= 60) return "bg-emerald-500";
  if (wr >= 50) return "bg-indigo-500";
  if (wr >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getStrengthBarStyle(s: number): string {
  if (s >= 70) return "from-emerald-500 to-emerald-400";
  if (s >= 50) return "from-indigo-500 to-indigo-400";
  if (s >= 30) return "from-amber-500 to-amber-400";
  return "from-red-500 to-red-400";
}

export const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  "Consumer Cyclical": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Consumer Defensive": "bg-lime-500/15 text-lime-400 border-lime-500/25",
  Healthcare: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Financial: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "Financial Services": "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Energy: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Industrials: "bg-slate-400/15 text-slate-400 border-slate-400/25",
  "Communication Services": "bg-purple-500/15 text-purple-400 border-purple-500/25",
  "Real Estate": "bg-rose-500/15 text-rose-400 border-rose-500/25",
  Utilities: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  Materials: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  "Basic Materials": "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

function getSectorBadgeColor(sector: string): string {
  return SECTOR_COLORS[sector] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-600/30";
}

/** Short sector label */
function shortSector(sector: string): string {
  const map: Record<string, string> = {
    Technology: "Tech",
    "Consumer Cyclical": "Consumer",
    "Consumer Defensive": "Staples",
    Healthcare: "Health",
    "Financial Services": "Finance",
    Financial: "Finance",
    "Communication Services": "Comms",
    "Real Estate": "REIT",
    "Basic Materials": "Materials",
  };
  return map[sector] ?? sector;
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface SignalTableProps {
  signals: Signal[];
  loading?: boolean;
  totalSignals?: number;
  scanned?: number;
  isMarketClosed?: boolean;
}

export function SignalTable({ signals, loading, totalSignals, scanned, isMarketClosed }: SignalTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("strength");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const [displayPeriod, setDisplayPeriod] = useState<DisplayPeriod>("20d");

  const columns = useMemo(() => buildColumns(displayPeriod), [displayPeriod]);

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

  const resolveValue = useCallback(
    (sig: Signal, key: SortKey): number | string => {
      switch (key) {
        case "ticker":
          return sig.ticker;
        case "sector":
          return sig.sector || "";
        case "win_rate":
          return (sig[WR_FIELD[displayPeriod]] as number | undefined) ?? 0;
        case "avg_return":
          return (sig[AR_FIELD[displayPeriod]] as number | undefined) ?? 0;
        default:
          return (sig as unknown as Record<string, number>)[key] ?? 0;
      }
    },
    [displayPeriod],
  );

  const sorted = useMemo(() => {
    const list = [...signals];
    list.sort((a, b) => {
      const av = resolveValue(a, sortKey);
      const bv = resolveValue(b, sortKey);

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
  }, [signals, sortKey, sortDir, resolveValue]);

  if (loading) {
    return <SignalTableSkeleton />;
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm gap-2">
        <span>No signals found for this filter.</span>
      </div>
    );
  }

  const displayTotal = totalSignals ?? signals.length;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/50">
      {/* Table header bar with count + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/80">
        <span className="text-xs text-zinc-400 font-medium">
          <span className="text-zinc-100 font-semibold text-sm tabular-nums">{displayTotal}</span>{" "}
          signal{displayTotal !== 1 ? "s" : ""} found
          {scanned != null && scanned > 0 && (
            <span className="text-zinc-600 ml-1">
              (scanned {scanned.toLocaleString()} tickers)
            </span>
          )}
          {!scanned && totalSignals != null && totalSignals > signals.length && (
            <span className="text-zinc-600 ml-1">
              (showing {signals.length})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 mr-1 hidden sm:inline">Display period:</span>
          <div className="flex items-center bg-zinc-800/60 rounded-lg p-0.5 gap-0.5">
            {DISPLAY_PERIODS.map((dp) => (
              <button
                key={dp}
                onClick={() => setDisplayPeriod(dp)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200",
                  displayPeriod === dp
                    ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40",
                )}
              >
                {dp}
              </button>
            ))}
          </div>
        </div>
      </div>

      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-zinc-800/60">
            <th className="px-2 py-2.5 text-left text-xs font-medium text-zinc-600 w-8">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-2 py-2.5 text-xs font-medium text-zinc-500 cursor-pointer select-none group/th transition-colors sticky top-0 bg-zinc-900/95 backdrop-blur-sm",
                  col.align === "right" ? "text-right" : "text-left",
                  col.width,
                  col.hideOnMobile && "hidden lg:table-cell",
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  <span className={cn(
                    "hidden sm:inline border-b border-transparent",
                    sortKey === col.key ? "border-indigo-500/50" : "group-hover/th:border-zinc-600",
                  )}>
                    {col.label}
                  </span>
                  <span className={cn(
                    "sm:hidden border-b border-transparent",
                    sortKey === col.key ? "border-indigo-500/50" : "group-hover/th:border-zinc-600",
                  )}>
                    {col.shortLabel || col.label}
                  </span>
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-indigo-400" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-indigo-400" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-30 transition-opacity" />
                  )}
                </span>
              </th>
            ))}
            {/* View column */}
            <th className="px-2 py-2.5 w-14" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((sig, idx) => {
            const wr = (sig[WR_FIELD[displayPeriod]] as number | undefined) ?? 0;
            const ar = (sig[AR_FIELD[displayPeriod]] as number | undefined) ?? 0;
            return (
              <tr
                key={`${sig.ticker}-${idx}`}
                onClick={() =>
                  router.push(`/dashboard/analyze/${sig.ticker}`)
                }
                onMouseEnter={() => setHoveredTicker(sig.ticker)}
                onMouseLeave={() => setHoveredTicker(null)}
                className={cn(
                  "cursor-pointer transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-indigo-500/60",
                  idx % 2 === 0
                    ? "bg-zinc-900/30"
                    : "bg-zinc-900/10",
                  "hover:bg-zinc-800/50",
                  "border-b border-zinc-800/30",
                )}
              >
                {/* # */}
                <td className="px-2 py-2 text-zinc-600 font-mono text-xs tabular-nums">
                  {idx + 1}
                </td>

                {/* Ticker + name */}
                <td className="px-2 py-2 relative">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-sm text-zinc-100 group-hover:text-indigo-400 transition-colors">
                      {sig.ticker}
                    </span>
                    {sig.name && (
                      <div className="text-[10px] text-zinc-500 truncate max-w-[120px] leading-tight mt-0.5">
                        {sig.name}
                      </div>
                    )}
                  </div>
                  {/* Condition tooltip on hover */}
                  {hoveredTicker === sig.ticker && sig.condition && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl text-xs text-zinc-300 leading-relaxed pointer-events-none">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Signal Condition</div>
                      {sig.condition}
                    </div>
                  )}
                </td>

                {/* Sector badge */}
                <td className="px-2 py-2 hidden lg:table-cell">
                  {sig.sector && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border",
                        getSectorBadgeColor(sig.sector),
                      )}
                    >
                      {shortSector(sig.sector)}
                    </span>
                  )}
                </td>

                {/* Price */}
                <td className="px-2 py-2 text-right font-mono text-zinc-200 text-xs tabular-nums">
                  ${formatPrice(sig.price)}
                </td>

                {/* Change% */}
                <td className="px-2 py-2 text-right">
                  {sig.change_pct === 0 ? (
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded text-zinc-500 bg-zinc-500/5 tabular-nums"
                      title={isMarketClosed ? "Market closed — no change from last session" : undefined}
                    >
                      0.00%
                      {isMarketClosed && (
                        <span className="text-[9px] text-zinc-600 ml-0.5">(prev)</span>
                      )}
                    </span>
                  ) : isMarketClosed ? (
                    <span
                      className={cn(
                        "font-mono text-xs px-1.5 py-0.5 rounded tabular-nums",
                        sig.change_pct > 0
                          ? "text-emerald-400/70 bg-emerald-500/5"
                          : "text-red-400/70 bg-red-500/5",
                      )}
                      title="Market closed — showing last session change"
                    >
                      {sig.change_pct > 0 ? "+" : ""}
                      {sig.change_pct.toFixed(2)}%
                      <span className="text-[9px] text-zinc-600 ml-0.5">(prev)</span>
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "font-mono text-xs px-1.5 py-0.5 rounded tabular-nums",
                        sig.change_pct > 0
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-red-400 bg-red-500/10",
                      )}
                    >
                      {sig.change_pct > 0 ? "+" : ""}
                      {sig.change_pct.toFixed(2)}%
                    </span>
                  )}
                </td>

                {/* Win Rate - mini progress bar */}
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          getWinRateBarColor(wr),
                        )}
                        style={{ width: `${Math.min(wr, 100)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold tabular-nums",
                        getWinRateColor(wr),
                      )}
                    >
                      {wr.toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Avg Return (selected period) */}
                <td className="px-2 py-2 text-right hidden lg:table-cell">
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      ar >= 0
                        ? "text-emerald-400"
                        : "text-red-400",
                    )}
                  >
                    {ar >= 0 ? "+" : ""}
                    {ar.toFixed(2)}%
                  </span>
                </td>

                {/* Strength bar - gradient */}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                          getStrengthBarStyle(sig.strength),
                        )}
                        style={{ width: `${Math.min(sig.strength, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-zinc-400 w-7 text-right tabular-nums font-semibold">
                      {sig.strength.toFixed(0)}
                    </span>
                  </div>
                </td>

                {/* View button */}
                <td className="px-2 py-2 text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-indigo-400 transition-colors">
                    View
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SignalTableSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
      {/* Count bar skeleton */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/80">
        <div className="w-28 h-4 bg-zinc-800 rounded animate-pulse" />
      </div>
      {/* Header */}
      <div className="h-10 border-b border-zinc-800/60 bg-zinc-900/80 flex items-center gap-4 px-3">
        <div className="w-6 h-3 bg-zinc-800 rounded animate-pulse" />
        <div className="w-16 h-3 bg-zinc-800 rounded animate-pulse" />
        <div className="w-14 h-3 bg-zinc-800 rounded animate-pulse hidden lg:block" />
        <div className="w-14 h-3 bg-zinc-800 rounded animate-pulse" />
        <div className="w-12 h-3 bg-zinc-800 rounded animate-pulse" />
        <div className="w-10 h-3 bg-zinc-800 rounded animate-pulse" />
        <div className="w-10 h-3 bg-zinc-800 rounded animate-pulse" />
        <div className="w-10 h-3 bg-zinc-800 rounded animate-pulse hidden lg:block" />
        <div className="w-14 h-3 bg-zinc-800 rounded animate-pulse hidden lg:block" />
        <div className="w-14 h-3 bg-zinc-800 rounded animate-pulse hidden lg:block" />
        <div className="flex-1 h-2 bg-zinc-800 rounded-full animate-pulse" />
      </div>
      {/* Rows */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-3 py-2.5 border-b border-zinc-800/30",
            i % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/10",
          )}
        >
          <div className="w-6 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="space-y-1">
            <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse" />
            <div className="w-20 h-2.5 bg-zinc-800/60 rounded animate-pulse" />
          </div>
          <div className="w-14 h-5 bg-zinc-800/50 rounded-full animate-pulse hidden lg:block" />
          <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-14 h-5 bg-zinc-800/40 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse hidden lg:block" />
          <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse hidden lg:block" />
          <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse hidden lg:block" />
          <div className="flex-1 h-2 bg-zinc-800 rounded-full animate-pulse" />
          <div className="w-10 h-3 bg-zinc-800/40 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

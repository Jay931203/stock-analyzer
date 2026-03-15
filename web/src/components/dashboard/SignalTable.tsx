"use client";

import { useState, useMemo, useCallback, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DISPLAY_PERIODS = ["5d", "20d", "60d", "120d", "252d"] as const;
type DisplayPeriod = (typeof DISPLAY_PERIODS)[number];

/** Human-readable labels for each period */
const PERIOD_LABELS: Record<DisplayPeriod, string> = {
  "5d": "1W",
  "20d": "1M",
  "60d": "3M",
  "120d": "6M",
  "252d": "1Y",
};

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

function buildColumns(dp: DisplayPeriod, t: (key: string) => string): Column[] {
  const pl = PERIOD_LABELS[dp];
  return [
    { key: "ticker", label: t("table.ticker"), align: "left", width: "w-36" },
    { key: "sector", label: t("table.sector"), align: "left", width: "w-28", hideOnMobile: true },
    { key: "price", label: t("table.price"), align: "right", width: "w-24" },
    { key: "change_pct", label: t("table.changePct"), shortLabel: t("table.changePctShort"), align: "right", width: "w-20", hideOnMobile: true },
    { key: "win_rate", label: `${t("analysis.winRate")} ${pl}`, align: "right", width: "w-24" },
    { key: "avg_return", label: `${t("analysis.avgReturn")} ${pl}`, shortLabel: `${t("analysis.avgReturn")} ${pl}`, align: "right", width: "w-22", hideOnMobile: true },
    { key: "strength", label: t("table.strength"), align: "right", width: "w-32" },
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
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("strength");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
  const [displayPeriod, setDisplayPeriod] = useState<DisplayPeriod>("20d");
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const columns = useMemo(() => buildColumns(displayPeriod, t as (key: string) => string), [displayPeriod, t]);

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

  /** Keyboard navigation for the grid rows */
  const handleTableKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableSectionElement>) => {
      if (sorted.length === 0) return;
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = Math.min(focusedRowIdx + 1, sorted.length - 1);
          setFocusedRowIdx(next);
          const rows = tbodyRef.current?.querySelectorAll("tr");
          (rows?.[next] as HTMLElement | undefined)?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = Math.max(focusedRowIdx - 1, 0);
          setFocusedRowIdx(prev);
          const rows = tbodyRef.current?.querySelectorAll("tr");
          (rows?.[prev] as HTMLElement | undefined)?.focus();
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (sorted[focusedRowIdx]) {
            router.push(`/dashboard/analyze/${sorted[focusedRowIdx].ticker}`);
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          setFocusedRowIdx(0);
          const rows = tbodyRef.current?.querySelectorAll("tr");
          (rows?.[0] as HTMLElement | undefined)?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          const last = sorted.length - 1;
          setFocusedRowIdx(last);
          const rows = tbodyRef.current?.querySelectorAll("tr");
          (rows?.[last] as HTMLElement | undefined)?.focus();
          break;
        }
      }
    },
    [focusedRowIdx, sorted, router],
  );

  if (loading) {
    return <SignalTableSkeleton />;
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm gap-2">
        <span>{t("table.noSignals")}</span>
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
          {displayTotal !== 1 ? t("table.signalsFound") : t("table.signalFound")}
          {scanned != null && scanned > 0 && (
            <span className="text-zinc-600 ml-1">
              ({t("table.scannedTickers").replace("{count}", scanned.toLocaleString())})
            </span>
          )}
          {!scanned && totalSignals != null && totalSignals > signals.length && (
            <span className="text-zinc-600 ml-1">
              ({t("table.showing").replace("{count}", String(signals.length))})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 mr-1 hidden sm:inline">{t("table.displayPeriod")}</span>
          <div className="flex items-center bg-zinc-800/60 rounded-lg p-0.5 gap-0.5" role="group" aria-label="Display period">
            {DISPLAY_PERIODS.map((dp) => (
              <button
                key={dp}
                onClick={() => setDisplayPeriod(dp)}
                aria-pressed={displayPeriod === dp}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                  displayPeriod === dp
                    ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40",
                )}
              >
                {PERIOD_LABELS[dp]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <table className="w-full text-sm table-fixed" role="grid" aria-label="Signal scanner results">
        <thead>
          <tr className="border-b border-zinc-800/60" role="row">
            <th className="px-2 py-2.5 text-left text-xs font-medium text-zinc-600 w-8" role="columnheader" scope="col">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-2 py-2.5 text-xs font-medium text-zinc-500 cursor-pointer select-none group/th transition-colors sticky top-0 bg-zinc-900/95 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                  col.align === "right" ? "text-right" : "text-left",
                  col.width,
                  col.hideOnMobile && "hidden lg:table-cell",
                )}
                role="columnheader"
                scope="col"
                aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                tabIndex={0}
                onClick={() => handleSort(col.key)}
                onKeyDown={(e: KeyboardEvent<HTMLTableCellElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort(col.key);
                  }
                }}
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
                      <ArrowUp className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-30 transition-opacity" aria-hidden="true" />
                  )}
                </span>
              </th>
            ))}
            {/* View column - hidden on mobile */}
            <th className="px-2 py-2.5 w-14 hidden sm:table-cell" role="columnheader" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody ref={tbodyRef} onKeyDown={handleTableKeyDown}>
          {sorted.map((sig, idx) => {
            const wrRaw = sig[WR_FIELD[displayPeriod]] as number | undefined;
            const arRaw = sig[AR_FIELD[displayPeriod]] as number | undefined;
            const wr = wrRaw ?? 0;
            const ar = arRaw ?? 0;
            const hasData = wrRaw !== undefined;
            const rowLabel = `${sig.ticker}${sig.name ? ` ${sig.name}` : ""} signal`;
            return (
              <tr
                key={`${sig.ticker}-${idx}`}
                role="row"
                aria-label={rowLabel}
                tabIndex={0}
                onClick={() =>
                  router.push(`/dashboard/analyze/${sig.ticker}`)
                }
                onFocus={() => setFocusedRowIdx(idx)}
                onMouseEnter={() => setHoveredTicker(sig.ticker)}
                onMouseLeave={() => setHoveredTicker(null)}
                style={sorted.length > 50 ? { contentVisibility: "auto", containIntrinsicHeight: "44px" } as React.CSSProperties : undefined}
                className={cn(
                  "cursor-pointer transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-indigo-500/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 focus-visible:outline-none",
                  idx % 2 === 0
                    ? "bg-zinc-900/30"
                    : "bg-zinc-900/10",
                  "hover:bg-zinc-800/50",
                  "border-b border-zinc-800/30",
                )}
              >
                {/* # */}
                <td className="px-2 py-2 text-zinc-600 font-mono text-xs tabular-nums" role="gridcell">
                  {idx + 1}
                </td>

                {/* Ticker + name */}
                <td className="px-2 py-2 relative" role="gridcell">
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
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl text-xs text-zinc-300 leading-relaxed pointer-events-none" role="tooltip">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">{t("table.signalCondition")}</div>
                      {sig.condition}
                    </div>
                  )}
                </td>

                {/* Sector badge */}
                <td className="px-2 py-2 hidden lg:table-cell" role="gridcell">
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
                <td className="px-2 py-2 text-right font-mono text-zinc-200 text-xs tabular-nums" role="gridcell">
                  ${formatPrice(sig.price)}
                </td>

                {/* Change% - hidden on mobile */}
                <td className="px-2 py-2 text-right hidden lg:table-cell" role="gridcell">
                  {sig.change_pct === 0 ? (
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded text-zinc-500 bg-zinc-500/5 tabular-nums"
                      title={isMarketClosed ? "Market closed -- no change from last session" : undefined}
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
                      title="Market closed -- showing last session change"
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
                <td className="px-2 py-2 text-right" role="gridcell">
                  {!hasData ? (
                    <span className="text-zinc-600 text-xs">--</span>
                  ) : (
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden hidden sm:block" role="meter" aria-valuenow={wr} aria-valuemin={0} aria-valuemax={100} aria-label={`Win rate ${wr.toFixed(0)} percent`}>
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
                  )}
                </td>

                {/* Avg Return (selected period) */}
                <td className="px-2 py-2 text-right hidden lg:table-cell" role="gridcell">
                  {arRaw === undefined ? (
                    <span className="text-zinc-600 text-xs">--</span>
                  ) : (
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
                  )}
                </td>

                {/* Strength bar - gradient */}
                <td className="px-2 py-2" role="gridcell">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-800/80 rounded-full overflow-hidden" role="meter" aria-valuenow={sig.strength} aria-valuemin={0} aria-valuemax={100} aria-label={`Signal strength ${sig.strength.toFixed(0)}`}>
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

                {/* View button - hidden on mobile */}
                <td className="px-2 py-2 text-right hidden sm:table-cell" role="gridcell">
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-indigo-400 transition-colors">
                    {t("table.view")}
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden" role="status" aria-label="Loading signal data">
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
      <span className="sr-only">Loading...</span>
    </div>
  );
}

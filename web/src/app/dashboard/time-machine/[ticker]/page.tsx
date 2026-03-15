"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { api, type TimeMachineResponse } from "@/lib/api";
import {
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Search,
  BarChart3,
  Zap,
} from "lucide-react";

const PRESET_DATES = [
  { label: "COVID Bottom", date: "2020-03-23", description: "Market crash low" },
  { label: "Rate Shock", date: "2022-01-03", description: "Fed hawkish pivot" },
  { label: "AI Rally Start", date: "2023-01-03", description: "ChatGPT momentum" },
  { label: "SVB Crisis", date: "2023-03-10", description: "Bank run panic" },
  { label: "Oct 2023 Low", date: "2023-10-27", description: "Bond yield peak" },
  { label: "2024 Election", date: "2024-11-05", description: "US presidential" },
] as const;

const PERIOD_TABS = [
  { key: "5", label: "5 days" },
  { key: "20", label: "20 days" },
  { key: "60", label: "60 days" },
] as const;

// ---------------------------------------------------------------------------
// Distribution Bar Component
// ---------------------------------------------------------------------------
function DistributionBar({
  winRate,
  className,
}: {
  winRate: number;
  className?: string;
}) {
  const greenWidth = Math.max(0, Math.min(100, winRate));
  return (
    <div
      className={cn(
        "relative h-5 rounded-full overflow-hidden bg-zinc-800",
        className,
      )}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-500/60"
        style={{ width: `${greenWidth}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 rounded-r-full bg-red-500/40"
        style={{ width: `${100 - greenWidth}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold text-white/90 tabular-nums">
        {greenWidth.toFixed(0)}% up
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Percentile Position Bar
// ---------------------------------------------------------------------------
function PercentileBar({
  percentile,
  actualReturn,
}: {
  percentile: number;
  actualReturn: number;
}) {
  const pos = Math.max(2, Math.min(98, percentile));
  return (
    <div className="relative">
      <div className="h-3 rounded-full bg-gradient-to-r from-red-500/30 via-zinc-700 to-emerald-500/30 overflow-hidden" />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-full"
        style={{ left: `${pos}%` }}
      />
      <div
        className="absolute -top-6 -translate-x-1/2 text-[10px] font-mono font-bold tabular-nums whitespace-nowrap"
        style={{
          left: `${pos}%`,
          color: actualReturn >= 0 ? "#34d399" : "#f87171",
        }}
      >
        {formatPercent(actualReturn)}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
        <span>Worst</span>
        <span>Best</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TimeMachinePage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker || "").toUpperCase();

  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || "";

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [result, setResult] = useState<TimeMachineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<string>("20");
  const [showIndicators, setShowIndicators] = useState(false);

  const runTimeMachine = useCallback(
    async (date: string) => {
      if (!date) return;
      setSelectedDate(date);
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const data = await api.getTimeMachine(ticker, date);
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to run time machine",
        );
      } finally {
        setLoading(false);
      }
    },
    [ticker],
  );

  useEffect(() => {
    if (initialDate) {
      runTimeMachine(initialDate);
    }
  }, [initialDate, runTimeMachine]);

  // Derived values
  const totalReturn =
    result && result.price_at_date > 0
      ? ((result.current_price - result.price_at_date) / result.price_at_date) *
        100
      : 0;

  // Get period-specific data for the active tab
  const activePeriodData = result?.signal.win_rates?.[activePeriod];
  const activeBaseline = result?.baseline?.[activePeriod];
  const activeActual = result?.actual?.[activePeriod];

  // Compute edge
  const signalWinRate = activePeriodData ?? null;
  const baselineWinRate = activeBaseline?.win_rate ?? null;
  const signalAvgReturn =
    result && activePeriodData != null
      ? (() => {
          // We don't have avg_return per period in win_rates directly.
          // Use baseline comparison only for win rate; avg_return from actual if available.
          return null;
        })()
      : null;
  const baselineAvgReturn = activeBaseline?.avg_return ?? null;
  const edgeWinRate =
    signalWinRate != null && baselineWinRate != null
      ? signalWinRate - baselineWinRate
      : null;

  return (
    <div className="px-3 py-4 sm:p-4 md:p-6 max-w-5xl space-y-4 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link
          href="/dashboard"
          className="hover:text-zinc-300 transition-colors"
        >
          Scanner
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link
          href={`/dashboard/analyze/${ticker}`}
          className="hover:text-zinc-300 transition-colors font-mono font-semibold"
        >
          {ticker}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-400">Time Machine</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/analyze/${ticker}`}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all duration-200 shrink-0"
          aria-label="Back to analysis"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold text-zinc-100">
              Time Machine
            </h1>
            <span className="font-mono font-bold text-indigo-400 text-xl">
              {ticker}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Explore historical signal patterns and their outcomes
          </p>
        </div>
      </div>

      {/* Date picker + presets */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="tm-date"
              className="block text-xs font-medium text-zinc-500 mb-2"
            >
              Select Date
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="tm-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  min="2015-01-01"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-mono text-zinc-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all [color-scheme:dark]"
                />
              </div>
              <button
                onClick={() => runTimeMachine(selectedDate)}
                disabled={!selectedDate || loading}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm shadow-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/25"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preset dates */}
        <div className="mt-4">
          <span className="block text-xs font-medium text-zinc-500 mb-2">
            Key Market Dates
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {PRESET_DATES.map((preset) => (
              <button
                key={preset.date}
                onClick={() => runTimeMachine(preset.date)}
                disabled={loading}
                className={cn(
                  "flex flex-col items-center px-3 py-2.5 rounded-lg border text-center transition-all duration-200 group",
                  selectedDate === preset.date
                    ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-sm shadow-indigo-500/10"
                    : "bg-zinc-800/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 hover:bg-zinc-800/60",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 opacity-50" />
                  <span className="text-xs font-medium">{preset.label}</span>
                </div>
                <span className="text-[10px] text-zinc-600 mt-0.5 font-mono tabular-nums">
                  {preset.date}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => runTimeMachine(selectedDate)}
            className="ml-auto px-3 py-1 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="h-20 bg-zinc-800/30 animate-pulse" />
            <div className="px-5 py-4 space-y-3">
              <div className="w-48 h-5 bg-zinc-800 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-zinc-800/40 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
            <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="h-20 bg-zinc-800/40 rounded-lg animate-pulse" />
          </div>
        </div>
      )}

      {/* ===== Result ===== */}
      {result && !loading && (
        <div className="space-y-4 animate-reveal-up">
          {/* ── 1. Pattern Summary ── */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                <Search className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg font-bold text-zinc-100 tabular-nums">
                    {result.distribution.total_cases} similar pattern
                    {result.distribution.total_cases !== 1 ? "s" : ""} found
                  </span>
                  <span className="text-xs text-zinc-500">
                    out of{" "}
                    {result.distribution.lookback_days.toLocaleString()} trading
                    days analyzed
                  </span>
                </div>

                {/* Signal conditions as pills */}
                {result.signal.conditions.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      Matching conditions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.signal.conditions.map((cond, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300"
                        >
                          {cond.indicator.toUpperCase()}
                          {cond.state && (
                            <span className="text-indigo-400/60 font-mono text-[10px]">
                              {cond.state}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.signal.confidence_warning && (
                  <p className="mt-2 text-xs text-amber-400/80">
                    {result.signal.confidence_warning}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. Outcome Distribution (centerpiece) ── */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
            {/* Period tabs */}
            <div className="flex border-b border-zinc-800/60">
              {PERIOD_TABS.map((tab) => {
                const hasData =
                  result.signal.win_rates?.[tab.key] != null;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActivePeriod(tab.key)}
                    disabled={!hasData}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors relative",
                      activePeriod === tab.key
                        ? "text-indigo-400 bg-indigo-500/5"
                        : hasData
                          ? "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30"
                          : "text-zinc-600 cursor-not-allowed",
                    )}
                  >
                    After {tab.label}
                    {activePeriod === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-5">
              {activePeriodData != null ? (
                <>
                  {/* Win rate distribution bar */}
                  <div>
                    <div className="text-xs text-zinc-500 mb-2">
                      After{" "}
                      {PERIOD_TABS.find((t) => t.key === activePeriod)?.label ??
                        `${activePeriod}d`}
                      :
                    </div>
                    <DistributionBar winRate={activePeriodData} />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-800/40 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                        Win Rate
                      </div>
                      <div className="text-lg font-mono font-bold text-zinc-200 tabular-nums">
                        {activePeriodData.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-zinc-800/40 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                        Occurrences
                      </div>
                      <div className="text-lg font-mono font-bold text-zinc-200 tabular-nums">
                        {result.distribution.total_cases}
                      </div>
                    </div>
                    <div className="bg-zinc-800/40 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                        Tier
                      </div>
                      <div className="text-lg font-mono font-bold text-zinc-200 capitalize">
                        {result.signal.tier ?? "N/A"}
                      </div>
                    </div>
                    <div className="bg-zinc-800/40 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                        Direction
                      </div>
                      <div
                        className={cn(
                          "text-lg font-bold capitalize",
                          result.signal.direction === "bullish"
                            ? "text-emerald-400"
                            : result.signal.direction === "bearish"
                              ? "text-red-400"
                              : "text-zinc-400",
                        )}
                      >
                        {result.signal.direction}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-sm text-zinc-500">
                  No data available for this period.
                </div>
              )}
            </div>
          </div>

          {/* ── 3. What Actually Happened ── */}
          {activeActual && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
                What Actually Happened
              </h3>

              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-sm text-zinc-400">{ticker} returned:</span>
                <span
                  className={cn(
                    "text-2xl font-mono font-bold tabular-nums",
                    activeActual.return_pct >= 0
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}
                >
                  {formatPercent(activeActual.return_pct)}
                </span>
                <span className="text-sm text-zinc-500">
                  in{" "}
                  {PERIOD_TABS.find((t) => t.key === activePeriod)?.label ??
                    `${activePeriod} days`}
                </span>
              </div>

              {result.percentile_rank != null && activePeriod === "20" && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">
                    This was better than{" "}
                    <span className="font-semibold text-zinc-200">
                      {result.percentile_rank.toFixed(0)}%
                    </span>{" "}
                    of similar historical cases
                  </div>
                  <div className="pt-5">
                    <PercentileBar
                      percentile={result.percentile_rank}
                      actualReturn={activeActual.return_pct}
                    />
                  </div>
                </div>
              )}

              {/* Forward Returns Table (simplified horizontal) */}
              <div className="mt-5 pt-5 border-t border-zinc-800/60">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">
                  All Forward Returns
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(result.actual).map(([period, data]) => (
                    <div
                      key={period}
                      className={cn(
                        "rounded-lg p-3 text-center border transition-colors",
                        period === activePeriod
                          ? "bg-indigo-500/10 border-indigo-500/20"
                          : "bg-zinc-800/30 border-zinc-800/60",
                      )}
                    >
                      <div className="text-[10px] text-zinc-500 uppercase mb-1">
                        {period}d
                      </div>
                      <div
                        className={cn(
                          "text-sm font-mono font-bold tabular-nums",
                          data.return_pct >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      >
                        {formatPercent(data.return_pct)}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono tabular-nums mt-0.5">
                        {formatCurrency(data.end_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 4. Signal Edge ── */}
          {signalWinRate != null && baselineWinRate != null && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Signal Edge
                </h3>
                <span className="text-[10px] text-zinc-600 ml-auto">
                  After{" "}
                  {PERIOD_TABS.find((t) => t.key === activePeriod)?.label ??
                    `${activePeriod}d`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* With Signal */}
                <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">
                    With Signal
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-mono font-bold text-zinc-100 tabular-nums">
                        {signalWinRate.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-zinc-500">win rate</div>
                    </div>
                  </div>
                </div>

                {/* Without Signal (baseline) */}
                <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">
                    Random Entry
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-mono font-bold text-zinc-400 tabular-nums">
                        {baselineWinRate.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-zinc-500">win rate</div>
                    </div>
                    {baselineAvgReturn != null && (
                      <div>
                        <div className="text-sm font-mono text-zinc-400 tabular-nums">
                          {baselineAvgReturn >= 0 ? "+" : ""}
                          {baselineAvgReturn.toFixed(2)}%
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          avg return
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edge summary */}
              {edgeWinRate != null && (
                <div
                  className={cn(
                    "mt-3 px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2",
                    edgeWinRate > 0
                      ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400"
                      : edgeWinRate < 0
                        ? "bg-red-500/5 border-red-500/15 text-red-400"
                        : "bg-zinc-800/40 border-zinc-700/30 text-zinc-400",
                  )}
                >
                  {edgeWinRate > 0 ? (
                    <TrendingUp className="w-4 h-4 shrink-0" />
                  ) : edgeWinRate < 0 ? (
                    <TrendingDown className="w-4 h-4 shrink-0" />
                  ) : null}
                  <span className="font-medium">
                    Edge:{" "}
                    <span className="font-mono tabular-nums">
                      {edgeWinRate >= 0 ? "+" : ""}
                      {edgeWinRate.toFixed(1)}pp
                    </span>{" "}
                    win rate advantage
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── 5. Individual Indicator Breakdown (collapsible) ── */}
          {result.signal.conditions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowIndicators(!showIndicators)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Individual Indicator Breakdown
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-zinc-500 transition-transform",
                    showIndicators && "rotate-180",
                  )}
                />
              </button>

              {showIndicators && (
                <div className="px-5 pb-5 border-t border-zinc-800/40">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-zinc-800/60">
                        <th className="text-left text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2 pr-4">
                          Condition
                        </th>
                        <th className="text-left text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2 pr-4">
                          State
                        </th>
                        <th className="text-right text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.signal.conditions.map((cond, i) => {
                        const indKey = cond.indicator.toLowerCase();
                        const indValue =
                          result.indicators_at_date[indKey] ??
                          result.indicators_at_date[
                            `${indKey}_event`
                          ] ??
                          result.indicators_at_date[
                            `${indKey}_trend`
                          ];
                        const indState =
                          cond.state ||
                          (result.indicators_at_date[
                            `${indKey}_event`
                          ] as string) ||
                          (result.indicators_at_date[
                            `${indKey}_trend`
                          ] as string) ||
                          (result.indicators_at_date[
                            indKey
                          ] as string);

                        return (
                          <tr
                            key={i}
                            className="border-b border-zinc-800/30 last:border-0"
                          >
                            <td className="py-2.5 pr-4">
                              <span className="text-xs font-medium text-zinc-300 uppercase">
                                {cond.indicator}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className="text-xs font-mono text-zinc-400">
                                {typeof indState === "string"
                                  ? indState.replace(/_/g, " ")
                                  : "--"}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="text-xs font-mono text-zinc-500 tabular-nums">
                                {indValue != null
                                  ? typeof indValue === "number"
                                    ? indValue.toFixed(2)
                                    : String(indValue)
                                  : "--"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── 6. Price Context ── */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Price Context
            </h3>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                  Price on {result.date}
                </div>
                <div className="text-xl font-mono font-bold text-zinc-200 tabular-nums">
                  {formatCurrency(result.price_at_date)}
                </div>
              </div>
              <div className="flex items-center text-zinc-600">
                {totalReturn >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                  Current Price
                </div>
                <div className="text-xl font-mono font-bold text-zinc-200 tabular-nums">
                  {formatCurrency(result.current_price)}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                  Total Return
                </div>
                <div
                  className={cn(
                    "text-xl font-mono font-bold tabular-nums",
                    totalReturn >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {formatPercent(totalReturn)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Highlights ── */}
          {result.highlights && result.highlights.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Highlights
              </h3>
              <ul className="space-y-2">
                {result.highlights.map((h, i) => (
                  <li
                    key={i}
                    className={cn(
                      "text-sm px-4 py-2.5 rounded-lg flex items-start gap-2 border transition-colors",
                      h.type === "positive" || h.type === "bullish"
                        ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                        : h.type === "negative" || h.type === "bearish"
                          ? "bg-red-500/5 text-red-400 border-red-500/10"
                          : "bg-zinc-800/40 text-zinc-300 border-zinc-800/60",
                    )}
                  >
                    {(h.type === "positive" || h.type === "bullish") ? (
                      <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (h.type === "negative" || h.type === "bearish") ? (
                      <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : null}
                    <span>{h.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40">
            <Clock className="w-8 h-8 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">
              Select a date to explore historical patterns
            </p>
            <p className="text-xs text-zinc-600 max-w-md mt-1.5 leading-relaxed">
              The Time Machine finds similar technical indicator patterns from
              history and shows you the distribution of outcomes -- not
              predictions, but what happened when similar conditions occurred.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

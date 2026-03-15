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
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";

const PRESET_DATES = [
  { label: "COVID Bottom", date: "2020-03-23", description: "Market crash low" },
  { label: "Rate Shock", date: "2022-01-03", description: "Fed hawkish pivot" },
  { label: "AI Rally Start", date: "2023-01-03", description: "ChatGPT momentum" },
  { label: "SVB Crisis", date: "2023-03-10", description: "Bank run panic" },
  { label: "Oct 2023 Low", date: "2023-10-27", description: "Bond yield peak" },
  { label: "2024 Election", date: "2024-11-05", description: "US presidential" },
] as const;

export default function TimeMachinePage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker || "").toUpperCase();

  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || "";

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [result, setResult] = useState<TimeMachineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const totalReturn = result && result.price_at_date > 0
    ? ((result.current_price - result.price_at_date) / result.price_at_date) * 100
    : 0;

  return (
    <div className="p-6 max-w-5xl space-y-6">
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
            Reconstruct past signals and compare with actual outcomes
          </p>
        </div>
      </div>

      {/* Date picker + presets */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Calendar input */}
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
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 bg-zinc-800/40 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
            <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-zinc-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4 animate-reveal-up">
          {/* Verdict card */}
          <div className={cn(
            "bg-zinc-900 border rounded-xl overflow-hidden transition-all",
            result.accuracy
              ? result.accuracy.was_correct
                ? "border-emerald-500/20 animate-glow-green"
                : "border-red-500/20 animate-glow-red"
              : "border-zinc-800/80",
          )}>
            {/* Large verdict banner */}
            {result.accuracy ? (
              <div
                className={cn(
                  "flex items-center justify-between px-6 py-5",
                  result.accuracy.was_correct
                    ? "bg-emerald-500/8 border-b border-emerald-500/15"
                    : "bg-red-500/8 border-b border-red-500/15",
                )}
              >
                <div className="flex items-center gap-4">
                  {result.accuracy.was_correct ? (
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/20">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                  )}
                  <div>
                    <div
                      className={cn(
                        "text-2xl font-bold tracking-tight",
                        result.accuracy.was_correct ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {result.accuracy.was_correct ? "CORRECT" : "INCORRECT"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-md border",
                          result.signal.direction === "bullish"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20",
                        )}
                      >
                        {result.signal.direction}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono tabular-nums">
                        WR: {result.signal.win_rate_20d?.toFixed(0) ?? "\u2014"}% | n={result.signal.occurrences}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 mb-1">
                    Predicted: <span className="text-zinc-400 font-medium">{result.accuracy.predicted_direction}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Actual: <span className="text-zinc-400 font-medium">{result.accuracy.actual_direction}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 px-6 py-5 bg-zinc-800/20 border-b border-zinc-700/30">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-700/30 border border-zinc-600/30">
                  <Info className="w-7 h-7 text-zinc-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-400 tracking-tight">NO SIGNAL</div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(result.signal as Record<string, unknown>).confidence_warning as string || "Insufficient historical data for a directional call"}
                  </p>
                </div>
              </div>
            )}

            {/* Price comparison */}
            <div className="px-6 py-4 border-b border-zinc-800/60 flex flex-wrap items-center gap-6">
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

            {/* Forward returns table */}
            <div className="px-6 py-5">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Actual Forward Returns
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2.5 pr-4">
                        Period
                      </th>
                      <th className="text-right text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2.5 pr-4">
                        Return
                      </th>
                      <th className="text-right text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2.5 pr-4">
                        End Price
                      </th>
                      <th className="text-center text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2.5">
                        Direction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.actual).map(([period, data]) => (
                      <tr
                        key={period}
                        className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <span className="text-xs font-mono font-medium text-zinc-400 tabular-nums">
                            {period}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span
                            className={cn(
                              "font-mono font-semibold tabular-nums px-2 py-0.5 rounded",
                              data.return_pct >= 0
                                ? "text-emerald-400 bg-emerald-500/5"
                                : "text-red-400 bg-red-500/5",
                            )}
                          >
                            {formatPercent(data.return_pct)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="font-mono text-zinc-400 tabular-nums">
                            {formatCurrency(data.end_price)}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {data.went_up ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 inline-block" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Signal conditions */}
          {result.signal.conditions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Signal Conditions on {result.date}
              </h3>
              <ul className="space-y-2">
                {result.signal.conditions.map((cond, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
                        {cond.indicator}
                      </div>
                      <div className="text-sm font-mono font-semibold text-zinc-200 mt-0.5">
                        {cond.state}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights */}
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
                      h.type === "positive"
                        ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                        : h.type === "negative"
                          ? "bg-red-500/5 text-red-400 border-red-500/10"
                          : "bg-zinc-800/40 text-zinc-300 border-zinc-800/60",
                    )}
                  >
                    {h.type === "positive" ? (
                      <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : h.type === "negative" ? (
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
              Select a date to travel back in time
            </p>
            <p className="text-xs text-zinc-600 max-w-md mt-1.5 leading-relaxed">
              The Time Machine reconstructs technical indicator states from
              historical data and compares the generated signals against actual
              forward returns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { api, type AnalysisResponse } from "@/lib/api";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Target,
} from "lucide-react";

const ANALYSIS_PERIODS = [
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
] as const;

type AnalysisPeriod = (typeof ANALYSIS_PERIODS)[number]["value"];

interface IndicatorDisplayItem {
  name: string;
  value: number | string;
  state: string;
  state_color: "green" | "red" | "yellow" | "neutral";
  win_rate: number;
  avg_return: number;
  occurrences: number;
}

/** Resolve a period from the probability periods object.
 *  The API returns keys like "5", "20", "60" (plain numbers)
 *  but some legacy code may use "5d", "20d", etc. Try both. */
function resolvePeriod(periods: Record<string, { win_rate: number; avg_return: number; samples: number }> | undefined, key: string) {
  if (!periods) return undefined;
  // Try plain number first (API format), then with "d" suffix (legacy)
  return periods[key] ?? periods[`${key}d`];
}

/** Extract display-friendly indicator list from the nested indicators object */
function extractIndicators(data: AnalysisResponse): IndicatorDisplayItem[] {
  const items: IndicatorDisplayItem[] = [];
  const ind = data.indicators;

  // RSI
  if (ind.rsi) {
    const prob = ind.rsi.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "RSI",
      value: ind.rsi.value != null ? ind.rsi.value.toFixed(1) : "--",
      state: prob?.condition || (ind.rsi.value != null ? `RSI ${ind.rsi.value.toFixed(0)}` : "N/A"),
      state_color: ind.rsi.value != null
        ? ind.rsi.value > 70 ? "red" : ind.rsi.value < 30 ? "green" : "neutral"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // MACD
  if (ind.macd) {
    const prob = ind.macd.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "MACD",
      value: ind.macd.macd != null ? ind.macd.macd.toFixed(2) : "--",
      state: ind.macd.event || prob?.condition || "N/A",
      state_color: ind.macd.histogram != null
        ? ind.macd.histogram > 0 ? "green" : "red"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // Moving Averages
  if (ind.ma) {
    const prob = ind.ma.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "Moving Averages",
      value: ind.ma.alignment || "--",
      state: prob?.condition || ind.ma.alignment || "N/A",
      state_color: ind.ma.alignment?.toLowerCase().includes("bullish") ? "green"
        : ind.ma.alignment?.toLowerCase().includes("bearish") ? "red"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // Bollinger Bands
  if (ind.bb) {
    const prob = ind.bb.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "Bollinger Bands",
      value: ind.bb.zone || (ind.bb.position != null ? `${(ind.bb.position * 100).toFixed(0)}%` : "--"),
      state: ind.bb.zone || prob?.condition || "N/A",
      state_color: ind.bb.zone === "upper" ? "red"
        : ind.bb.zone === "lower" ? "green"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // Volume
  if (ind.volume) {
    const prob = ind.volume.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    const ratio = ind.volume.ratio;
    items.push({
      name: "Volume",
      value: ratio != null ? `${ratio.toFixed(2)}x` : "--",
      state: prob?.condition || (ratio != null ? (ratio > 1.5 ? "High Volume" : ratio < 0.5 ? "Low Volume" : "Normal") : "N/A"),
      state_color: ratio != null
        ? ratio > 1.5 ? "yellow" : ratio < 0.5 ? "yellow" : "neutral"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // Stochastic
  if (ind.stochastic) {
    const prob = ind.stochastic.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "Stochastic",
      value: ind.stochastic.k != null ? ind.stochastic.k.toFixed(1) : "--",
      state: prob?.condition || "N/A",
      state_color: ind.stochastic.k != null
        ? ind.stochastic.k > 80 ? "red" : ind.stochastic.k < 20 ? "green" : "neutral"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // Drawdown
  if (ind.drawdown) {
    const prob = ind.drawdown.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    const dd = ind.drawdown.from_252d_high;
    items.push({
      name: "Drawdown",
      value: dd != null ? `${dd.toFixed(1)}%` : "--",
      state: prob?.condition || "N/A",
      state_color: dd != null
        ? dd < -20 ? "red" : dd < -10 ? "yellow" : "green"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // ADX
  if (ind.adx) {
    const prob = ind.adx.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "ADX",
      value: ind.adx.adx != null ? ind.adx.adx.toFixed(1) : "--",
      state: ind.adx.trend_strength || prob?.condition || "N/A",
      state_color: ind.adx.adx != null
        ? ind.adx.adx > 25 ? "green" : "neutral"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // ATR
  if (ind.atr) {
    const prob = ind.atr.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "ATR",
      value: ind.atr.atr_pct != null ? `${ind.atr.atr_pct.toFixed(2)}%` : "--",
      state: prob?.condition || "N/A",
      state_color: "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // MA Distance
  if (ind.ma_distance) {
    const prob = ind.ma_distance.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    const d20 = ind.ma_distance.from_sma20;
    items.push({
      name: "MA Distance",
      value: d20 != null ? `${d20.toFixed(2)}%` : "--",
      state: prob?.condition || "N/A",
      state_color: d20 != null
        ? d20 > 5 ? "yellow" : d20 < -5 ? "yellow" : "neutral"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // Consecutive
  if (ind.consecutive) {
    const prob = ind.consecutive.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    items.push({
      name: "Consecutive Days",
      value: `${ind.consecutive.days}d ${ind.consecutive.streak_type}`,
      state: prob?.condition || `${ind.consecutive.days}d ${ind.consecutive.streak_type}`,
      state_color: ind.consecutive.streak_type === "up" ? "green"
        : ind.consecutive.streak_type === "down" ? "red"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  // 52-Week
  if (ind.week52) {
    const prob = ind.week52.probability;
    const wr20 = resolvePeriod(prob?.periods, "20");
    const pos = ind.week52.position_pct;
    items.push({
      name: "52-Week Range",
      value: pos != null ? `${pos.toFixed(0)}%` : "--",
      state: prob?.condition || "N/A",
      state_color: pos != null
        ? pos > 80 ? "green" : pos < 20 ? "red" : "neutral"
        : "neutral",
      win_rate: wr20?.win_rate ?? 0,
      avg_return: wr20?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  return items;
}

/** Horizontal win-rate bar for combined section */
function WinRateBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const barColor =
    value >= 60
      ? "bg-emerald-500"
      : value >= 50
        ? "bg-indigo-500"
        : value >= 40
          ? "bg-amber-500"
          : "bg-red-500";

  const textColor =
    value >= 60
      ? "text-emerald-400"
      : value >= 50
        ? "text-indigo-400"
        : value >= 40
          ? "text-amber-400"
          : "text-red-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-10 shrink-0 font-mono">
        {label}
      </span>
      <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={cn("text-xs font-mono font-semibold w-14 text-right", textColor)}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

export default function AnalyzePage() {
  const params = useParams<{ ticker: string }>();
  const router = useRouter();
  const ticker = (params.ticker || "").toUpperCase();

  const [period, setPeriod] = useState<AnalysisPeriod>("10y");
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [smartExpanded, setSmartExpanded] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartResult, setSmartResult] = useState<Record<string, unknown> | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getAnalysis(ticker, period);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    if (ticker) fetchAnalysis();
  }, [ticker, fetchAnalysis]);

  const indicators = useMemo(() => {
    if (!data) return [];
    return extractIndicators(data);
  }, [data]);

  const handleSmartAnalysis = async () => {
    if (!data) return;
    setSmartExpanded(true);
    setSmartLoading(true);

    try {
      const indicatorNames = indicators.map((i) => i.name.toLowerCase());
      const result = await api.getSmartProbability(ticker, indicatorNames, period);
      setSmartResult(result);
    } catch {
      setSmartResult(null);
    } finally {
      setSmartLoading(false);
    }
  };

  // -- Loading skeleton --
  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-4 h-4" />
          <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse" />
        </div>
        {/* Header skeleton */}
        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <div className="w-40 h-8 bg-zinc-800 rounded animate-pulse" />
            <div className="w-24 h-5 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="space-y-2 ml-auto">
            <div className="w-28 h-8 bg-zinc-800 rounded animate-pulse" />
            <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        {/* Chart skeleton */}
        <div className="w-full h-[440px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
        {/* Indicators skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // -- Error state --
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm font-mono text-zinc-300">{ticker}</p>
        <p className="text-sm text-red-400">{error}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalysis}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Back to Scanner
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const price = data.price;
  const info = data.ticker_info;
  const combined = data.combined;
  const positive = price.change_pct >= 0;

  // Derive direction from combined win rate
  const combinedOccurrences = combined?.probability?.occurrences ?? 0;
  const hasEnoughData = combinedOccurrences > 0;
  const cPeriods = combined?.probability?.periods;
  const combinedWr5 = (cPeriods?.["5"] ?? cPeriods?.["5d"])?.win_rate;
  const combinedWr20 = (cPeriods?.["20"] ?? cPeriods?.["20d"])?.win_rate;
  const combinedWr60 = (cPeriods?.["60"] ?? cPeriods?.["60d"])?.win_rate;
  const combinedAvg20 = (cPeriods?.["20"] ?? cPeriods?.["20d"])?.avg_return;
  const direction = !hasEnoughData ? "neutral"
    : (combinedWr20 ?? 50) > 50 ? "bullish"
    : (combinedWr20 ?? 50) < 50 ? "bearish"
    : "neutral";

  // 52-week range
  const has52w = price.high_52w != null && price.low_52w != null;
  const range52w =
    has52w && price.high_52w! > price.low_52w!
      ? ((price.current - price.low_52w!) / (price.high_52w! - price.low_52w!)) * 100
      : null;

  // Conditions as bullet list
  const conditions = combined?.conditions ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link
          href="/dashboard"
          className="hover:text-zinc-300 transition-colors"
        >
          Scanner
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-mono font-semibold text-zinc-300">
          {ticker}
        </span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-400">Analysis</span>
      </nav>

      {/* Top section: ticker info + price */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors mt-0.5 shrink-0"
            aria-label="Back to scanner"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
                {info.ticker}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border",
                  direction === "bullish"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : direction === "bearish"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-zinc-700/30 text-zinc-400 border-zinc-700",
                )}
              >
                {direction.charAt(0).toUpperCase() + direction.slice(1)}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {info.name}
              {info.sector && (
                <span className="text-zinc-600"> / {info.sector}</span>
              )}
            </p>
          </div>
        </div>

        {/* Price display */}
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-zinc-100 tracking-tight">
            {formatCurrency(price.current)}
          </div>
          <div
            className={cn(
              "flex items-center justify-end gap-1.5 text-sm font-mono mt-0.5",
              positive ? "text-emerald-400" : "text-red-400",
            )}
          >
            {positive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-semibold">
              {positive ? "+" : ""}{formatCurrency(price.change).replace("$", "$")}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="font-semibold">
              {formatPercent(price.change_pct)}
            </span>
          </div>
        </div>
      </div>

      {/* 52-Week Range + Period selector + Time Machine CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* 52-week range */}
        {has52w && (
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-[11px] text-zinc-500 shrink-0">52W</span>
            <span className="text-xs font-mono text-zinc-500">
              {formatCurrency(price.low_52w!)}
            </span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
              <div
                className="absolute h-full bg-indigo-500/40 rounded-full"
                style={{ width: `${Math.min(range52w ?? 0, 100)}%` }}
              />
              {range52w != null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-400 rounded-full border-2 border-zinc-900 shadow-sm"
                  style={{ left: `${Math.min(Math.max(range52w, 0), 100)}%`, marginLeft: "-5px" }}
                />
              )}
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {formatCurrency(price.high_52w!)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {ANALYSIS_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  period === p.value
                    ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Time Machine CTA */}
          <Link
            href={`/dashboard/time-machine/${ticker}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/15 border border-indigo-500/25 text-sm font-medium text-indigo-400 hover:bg-indigo-600/25 hover:border-indigo-500/40 transition-all"
          >
            <Clock className="w-4 h-4" />
            Time Machine
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <PriceChart ticker={ticker} />
      </div>

      {/* Indicators Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Technical Indicators
          </h2>
          <span className="text-xs text-zinc-600 font-mono ml-auto">
            {indicators.length} active
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.map((ind) => (
            <IndicatorCard
              key={ind.name}
              name={ind.name}
              value={ind.value}
              state={ind.state}
              stateColor={ind.state_color}
              winRate={ind.win_rate}
              avgReturn={ind.avg_return}
              occurrences={ind.occurrences}
            />
          ))}
        </div>
      </div>

      {/* Combined Probability */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header with large score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Target className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">
                Combined Signal
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Based on {combinedOccurrences} historical matches
              </p>
            </div>
          </div>

          {/* Large score number */}
          {hasEnoughData ? (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div
                  className={cn(
                    "text-4xl font-mono font-bold tracking-tight",
                    (combinedWr20 ?? 0) >= 60
                      ? "text-emerald-400"
                      : (combinedWr20 ?? 0) >= 50
                        ? "text-indigo-400"
                        : (combinedWr20 ?? 0) >= 40
                          ? "text-amber-400"
                          : "text-red-400",
                  )}
                >
                  {(combinedWr20 ?? 0).toFixed(1)}%
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Win Rate (20d)
                </div>
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    "text-2xl font-mono font-bold",
                    (combinedAvg20 ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {(combinedAvg20 ?? 0) >= 0 ? "+" : ""}{(combinedAvg20 ?? 0).toFixed(2)}%
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Avg Return (20d)
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center sm:text-right">
              <div className="text-sm font-medium text-amber-400">
                Insufficient data
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Conditions too specific for historical matching
              </div>
            </div>
          )}
        </div>

        {/* Win rate bars by period */}
        {hasEnoughData && (
          <div className="px-5 pb-4 space-y-2">
            {combinedWr5 != null && <WinRateBar label="5d" value={combinedWr5} />}
            {combinedWr20 != null && <WinRateBar label="20d" value={combinedWr20} />}
            {combinedWr60 != null && <WinRateBar label="60d" value={combinedWr60} />}
          </div>
        )}

        {/* Conditions */}
        {conditions.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-800/60">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2.5">
              Active Conditions
            </h4>
            <ul className="space-y-1.5">
              {conditions.map((cond, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-400"
                >
                  <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span className="font-mono text-xs leading-relaxed">
                    {cond}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Smart Analysis button */}
        <div className="px-5 pb-5">
          <button
            onClick={handleSmartAnalysis}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-sm font-medium text-indigo-400 hover:bg-indigo-600/20 transition-colors"
          >
            {smartExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Smart Analysis
          </button>

          {/* Smart Analysis results */}
          {smartExpanded && (
            <div className="mt-3 p-4 rounded-lg bg-zinc-800/40 border border-zinc-800">
              {smartLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              ) : smartResult ? (
                <div className="text-sm text-zinc-300">
                  <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(smartResult, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No smart analysis data available. Try again.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

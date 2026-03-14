"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";

const ANALYSIS_PERIODS = [
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
] as const;

type AnalysisPeriod = (typeof ANALYSIS_PERIODS)[number]["value"];

interface IndicatorData {
  name: string;
  value: number | string;
  state: string;
  state_color: "green" | "red" | "yellow" | "neutral";
  win_rate: number;
  avg_return: number;
  occurrences: number;
}

interface AnalysisData {
  ticker: string;
  company_name: string;
  price: number;
  change: number;
  change_percent: number;
  signal: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  indicators: IndicatorData[];
  combined_probability: number;
  combined_win_rate: number;
}

export default function AnalyzePage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker || "").toUpperCase();

  const [period, setPeriod] = useState<AnalysisPeriod>("10y");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [smartExpanded, setSmartExpanded] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartResult, setSmartResult] = useState<Record<string, unknown> | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const raw = await api.getAnalysis(ticker, period);

      // Map API response to our typed structure
      const result: AnalysisData = {
        ticker: (raw.ticker as string) || ticker,
        company_name: (raw.company_name as string) || ticker,
        price: (raw.price as number) || 0,
        change: (raw.change as number) || 0,
        change_percent: (raw.change_percent as number) || 0,
        signal: (raw.signal as string) || "Unknown",
        direction: (raw.direction as AnalysisData["direction"]) || "neutral",
        strength: (raw.strength as number) || 0,
        indicators: Array.isArray(raw.indicators)
          ? (raw.indicators as IndicatorData[])
          : [],
        combined_probability: (raw.combined_probability as number) || 0,
        combined_win_rate: (raw.combined_win_rate as number) || 0,
      };

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

  const handleSmartAnalysis = async () => {
    if (!data) return;
    setSmartExpanded(true);
    setSmartLoading(true);

    try {
      const indicatorNames = data.indicators.map((i) => i.name);
      const result = await api.getSmartProbability(ticker, indicatorNames, period);
      setSmartResult(result);
    } catch {
      setSmartResult(null);
    } finally {
      setSmartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-32 h-8 bg-zinc-800 rounded animate-pulse" />
          <div className="w-24 h-6 bg-zinc-800 rounded animate-pulse" />
        </div>
        {/* Chart skeleton */}
        <div className="w-full h-[400px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="px-4 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const positive = data.change_percent >= 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Top section: ticker info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100 font-mono">
                {data.ticker}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border",
                  data.direction === "bullish"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : data.direction === "bearish"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-zinc-700/30 text-zinc-400 border-zinc-700",
                )}
              >
                {data.signal}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{data.company_name}</p>
          </div>
          <div className="ml-4">
            <div className="text-2xl font-mono font-bold text-zinc-100">
              ${data.price.toFixed(2)}
            </div>
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-mono",
                positive ? "text-emerald-400" : "text-red-400",
              )}
            >
              {positive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {positive ? "+" : ""}
              {data.change.toFixed(2)} ({positive ? "+" : ""}
              {data.change_percent.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {ANALYSIS_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  period === p.value
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Time Machine link */}
          <Link
            href={`/dashboard/time-machine/${ticker}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Time Machine
          </Link>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <PriceChart ticker={ticker} />
      </div>

      {/* Indicators Grid */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Technical Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.indicators.map((ind) => (
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">
              Combined Signal Probability
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Multi-indicator confluence analysis
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-indigo-400">
                {data.combined_win_rate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-zinc-500">Combined Win Rate</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-zinc-200">
                {data.strength.toFixed(0)}
              </div>
              <div className="text-[10px] text-zinc-500">Strength</div>
            </div>
          </div>
        </div>

        {/* Strength bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              data.strength >= 70
                ? "bg-emerald-500"
                : data.strength >= 50
                  ? "bg-indigo-500"
                  : data.strength >= 30
                    ? "bg-amber-500"
                    : "bg-red-500",
            )}
            style={{ width: `${Math.min(data.strength, 100)}%` }}
          />
        </div>

        {/* Smart Analysis button */}
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
          <span className="ml-auto flex items-center gap-1 text-[10px] text-indigo-500/70">
            <Lock className="w-3 h-3" />
            Pro
          </span>
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
                Upgrade to Pro to unlock Smart Analysis
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

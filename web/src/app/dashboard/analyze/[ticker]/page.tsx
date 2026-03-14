"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api, type AnalysisResponse } from "@/lib/api";
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

interface IndicatorDisplayItem {
  name: string;
  value: number | string;
  state: string;
  state_color: "green" | "red" | "yellow" | "neutral";
  win_rate: number;
  avg_return: number;
  occurrences: number;
}

/** Extract display-friendly indicator list from the nested indicators object */
function extractIndicators(data: AnalysisResponse): IndicatorDisplayItem[] {
  const items: IndicatorDisplayItem[] = [];
  const ind = data.indicators;

  // RSI
  if (ind.rsi) {
    const prob = ind.rsi.probability;
    const wr20 = prob?.periods?.["20d"];
    items.push({
      name: "RSI",
      value: ind.rsi.value ?? "--",
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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
    const wr20 = prob?.periods?.["20d"];
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

export default function AnalyzePage() {
  const params = useParams<{ ticker: string }>();
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-32 h-8 bg-zinc-800 rounded animate-pulse" />
          <div className="w-24 h-6 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="w-full h-[400px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
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

  const price = data.price;
  const info = data.ticker_info;
  const combined = data.combined;
  const positive = price.change_pct >= 0;

  // Derive direction from combined win rate
  const combinedWr20 = combined?.probability?.periods?.["20d"]?.win_rate ?? 50;
  const direction = combinedWr20 > 50 ? "bullish" : combinedWr20 < 50 ? "bearish" : "neutral";
  const signalLabel = combined?.probability?.condition || direction;
  const strength = combined?.probability?.occurrences
    ? Math.min(
        ((combinedWr20 / 100) * 100),
        100,
      )
    : 50;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Top section: ticker info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100 font-mono">
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
          <div className="ml-4">
            <div className="text-2xl font-mono font-bold text-zinc-100">
              ${price.current.toFixed(2)}
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
              {price.change.toFixed(2)} ({positive ? "+" : ""}
              {price.change_pct.toFixed(2)}%)
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">
              Combined Signal Probability
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {signalLabel}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-indigo-400">
                {combinedWr20.toFixed(1)}%
              </div>
              <div className="text-[10px] text-zinc-500">Combined Win Rate (20d)</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-zinc-200">
                {combined?.probability?.occurrences ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500">Occurrences</div>
            </div>
          </div>
        </div>

        {/* Strength bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              combinedWr20 >= 60
                ? "bg-emerald-500"
                : combinedWr20 >= 50
                  ? "bg-indigo-500"
                  : combinedWr20 >= 40
                    ? "bg-amber-500"
                    : "bg-red-500",
            )}
            style={{ width: `${Math.min(combinedWr20, 100)}%` }}
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

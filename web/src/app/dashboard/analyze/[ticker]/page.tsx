"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  api,
  type AnalysisResponse,
  type TimeMachineResponse,
  type PeriodStats,
} from "@/lib/api";
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
  Star,
  Check,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANALYSIS_PERIODS = [
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
] as const;

type AnalysisPeriod = (typeof ANALYSIS_PERIODS)[number]["value"];

/** Canonical indicator keys used by the smart-probability endpoint */
const ALL_INDICATORS = [
  { key: "RSI", label: "RSI" },
  { key: "MACD", label: "MACD" },
  { key: "MA", label: "MA" },
  { key: "BB", label: "BB" },
  { key: "Volume", label: "Volume" },
  { key: "Drawdown", label: "Drawdown" },
  { key: "ADX", label: "ADX" },
  { key: "Stochastic", label: "Stochastic" },
  { key: "MA Distance", label: "MA Dist" },
  { key: "Consecutive", label: "Consec." },
  { key: "52-Week", label: "52-Week" },
] as const;

/** Default indicators included in combined calculation */
const DEFAULT_SELECTED = new Set([
  "RSI",
  "MACD",
  "MA",
  "BB",
  "Drawdown",
  "ADX",
]);

const TIER_ORDER = ["strict", "normal", "relaxed"] as const;
type TierKey = (typeof TIER_ORDER)[number];

const TIER_META: Record<TierKey, { label: string; description: string }> = {
  strict: {
    label: "Strict",
    description: "Tightest conditions, fewest matches, most specific",
  },
  normal: {
    label: "Normal",
    description: "Balanced conditions (recommended)",
  },
  relaxed: {
    label: "Relaxed",
    description: "Widest conditions, most matches, less specific",
  },
};

const FORWARD_PERIODS = ["5", "10", "20", "60", "120", "252"] as const;

const PRESET_DATES = [
  { date: "2020-03-23", label: "COVID Bottom" },
  { date: "2022-01-24", label: "Rate Shock" },
  { date: "2023-10-27", label: "Oct 2023 Low" },
  { date: "2024-11-06", label: "2024 Election" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IndicatorDisplayItem {
  name: string;
  value: number | string;
  state: string;
  state_color: "green" | "red" | "yellow" | "neutral";
  win_rate: number;
  avg_return: number;
  occurrences: number;
}

interface SmartTierData {
  occurrences: number;
  periods: Record<string, PeriodStats>;
}

interface SmartResult {
  tiers: Record<string, SmartTierData>;
  best_tier: string;
  individuals: Record<string, unknown>;
  selected: string[];
  data_days: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePeriod(
  periods:
    | Record<string, { win_rate: number; avg_return: number; samples: number }>
    | undefined,
  key: string,
) {
  if (!periods) return undefined;
  return periods[key] ?? periods[`${key}d`];
}

const INDICATOR_PERIODS = ["5", "10", "20", "60", "120", "252"] as const;
type IndicatorPeriod = (typeof INDICATOR_PERIODS)[number];

const INDICATOR_PERIOD_LABELS: Record<IndicatorPeriod, string> = {
  "5": "5d",
  "10": "10d",
  "20": "20d",
  "60": "60d",
  "120": "120d",
  "252": "252d",
};

function extractIndicators(data: AnalysisResponse, periodKey: IndicatorPeriod = "20"): IndicatorDisplayItem[] {
  const items: IndicatorDisplayItem[] = [];
  const ind = data.indicators;

  if (ind.rsi) {
    const prob = ind.rsi.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "RSI",
      value: ind.rsi.value != null ? ind.rsi.value.toFixed(1) : "--",
      state:
        prob?.condition ||
        (ind.rsi.value != null ? `RSI ${ind.rsi.value.toFixed(0)}` : "N/A"),
      state_color:
        ind.rsi.value != null
          ? ind.rsi.value > 70
            ? "red"
            : ind.rsi.value < 30
              ? "green"
              : "neutral"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.macd) {
    const prob = ind.macd.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "MACD",
      value: ind.macd.macd != null ? ind.macd.macd.toFixed(2) : "--",
      state: ind.macd.event || prob?.condition || "N/A",
      state_color:
        ind.macd.histogram != null
          ? ind.macd.histogram > 0
            ? "green"
            : "red"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.ma) {
    const prob = ind.ma.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "Moving Averages",
      value: ind.ma.alignment || "--",
      state: prob?.condition || ind.ma.alignment || "N/A",
      state_color: ind.ma.alignment?.toLowerCase().includes("bullish")
        ? "green"
        : ind.ma.alignment?.toLowerCase().includes("bearish")
          ? "red"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.bb) {
    const prob = ind.bb.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "Bollinger Bands",
      value:
        ind.bb.zone ||
        (ind.bb.position != null
          ? `${(ind.bb.position * 100).toFixed(0)}%`
          : "--"),
      state: ind.bb.zone || prob?.condition || "N/A",
      state_color:
        ind.bb.zone === "upper"
          ? "red"
          : ind.bb.zone === "lower"
            ? "green"
            : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.volume) {
    const prob = ind.volume.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    const ratio = ind.volume.ratio;
    items.push({
      name: "Volume",
      value: ratio != null ? `${ratio.toFixed(2)}x` : "--",
      state:
        prob?.condition ||
        (ratio != null
          ? ratio > 1.5
            ? "High Volume"
            : ratio < 0.5
              ? "Low Volume"
              : "Normal"
          : "N/A"),
      state_color:
        ratio != null
          ? ratio > 1.5
            ? "yellow"
            : ratio < 0.5
              ? "yellow"
              : "neutral"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.stochastic) {
    const prob = ind.stochastic.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "Stochastic",
      value: ind.stochastic.k != null ? ind.stochastic.k.toFixed(1) : "--",
      state: prob?.condition || "N/A",
      state_color:
        ind.stochastic.k != null
          ? ind.stochastic.k > 80
            ? "red"
            : ind.stochastic.k < 20
              ? "green"
              : "neutral"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.drawdown) {
    const prob = ind.drawdown.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    const dd = ind.drawdown.from_252d_high;
    items.push({
      name: "Drawdown",
      value: dd != null ? `${dd.toFixed(1)}%` : "--",
      state: prob?.condition || "N/A",
      state_color:
        dd != null
          ? dd < -20
            ? "red"
            : dd < -10
              ? "yellow"
              : "green"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.adx) {
    const prob = ind.adx.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "ADX",
      value: ind.adx.adx != null ? ind.adx.adx.toFixed(1) : "--",
      state: ind.adx.trend_strength || prob?.condition || "N/A",
      state_color:
        ind.adx.adx != null ? (ind.adx.adx > 25 ? "green" : "neutral") : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.atr) {
    const prob = ind.atr.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "ATR",
      value: ind.atr.atr_pct != null ? `${ind.atr.atr_pct.toFixed(2)}%` : "--",
      state: prob?.condition || "N/A",
      state_color: "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.ma_distance) {
    const prob = ind.ma_distance.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    const d20 = ind.ma_distance.from_sma20;
    items.push({
      name: "MA Distance",
      value: d20 != null ? `${d20.toFixed(2)}%` : "--",
      state: prob?.condition || "N/A",
      state_color:
        d20 != null
          ? d20 > 5
            ? "yellow"
            : d20 < -5
              ? "yellow"
              : "neutral"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.consecutive) {
    const prob = ind.consecutive.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    items.push({
      name: "Consecutive Days",
      value: `${ind.consecutive.days}d ${ind.consecutive.streak_type}`,
      state:
        prob?.condition ||
        `${ind.consecutive.days}d ${ind.consecutive.streak_type}`,
      state_color:
        ind.consecutive.streak_type === "up"
          ? "green"
          : ind.consecutive.streak_type === "down"
            ? "red"
            : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  if (ind.week52) {
    const prob = ind.week52.probability;
    const wrP = resolvePeriod(prob?.periods, periodKey);
    const pos = ind.week52.position_pct;
    items.push({
      name: "52-Week Range",
      value: pos != null ? `${pos.toFixed(0)}%` : "--",
      state: prob?.condition || "N/A",
      state_color:
        pos != null
          ? pos > 80
            ? "green"
            : pos < 20
              ? "red"
              : "neutral"
          : "neutral",
      win_rate: wrP?.win_rate ?? 0,
      avg_return: wrP?.avg_return ?? 0,
      occurrences: prob?.occurrences ?? 0,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Horizontal win-rate bar */
function WinRateBar({ label, value }: { label: string; value: number }) {
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
          className={cn(
            "h-full rounded-full transition-all duration-700",
            barColor,
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span
        className={cn("text-xs font-mono font-semibold w-14 text-right", textColor)}
      >
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

/** Tier card showing occurrences + forward period stats */
function TierCard({
  tierKey,
  tierData,
  isBest,
  isActive,
  onClick,
}: {
  tierKey: TierKey;
  tierData: SmartTierData | undefined;
  isBest: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const meta = TIER_META[tierKey];
  const isEmpty = !tierData || tierData.occurrences === 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-0 p-4 rounded-xl border text-left transition-all",
        isActive
          ? "bg-zinc-800/80 border-indigo-500/40 ring-1 ring-indigo-500/20"
          : isEmpty
            ? "bg-zinc-900/40 border-zinc-800/50 opacity-50 cursor-default"
            : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer",
      )}
      disabled={isEmpty}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-sm font-semibold",
            isActive ? "text-zinc-100" : "text-zinc-400",
          )}
        >
          {meta.label}
        </span>
        {isBest && (
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        )}
      </div>
      <div className="text-xs text-zinc-500">{meta.description}</div>
      <div
        className={cn(
          "mt-2 text-lg font-mono font-bold",
          isEmpty ? "text-zinc-600" : "text-zinc-200",
        )}
      >
        {isEmpty ? "0" : tierData.occurrences}
        <span className="text-xs font-normal text-zinc-500 ml-1">matches</span>
      </div>
    </button>
  );
}

/** Time machine mini-card for preset date */
function TimeMachinePreviewCard({
  presetDate,
  presetLabel,
  ticker,
}: {
  presetDate: string;
  presetLabel: string;
  ticker: string;
}) {
  const [data, setData] = useState<TimeMachineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .getTimeMachine(ticker, presetDate)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker, presetDate]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse min-h-[100px]">
        <div className="w-24 h-4 bg-zinc-800 rounded mb-2" />
        <div className="w-32 h-3 bg-zinc-800 rounded mb-3" />
        <div className="w-20 h-5 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[100px]">
        <div className="text-xs font-semibold text-zinc-400 mb-1">
          {presetLabel}
        </div>
        <div className="text-[11px] text-zinc-600 font-mono mb-2">
          {presetDate}
        </div>
        <div className="text-xs text-zinc-600">Data unavailable</div>
      </div>
    );
  }

  const wasCorrect = data.accuracy?.was_correct;
  const actualDir = data.accuracy?.actual_direction;
  // Pick the longest-term actual return available
  const actualKeys = Object.keys(data.actual || {}).sort(
    (a, b) => parseInt(b) - parseInt(a),
  );
  const bestActual = actualKeys.length > 0 ? data.actual[actualKeys[0]] : null;
  const returnPct = bestActual?.return_pct;

  return (
    <Link
      href={`/dashboard/time-machine/${ticker}?date=${presetDate}`}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors block group min-h-[100px]"
    >
      <div className="flex items-start justify-between mb-1">
        <div className="text-xs font-semibold text-zinc-300">{presetLabel}</div>
        {wasCorrect === true && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        {wasCorrect === false && (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
      </div>
      <div className="text-[11px] text-zinc-600 font-mono mb-2">
        {presetDate}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-mono font-bold",
            wasCorrect === true
              ? "text-emerald-400"
              : wasCorrect === false
                ? "text-red-400"
                : "text-zinc-500",
          )}
        >
          {wasCorrect === true ? "CORRECT" : wasCorrect === false ? "INCORRECT" : "NO SIGNAL"}
        </span>
        {returnPct != null && (
          <span
            className={cn(
              "text-xs font-mono",
              returnPct >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {returnPct >= 0 ? "+" : ""}
            {returnPct.toFixed(1)}%
          </span>
        )}
      </div>

      {actualDir && (
        <div className="text-[11px] text-zinc-500 mt-1">
          Market went {actualDir}
        </div>
      )}

      <div className="text-[10px] text-indigo-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        View details
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AnalyzePage() {
  const params = useParams<{ ticker: string }>();
  const router = useRouter();
  const ticker = (params.ticker || "").toUpperCase();

  // Core analysis
  const [period, setPeriod] = useState<AnalysisPeriod>("10y");
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Smart combined signal
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(
    () => new Set(DEFAULT_SELECTED),
  );
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartResult, setSmartResult] = useState<SmartResult | null>(null);
  const [activeTier, setActiveTier] = useState<TierKey>("normal");

  // Individual indicators collapsible
  const [indicatorsExpanded, setIndicatorsExpanded] = useState(false);

  // Indicator probability period selector
  const [indicatorPeriod, setIndicatorPeriod] = useState<IndicatorPeriod>("20");

  // Fetch analysis
  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getAnalysis(ticker, period);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analysis",
      );
    } finally {
      setLoading(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    if (ticker) fetchAnalysis();
  }, [ticker, fetchAnalysis]);

  const indicators = useMemo(() => {
    if (!data) return [];
    return extractIndicators(data, indicatorPeriod);
  }, [data, indicatorPeriod]);

  // Fetch smart probability whenever selection changes (with debounce)
  const fetchSmartProbability = useCallback(
    async (selected: Set<string>) => {
      if (selected.size < 2) return;
      setSmartLoading(true);
      try {
        // API expects original case: "RSI", "MACD", "MA", "BB", etc.
        const indicatorNames = Array.from(selected);
        const result = await api.getSmartProbability(
          ticker,
          indicatorNames,
          period,
        );
        setSmartResult(result as unknown as SmartResult);
        // Auto-select best tier
        if (
          result &&
          typeof result === "object" &&
          "best_tier" in result &&
          typeof result.best_tier === "string"
        ) {
          setActiveTier(result.best_tier as TierKey);
        }
      } catch {
        setSmartResult(null);
      } finally {
        setSmartLoading(false);
      }
    },
    [ticker, period],
  );

  // Track selected indicators as a serialized string for dependency comparison
  const selectedKey = Array.from(selectedIndicators).sort().join(",");

  // Auto-fetch smart probability on initial load + when selection/period changes
  useEffect(() => {
    if (data && selectedIndicators.size >= 2) {
      fetchSmartProbability(selectedIndicators);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, period, selectedKey]);

  const handleToggleIndicator = useCallback(
    (key: string) => {
      setSelectedIndicators((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          if (next.size <= 2) return prev;
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  // Active tier data
  const activeTierData = smartResult?.tiers?.[activeTier];

  // Derive direction from combined or smart result
  const combined = data?.combined;
  const cPeriods = combined?.probability?.periods;
  const combinedWr20 =
    (cPeriods?.["20"] ?? cPeriods?.["20d"])?.win_rate ?? 50;
  const direction =
    combinedWr20 > 50 ? "bullish" : combinedWr20 < 50 ? "bearish" : "neutral";

  // -- Loading skeleton --
  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="flex items-center gap-2">
          <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="w-4 h-4" />
          <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse" />
        </div>
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
        <div className="w-full h-[440px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
        {/* Combined signal skeleton */}
        <div className="w-full h-[300px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
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
  const positive = price.change_pct >= 0;

  // 52-week range
  const has52w = price.high_52w != null && price.low_52w != null;
  const range52w =
    has52w && price.high_52w! > price.low_52w!
      ? ((price.current - price.low_52w!) / (price.high_52w! - price.low_52w!)) *
        100
      : null;

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
        <span className="font-mono font-semibold text-zinc-300">{ticker}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-400">Analysis</span>
      </nav>

      {/* Top section: ticker info + price */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-5">
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
              {positive ? "+" : ""}
              {formatCurrency(price.change).replace("$", "$")}
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
                  style={{
                    left: `${Math.min(Math.max(range52w, 0), 100)}%`,
                    marginLeft: "-5px",
                  }}
                />
              )}
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {formatCurrency(price.high_52w!)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
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

      {/* ================================================================= */}
      {/* COMBINED SIGNAL (prominent, above individual indicators)          */}
      {/* ================================================================= */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">
                Combined Signal
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select indicators to customize the combined probability
              </p>
            </div>
            {smartLoading && (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin ml-auto" />
            )}
          </div>

          {/* Indicator toggle chips */}
          <div className="flex flex-wrap gap-2">
            {ALL_INDICATORS.map(({ key, label }) => {
              const isSelected = selectedIndicators.has(key);
              const wouldBeUnderMin =
                isSelected && selectedIndicators.size <= 2;

              return (
                <button
                  key={key}
                  onClick={() => handleToggleIndicator(key)}
                  disabled={wouldBeUnderMin}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    isSelected
                      ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/25"
                      : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600",
                    wouldBeUnderMin && "opacity-60 cursor-not-allowed",
                  )}
                  title={
                    wouldBeUnderMin
                      ? "Minimum 2 indicators required"
                      : isSelected
                        ? `Remove ${key} from combined signal`
                        : `Add ${key} to combined signal`
                  }
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier selector cards */}
        {smartResult?.tiers ? (
          <>
            <div className="px-5 pb-4">
              <div className="flex gap-3">
                {TIER_ORDER.map((tk) => (
                  <TierCard
                    key={tk}
                    tierKey={tk}
                    tierData={smartResult.tiers[tk]}
                    isBest={smartResult.best_tier === tk}
                    isActive={activeTier === tk}
                    onClick={() => {
                      if (smartResult.tiers[tk]?.occurrences > 0) {
                        setActiveTier(tk);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Active tier detail */}
            {activeTierData && activeTierData.occurrences > 0 ? (
              <div className="px-5 pb-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-200">
                    {TIER_META[activeTier].label}
                  </span>
                  {smartResult.best_tier === activeTier && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      Recommended
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 font-mono ml-auto">
                    {activeTierData.occurrences} historical matches
                  </span>
                </div>

                {/* Forward period stats */}
                <div className="space-y-2">
                  {FORWARD_PERIODS.map((fp) => {
                    const pd =
                      activeTierData.periods[fp] ??
                      activeTierData.periods[`${fp}d`];
                    if (!pd) return null;
                    return (
                      <div key={fp} className="flex items-center gap-4">
                        <WinRateBar label={fp === "252" ? "1Y" : `${fp}d`} value={pd.win_rate} />
                        <span
                          className={cn(
                            "text-xs font-mono font-semibold w-16 text-right shrink-0",
                            pd.avg_return >= 0
                              ? "text-emerald-400"
                              : "text-red-400",
                          )}
                        >
                          {pd.avg_return >= 0 ? "+" : ""}
                          {pd.avg_return.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-5 pb-5 text-center py-6">
                <p className="text-sm text-zinc-500">
                  No historical matches for the {TIER_META[activeTier].label}{" "}
                  tier. Try a different tier or adjust your indicator selection.
                </p>
              </div>
            )}
          </>
        ) : smartLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          /* Fallback: show original combined data from the analysis response */
          <CombinedFallback combined={combined} />
        )}
      </div>

      {/* ================================================================= */}
      {/* INDIVIDUAL INDICATORS (collapsible)                               */}
      {/* ================================================================= */}
      <div>
        <button
          onClick={() => setIndicatorsExpanded(!indicatorsExpanded)}
          className="flex items-center gap-2 w-full mb-4 group"
        >
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Individual Indicators
          </h2>
          <span className="text-xs text-zinc-600 font-mono">
            {indicators.length} active
          </span>
          <div className="flex-1" />
          <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
            {indicatorsExpanded ? "Collapse" : "Expand All"}
          </span>
          {indicatorsExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {/* Probability period selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] text-zinc-600">Show probabilities for:</span>
          <div className="flex items-center bg-zinc-800/60 rounded-md p-0.5 gap-0.5">
            {INDICATOR_PERIODS.map((ip) => (
              <button
                key={ip}
                onClick={() => setIndicatorPeriod(ip)}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-all",
                  indicatorPeriod === ip
                    ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40",
                )}
              >
                {INDICATOR_PERIOD_LABELS[ip]}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsed: compact summary rows */}
        {!indicatorsExpanded && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
            {indicators.map((ind) => (
              <IndicatorCompactRow key={ind.name} indicator={ind} />
            ))}
          </div>
        )}

        {/* Expanded: full cards */}
        {indicatorsExpanded && (
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
                periodLabel={INDICATOR_PERIOD_LABELS[indicatorPeriod]}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* TIME MACHINE HIGHLIGHTS                                           */}
      {/* ================================================================= */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Time Machine Highlights
          </h2>
          <Link
            href={`/dashboard/time-machine/${ticker}`}
            className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            Explore more dates
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESET_DATES.map((preset) => (
            <TimeMachinePreviewCard
              key={preset.date}
              presetDate={preset.date}
              presetLabel={preset.label}
              ticker={ticker}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact indicator row (collapsed view)
// ---------------------------------------------------------------------------

function IndicatorCompactRow({
  indicator,
}: {
  indicator: IndicatorDisplayItem;
}) {
  const badgeStyles = {
    green: "bg-emerald-500/15 text-emerald-400",
    red: "bg-red-500/15 text-red-400",
    yellow: "bg-amber-500/15 text-amber-400",
    neutral: "bg-zinc-700/40 text-zinc-400",
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="text-xs font-medium text-zinc-400 w-32 shrink-0 truncate">
        {indicator.name}
      </span>
      <span className="text-sm font-mono font-bold text-zinc-200 w-20 shrink-0 text-right">
        {typeof indicator.value === "number"
          ? indicator.value.toFixed(2)
          : indicator.value}
      </span>
      <span
        className={cn(
          "px-2 py-0.5 rounded text-[10px] font-semibold shrink-0",
          badgeStyles[indicator.state_color],
        )}
      >
        {indicator.state_color === "green"
          ? "Bullish"
          : indicator.state_color === "red"
            ? "Bearish"
            : indicator.state_color === "yellow"
              ? "Unusual"
              : "Neutral"}
      </span>
      <div className="flex-1" />
      {indicator.win_rate > 0 && (
        <span
          className={cn(
            "text-xs font-mono font-semibold",
            indicator.win_rate >= 60
              ? "text-emerald-400"
              : indicator.win_rate <= 40
                ? "text-red-400"
                : "text-zinc-400",
          )}
        >
          {indicator.win_rate.toFixed(1)}%
        </span>
      )}
      {indicator.occurrences > 0 && (
        <span className="text-[11px] text-zinc-600 font-mono">
          n={indicator.occurrences}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback combined section (when smart-probability hasn't loaded)
// ---------------------------------------------------------------------------

function CombinedFallback({
  combined,
}: {
  combined: AnalysisResponse["combined"];
}) {
  if (!combined) {
    return (
      <div className="px-5 pb-5 text-center py-6">
        <p className="text-sm text-zinc-500">
          No combined signal data available. The smart analysis is loading...
        </p>
      </div>
    );
  }

  const prob = combined.probability;
  const occurrences = prob?.occurrences ?? 0;
  const periods = prob?.periods;

  const ALL_PERIODS = [
    { key: "5", label: "5d" },
    { key: "10", label: "10d" },
    { key: "20", label: "20d" },
    { key: "60", label: "60d" },
    { key: "120", label: "120d" },
    { key: "252", label: "1Y" },
  ];

  const getPeriod = (k: string) => periods?.[k] ?? periods?.[k + "d"];

  const hasData = occurrences > 0;

  return (
    <div className="px-5 pb-5">
      {hasData ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-mono">
              {occurrences} historical matches
            </span>
          </div>
          <div className="space-y-2">
            {ALL_PERIODS.map(({ key, label }) => {
              const p = getPeriod(key);
              if (!p) return null;
              const wr = p.win_rate;
              const avg = p.avg_return;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 font-mono w-8 text-right shrink-0">{label}</span>
                  <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        wr >= 60 ? "bg-emerald-500" : wr >= 40 ? "bg-indigo-500" : "bg-red-500",
                      )}
                      style={{ width: `${Math.max(wr, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white drop-shadow">
                      {wr.toFixed(1)}%
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs font-mono w-16 text-right shrink-0",
                    avg >= 0 ? "text-emerald-400" : "text-red-400",
                  )}>
                    {avg >= 0 ? "+" : ""}{avg.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-sm font-medium text-amber-400">
            Insufficient data
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Conditions too specific for historical matching
          </div>
        </div>
      )}
    </div>
  );
}

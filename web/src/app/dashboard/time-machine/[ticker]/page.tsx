"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  Check,
  Share2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_INDICATORS = [
  { key: "RSI", label: "RSI" },
  { key: "MACD", label: "MACD" },
  { key: "MA", label: "MA" },
  { key: "BB", label: "BB" },
  { key: "Vol", label: "Volume" },
  { key: "Drawdown", label: "Drawdown" },
  { key: "ADX", label: "ADX" },
  { key: "Stoch", label: "Stochastic" },
  { key: "MADist", label: "MA Dist" },
  { key: "Consec", label: "Consec." },
  { key: "W52", label: "52-Week" },
] as const;

const DEFAULT_SELECTED = new Set(["RSI", "MACD", "MA", "BB", "Drawdown", "ADX"]);

const PRESET_DATES = [
  { date: "2016-11-09", labelKey: "tm.preset.trumpElection" as TranslationKey, descKey: "tm.presetDesc.trumpElection" as TranslationKey, emoji: "\u{1F5F3}\uFE0F" },
  { date: "2018-02-05", labelKey: "tm.preset.volmageddon" as TranslationKey, descKey: "tm.presetDesc.volmageddon" as TranslationKey, emoji: "\u{1F4A5}" },
  { date: "2018-12-24", labelKey: "tm.preset.christmasEveCrash" as TranslationKey, descKey: "tm.presetDesc.christmasEveCrash" as TranslationKey, emoji: "\u{1F384}" },
  { date: "2019-06-03", labelKey: "tm.preset.tradeWarLow" as TranslationKey, descKey: "tm.presetDesc.tradeWarLow" as TranslationKey, emoji: "\u{1F3D7}\uFE0F" },
  { date: "2020-02-19", labelKey: "tm.preset.preCovidHigh" as TranslationKey, descKey: "tm.presetDesc.preCovidHigh" as TranslationKey, emoji: "\u{1F4C8}" },
  { date: "2020-03-23", labelKey: "tm.preset.covidBottom" as TranslationKey, descKey: "tm.presetDesc.covidBottom" as TranslationKey, emoji: "\u{1F4C9}" },
  { date: "2020-09-02", labelKey: "tm.preset.techBubblePop" as TranslationKey, descKey: "tm.presetDesc.techBubblePop" as TranslationKey, emoji: "\u{1FAE7}" },
  { date: "2020-11-09", labelKey: "tm.preset.vaccineDay" as TranslationKey, descKey: "tm.presetDesc.vaccineDay" as TranslationKey, emoji: "\u{1F489}" },
  { date: "2021-01-27", labelKey: "tm.preset.gamestopSqueeze" as TranslationKey, descKey: "tm.presetDesc.gamestopSqueeze" as TranslationKey, emoji: "\u{1F680}" },
  { date: "2021-09-20", labelKey: "tm.preset.evergrandePanic" as TranslationKey, descKey: "tm.presetDesc.evergrandePanic" as TranslationKey, emoji: "\u{1F3DA}\uFE0F" },
  { date: "2021-11-19", labelKey: "tm.preset.2021MarketPeak" as TranslationKey, descKey: "tm.presetDesc.2021MarketPeak" as TranslationKey, emoji: "\u{1F3D4}\uFE0F" },
  { date: "2022-01-03", labelKey: "tm.preset.rateShock" as TranslationKey, descKey: "tm.presetDesc.rateShock" as TranslationKey, emoji: "\u{1F3E6}" },
  { date: "2022-06-16", labelKey: "tm.preset.2022BearMarket" as TranslationKey, descKey: "tm.presetDesc.2022BearMarket" as TranslationKey, emoji: "\u{1F43B}" },
  { date: "2022-10-13", labelKey: "tm.preset.cpiReversal" as TranslationKey, descKey: "tm.presetDesc.cpiReversal" as TranslationKey, emoji: "\u{1F504}" },
  { date: "2023-01-03", labelKey: "tm.preset.aiRallyStart" as TranslationKey, descKey: "tm.presetDesc.aiRallyStart" as TranslationKey, emoji: "\u{1F916}" },
  { date: "2023-03-10", labelKey: "tm.preset.svbCrisis" as TranslationKey, descKey: "tm.presetDesc.svbCrisis" as TranslationKey, emoji: "\u{1F3DA}\uFE0F" },
  { date: "2023-10-27", labelKey: "tm.preset.oct2023Low" as TranslationKey, descKey: "tm.presetDesc.oct2023Low" as TranslationKey, emoji: "\u{1F4CA}" },
  { date: "2024-04-19", labelKey: "tm.preset.iranIsrael" as TranslationKey, descKey: "tm.presetDesc.iranIsrael" as TranslationKey, emoji: "\u26A0\uFE0F" },
  { date: "2024-07-11", labelKey: "tm.preset.rotationDay" as TranslationKey, descKey: "tm.presetDesc.rotationDay" as TranslationKey, emoji: "\u{1F500}" },
  { date: "2024-08-05", labelKey: "tm.preset.yenCarry" as TranslationKey, descKey: "tm.presetDesc.yenCarry" as TranslationKey, emoji: "\u{1F1EF}\u{1F1F5}" },
  { date: "2024-11-05", labelKey: "tm.preset.2024Election" as TranslationKey, descKey: "tm.presetDesc.2024Election" as TranslationKey, emoji: "\u{1F5F3}\uFE0F" },
  { date: "2025-01-27", labelKey: "tm.preset.deepseekCrash" as TranslationKey, descKey: "tm.presetDesc.deepseekCrash" as TranslationKey, emoji: "\u{1F916}" },
  { date: "2025-04-02", labelKey: "tm.preset.tariffShock" as TranslationKey, descKey: "tm.presetDesc.tariffShock" as TranslationKey, emoji: "\u{1F4E6}" },
] as const;

const PERIOD_TABS = [
  { key: "5", label: "1W", fullLabel: "5 days" },
  { key: "20", label: "1M", fullLabel: "20 days" },
  { key: "60", label: "3M", fullLabel: "60 days" },
] as const;

function getPresetsByYear() {
  const yearMap = new Map<string, (typeof PRESET_DATES)[number][]>();
  for (const preset of PRESET_DATES) {
    const year = preset.date.slice(0, 4);
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year)!.push(preset);
  }
  return Array.from(yearMap.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((year) => ({ year, dates: yearMap.get(year)! }));
}

const PRESET_GROUPS = getPresetsByYear();
const FEATURED_DATES = ["2020-03-23", "2023-01-03", "2024-08-05", "2025-01-27"];

function humanDate(dateStr: string, locale?: string): string {
  const loc = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(loc, {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Signal Strength Gauge (SVG semicircle)
// ---------------------------------------------------------------------------
function SignalGauge({ winRate, gaugeLabels }: { winRate: number; gaugeLabels: { strong: string; neutral: string; weak: string } }) {
  const radius = 40;
  const circumference = Math.PI * radius;
  const pct = Math.max(0, Math.min(100, winRate));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 60 ? "#34d399" : pct >= 40 ? "#eab308" : "#f87171";
  const bgColor = pct >= 60 ? "rgba(34,197,94,0.1)" : pct >= 40 ? "rgba(234,179,8,0.1)" : "rgba(248,113,113,0.1)";
  const label = pct >= 60 ? gaugeLabels.strong : pct >= 40 ? gaugeLabels.neutral : gaugeLabels.weak;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="60" viewBox="0 0 100 60" className="overflow-visible">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-zinc-800" />
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="animate-gauge" />
      </svg>
      <div className="flex flex-col items-center -mt-8">
        <span className="text-2xl font-mono font-bold tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded-full" style={{ color, backgroundColor: bgColor }}>{label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forward Return Bar
// ---------------------------------------------------------------------------
function ReturnBar({ label, value, maxAbsValue, delay }: { label: string; value: number; maxAbsValue: number; delay: number }) {
  const pct = maxAbsValue > 0 ? (Math.abs(value) / maxAbsValue) * 100 : 0;
  const isPositive = value >= 0;
  return (
    <div className="flex items-center gap-3 opacity-0 animate-slide-in-right" style={{ animationDelay: `${delay}ms` }}>
      <span className="text-xs font-mono text-zinc-500 w-8 text-right shrink-0">{label}</span>
      <div className="flex-1 h-7 bg-zinc-800/40 rounded-md overflow-hidden relative">
        <div
          className={cn("h-full rounded-md animate-fill-bar", isPositive ? "bg-gradient-to-r from-emerald-500/60 to-emerald-400/80" : "bg-gradient-to-r from-red-500/60 to-red-400/80")}
          style={{ width: `${Math.max(2, pct)}%`, animationDelay: `${delay + 100}ms` }}
        />
        <span className={cn("absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold tabular-nums", isPositive ? "text-emerald-300" : "text-red-300")}>
          {formatPercent(value)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribution Bar
// ---------------------------------------------------------------------------
function DistributionBar({ winRate, animated, className, wentUpLabel }: { winRate: number; animated?: boolean; className?: string; wentUpLabel?: string }) {
  const greenWidth = Math.max(0, Math.min(100, winRate));
  const displayText = wentUpLabel ? wentUpLabel.replace("{pct}", greenWidth.toFixed(0)) : `${greenWidth.toFixed(0)}% went up`;
  return (
    <div className={cn("relative h-6 rounded-full overflow-hidden bg-zinc-800", className)}>
      <div className={cn("absolute inset-y-0 left-0 rounded-l-full bg-emerald-500/60", animated && "animate-fill-bar")} style={{ width: `${greenWidth}%` }} />
      <div className="absolute inset-y-0 right-0 rounded-r-full bg-red-500/40" style={{ width: `${100 - greenWidth}%` }} />
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold text-white/90 tabular-nums">{displayText}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Percentile Bar
// ---------------------------------------------------------------------------
function PercentileBar({ percentile, actualReturn, worstLabel = "Worst", bestLabel = "Best" }: { percentile: number; actualReturn: number; worstLabel?: string; bestLabel?: string }) {
  const pos = Math.max(2, Math.min(98, percentile));
  return (
    <div className="relative">
      <div className="h-3 rounded-full bg-gradient-to-r from-red-500/30 via-zinc-700 to-emerald-500/30 overflow-hidden" />
      <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-full" style={{ left: `${pos}%` }} />
      <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-mono font-bold tabular-nums whitespace-nowrap" style={{ left: `${pos}%`, color: actualReturn >= 0 ? "#34d399" : "#f87171" }}>
        {formatPercent(actualReturn)}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-zinc-600"><span>{worstLabel}</span><span>{bestLabel}</span></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TimeMachinePage() {
  const { t, locale } = useI18n();
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
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(() => new Set(DEFAULT_SELECTED));
  const [revealed, setRevealed] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [expandedPresets, setExpandedPresets] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const handleToggleIndicator = useCallback((key: string) => {
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
  }, []);

  const runTimeMachine = useCallback(async (date: string) => {
    if (!date) return;
    setSelectedDate(date);
    setLoading(true);
    setError(null);
    setResult(null);
    setRevealed(false);
    try {
      const data = await api.getTimeMachine(ticker, date);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { if (initialDate) runTimeMachine(initialDate); }, [initialDate, runTimeMachine]);
  useEffect(() => { if (revealed && resultsRef.current) resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [revealed]);

  const totalReturn = result && result.price_at_date > 0 ? ((result.current_price - result.price_at_date) / result.price_at_date) * 100 : 0;
  const activePeriodData = result?.signal.win_rates?.[activePeriod];
  const activeBaseline = result?.baseline?.[activePeriod];
  const activeActual = result?.actual?.[activePeriod];
  const signalWinRate = activePeriodData ?? null;
  const baselineWinRate = activeBaseline?.win_rate ?? null;
  const baselineAvgReturn = activeBaseline?.avg_return ?? null;
  const edgeWinRate = signalWinRate != null && baselineWinRate != null ? signalWinRate - baselineWinRate : null;

  const filteredConditions = useMemo(() => {
    if (!result) return [];
    return result.signal.conditions.filter((cond) => {
      const key = cond.indicator.toUpperCase();
      return selectedIndicators.has(key) ||
        (key === "MOVING AVERAGES" && selectedIndicators.has("MA")) ||
        (key === "BOLLINGER BANDS" && selectedIndicators.has("BB")) ||
        (key === "VOLUME" && selectedIndicators.has("Vol")) ||
        (key === "STOCHASTIC" && selectedIndicators.has("Stoch")) ||
        (key === "MA DIST" && selectedIndicators.has("MADist")) ||
        (key === "CONSEC" && selectedIndicators.has("Consec")) ||
        (key === "52-WEEK" && selectedIndicators.has("W52")) ||
        (key === "W52" && selectedIndicators.has("W52"));
    });
  }, [result, selectedIndicators]);

  const forwardReturns = result
    ? Object.entries(result.actual).map(([period, data]) => ({
        period,
        label: period === "5" ? "1W" : period === "20" ? "1M" : period === "60" ? "3M" : period === "120" ? "6M" : period === "252" ? "1Y" : `${period}d`,
        returnPct: data.return_pct,
        endPrice: data.end_price,
      }))
    : [];
  const maxAbsReturn = Math.max(...forwardReturns.map((r) => Math.abs(r.returnPct)), 1);

  const handleShare = () => {
    if (!result) return;
    const bestReturn = forwardReturns.length > 0 ? forwardReturns.reduce((best, r) => Math.abs(r.returnPct) > Math.abs(best.returnPct) ? r : best, forwardReturns[0]) : null;
    const winRate20 = result.signal.win_rates?.["20"] ?? result.signal.win_rate_20d;
    const text = [
      t("tm.shareWhatIf").replace("{ticker}", ticker).replace("{date}", humanDate(result.date, locale)),
      t("tm.shareSignal").replace("{conditions}", result.signal.conditions.map((c) => c.indicator.toUpperCase()).join(" + ")).replace("{winRate}", winRate20?.toFixed(0) ?? ""),
      bestReturn ? t("tm.shareResult").replace("{returnPct}", formatPercent(bestReturn.returnPct)).replace("{label}", bestReturn.label) : null,
      t("tm.shareExplored"),
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => { setShareToast(true); setTimeout(() => setShareToast(false), 2000); });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const resultGradient = result && totalReturn >= 0 ? "from-emerald-500/[0.03] to-transparent" : "from-red-500/[0.03] to-transparent";
  const visiblePresetGroups = expandedPresets ? PRESET_GROUPS : PRESET_GROUPS.slice(0, 3);

  return (
    <div className="px-3 py-4 sm:p-4 md:p-6 max-w-5xl space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">{t("nav.scanner")}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/dashboard/analyze/${ticker}`} className="hover:text-zinc-300 transition-colors font-mono font-semibold">{ticker}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-400">{t("tm.timeMachine")}</span>
      </nav>

      {/* Hero Question */}
      <div className="relative">
        <Link href={`/dashboard/analyze/${ticker}`} className="absolute left-0 top-1 flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all duration-200 shrink-0" aria-label={t("tm.backToAnalysis")}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="pl-12 sm:pl-14">
          {result && !loading ? (
            locale === "ko" ? (
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                <span className="text-zinc-400">만약 </span>
                <span className="text-gradient">{humanDate(result.date, locale)}</span>
                <span className="text-zinc-400">에 </span>
                <span className="text-gradient">{ticker}</span>
                <span className="text-zinc-400">를 매수했다면?</span>
              </h1>
            ) : (
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                <span className="text-zinc-400">What if you had bought </span>
                <span className="text-gradient">{ticker}</span>
                <span className="text-zinc-400"> on </span>
                <span className="text-gradient">{humanDate(result.date, locale)}</span>
                <span className="text-zinc-400">?</span>
              </h1>
            )
          ) : (
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-zinc-200">
                <Clock className="w-6 h-6 inline-block mr-2 text-indigo-400 -mt-1" />
                {t("tm.timeMachine")}
                <span className="font-mono text-indigo-400 ml-2">{ticker}</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-2 max-w-lg">{t("tm.pickDateSubtitle")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Date Picker */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="tm-date" className="block text-xs font-medium text-zinc-500 mb-2">{t("tm.selectADate")}</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input id="tm-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={new Date().toISOString().split("T")[0]} min="2015-01-01" className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-mono text-zinc-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all [color-scheme:dark]" />
              </div>
              <button onClick={() => runTimeMachine(selectedDate)} disabled={!selectedDate || loading} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm shadow-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/25">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("tm.explore")}
              </button>
            </div>
          </div>
        </div>

        {/* Preset story cards */}
        <div className="mt-5">
          <span className="block text-xs font-medium text-zinc-500 mb-3">{t("tm.keyMarketMoments")}</span>
          <div className="space-y-3">
            {visiblePresetGroups.map((group) => (
              <div key={group.year}>
                <span className="block text-[11px] font-mono font-semibold text-zinc-600 mb-1.5">{group.year}</span>
                <div className="flex flex-wrap gap-2">
                  {group.dates.map((preset) => (
                    <button key={preset.date} onClick={() => runTimeMachine(preset.date)} disabled={loading} title={t(preset.descKey)}
                      className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 group/card hover:scale-[1.02]",
                        selectedDate === preset.date ? "bg-indigo-600/15 border-indigo-500/30 shadow-sm shadow-indigo-500/10" : "bg-zinc-800/30 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/50")}>
                      <span className="text-sm shrink-0">{preset.emoji}</span>
                      <div className="min-w-0">
                        <span className={cn("text-xs font-semibold block", selectedDate === preset.date ? "text-indigo-300" : "text-zinc-300 group-hover/card:text-zinc-200")}>{t(preset.labelKey)}</span>
                        <span className="text-[10px] text-zinc-600 font-mono tabular-nums">{preset.date}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {PRESET_GROUPS.length > 3 && (
            <button onClick={() => setExpandedPresets(!expandedPresets)} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              <ChevronDown className={cn("w-3 h-3 transition-transform", expandedPresets && "rotate-180")} />
              {expandedPresets ? t("tm.showFewer") : t("tm.showMoreYears").replace("{n}", String(PRESET_GROUPS.length - 3))}
            </button>
          )}
        </div>
      </div>

      {/* Indicator toggles */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t("tm.indicators")}</span>
          <span className="text-[10px] text-zinc-600 ml-auto">{t("tm.nSelected").replace("{n}", String(selectedIndicators.size))}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_INDICATORS.map(({ key, label }) => {
            const isSelected = selectedIndicators.has(key);
            const wouldBeUnderMin = isSelected && selectedIndicators.size <= 2;
            return (
              <button key={key} onClick={() => handleToggleIndicator(key)} disabled={wouldBeUnderMin}
                className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                  isSelected ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/25 shadow-sm" : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600",
                  wouldBeUnderMin && "opacity-60 cursor-not-allowed")}
                title={wouldBeUnderMin ? t("tm.minIndicators") : isSelected ? t("tm.removeFromFilter").replace("{key}", key) : t("tm.addToFilter").replace("{key}", key)}>
                {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2.5">{t("tm.filterDesc")}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => runTimeMachine(selectedDate)} className="ml-auto px-3 py-1 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-xs font-medium">{t("tm.retry")}</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="h-20 bg-zinc-800/30 animate-pulse" />
            <div className="px-5 py-4 space-y-3">
              <div className="w-48 h-5 bg-zinc-800 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-zinc-800/40 rounded-lg animate-pulse" />)}</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
            <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="h-20 bg-zinc-800/40 rounded-lg animate-pulse" />
          </div>
        </div>
      )}

      {/* STEP 1: Signal Conditions + Reveal Button */}
      {result && !loading && !revealed && (
        <div className="animate-reveal-up">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 sm:p-8">
            <div className="text-center space-y-5">
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>{locale === "ko" ? (<><span className="font-semibold text-zinc-200">{humanDate(result.date, locale)}</span>의 시그널:</>) : (<>The signals on <span className="font-semibold text-zinc-200">{humanDate(result.date, locale)}</span>:</>)}</span>
              </div>
              {filteredConditions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {filteredConditions.map((cond, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-sm font-medium text-indigo-300 animate-reveal-up" style={{ animationDelay: `${i * 100}ms` }}>
                      {cond.indicator.toUpperCase()}
                      {cond.state && <span className="text-indigo-400/70 font-mono text-xs">{cond.state}</span>}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-sm text-zinc-500">
                {t("tm.similarPatternsInDays").replace("{count}", String(result.distribution.total_cases)).replace("{s}", result.distribution.total_cases !== 1 ? "s" : "").replace("{days}", result.distribution.lookback_days.toLocaleString())}
              </div>
              {result.signal.confidence_warning && <p className="text-xs text-amber-400/80">{result.signal.confidence_warning}</p>}
              <button onClick={() => setRevealed(true)} className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-indigo-400 transition-all duration-300 hover:scale-[1.02]">
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                {t("tm.revealWhatHappened")}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Revealed Results */}
      {result && !loading && revealed && (
        <div ref={resultsRef} className="space-y-4">
          {/* Dramatic Outcome Card */}
          <div className={cn("bg-gradient-to-b rounded-xl border border-zinc-800/80 overflow-hidden", resultGradient)}>
            <div className="bg-zinc-900/80 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="text-center sm:text-left">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{humanDate(result.date, locale)}</div>
                  <div className="text-2xl font-mono font-bold text-zinc-200 tabular-nums">{formatCurrency(result.price_at_date)}</div>
                </div>
                <div className="flex items-center gap-2 text-zinc-600">
                  <div className="w-8 sm:w-16 h-px bg-zinc-700" />
                  {totalReturn >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500/50" /> : <TrendingDown className="w-5 h-5 text-red-500/50" />}
                  <div className="w-8 sm:w-16 h-px bg-zinc-700" />
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{t("tm.current")}</div>
                  <div className="text-2xl font-mono font-bold text-zinc-200 tabular-nums">{formatCurrency(result.current_price)}</div>
                </div>
              </div>

              <div className="flex justify-center mb-6">
                <div className={cn("px-6 py-3 rounded-2xl border-2 animate-number-pop", totalReturn >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                  <span className={cn("text-4xl sm:text-5xl font-mono font-black tabular-nums", totalReturn >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPercent(totalReturn)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">{t("tm.forwardReturns")}</div>
                {forwardReturns.map((r, i) => <ReturnBar key={r.period} label={r.label} value={r.returnPct} maxAbsValue={maxAbsReturn} delay={200 + i * 120} />)}
              </div>
            </div>
          </div>

          {/* Signal Strength + Edge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 animate-reveal-up">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t("tm.signalStrength")}</h3>
              </div>
              {activePeriodData != null ? (
                <div className="flex flex-col items-center">
                  <SignalGauge winRate={activePeriodData} gaugeLabels={{ strong: t("tm.gaugeStrong"), neutral: t("tm.gaugeNeutral"), weak: t("tm.gaugeWeak") }} />
                  <div className="w-full mt-4 space-y-3">
                    <DistributionBar winRate={activePeriodData} animated className="h-5" wentUpLabel={t("tm.pctWentUp")} />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-zinc-800/40 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 uppercase">{t("tm.cases")}</div>
                        <div className="text-sm font-mono font-bold text-zinc-200 tabular-nums">{result.distribution.total_cases}</div>
                      </div>
                      <div className="bg-zinc-800/40 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 uppercase">{t("tm.tier")}</div>
                        <div className="text-sm font-mono font-bold text-zinc-200 capitalize">{result.signal.tier ?? "N/A"}</div>
                      </div>
                      <div className="bg-zinc-800/40 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 uppercase">{t("tm.bias")}</div>
                        <div className={cn("text-sm font-bold capitalize", result.signal.direction === "bullish" ? "text-emerald-400" : result.signal.direction === "bearish" ? "text-red-400" : "text-zinc-400")}>{result.signal.direction}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : <div className="text-center py-6 text-sm text-zinc-500">{t("tm.noDataForPeriod")}</div>}
            </div>

            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 animate-reveal-up delay-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t("tm.signalEdge")}</h3>
              </div>
              <div className="flex gap-1 mb-4 bg-zinc-800/40 rounded-lg p-1">
                {PERIOD_TABS.map((tab) => {
                  const hasData = result.signal.win_rates?.[tab.key] != null;
                  return (
                    <button key={tab.key} onClick={() => setActivePeriod(tab.key)} disabled={!hasData}
                      className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                        activePeriod === tab.key ? "bg-indigo-600 text-white shadow-sm" : hasData ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-600 cursor-not-allowed")}>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {signalWinRate != null && baselineWinRate != null ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-indigo-400 font-medium">{t("tm.withSignal")}</span><span className="font-mono font-bold text-zinc-200 tabular-nums">{signalWinRate.toFixed(1)}%</span></div>
                      <div className="h-3 bg-zinc-800/60 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full animate-fill-bar" style={{ width: `${signalWinRate}%` }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-zinc-500 font-medium">{t("tm.randomEntry")}</span><span className="font-mono font-bold text-zinc-400 tabular-nums">{baselineWinRate.toFixed(1)}%</span></div>
                      <div className="h-3 bg-zinc-800/60 rounded-full overflow-hidden"><div className="h-full bg-zinc-600 rounded-full animate-fill-bar" style={{ width: `${baselineWinRate}%`, animationDelay: "200ms" }} /></div>
                    </div>
                  </div>
                  {edgeWinRate != null && (
                    <div className={cn("px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2",
                      edgeWinRate > 0 ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400" : edgeWinRate < 0 ? "bg-red-500/5 border-red-500/15 text-red-400" : "bg-zinc-800/40 border-zinc-700/30 text-zinc-400")}>
                      {edgeWinRate > 0 ? <TrendingUp className="w-4 h-4 shrink-0" /> : edgeWinRate < 0 ? <TrendingDown className="w-4 h-4 shrink-0" /> : null}
                      <span className="font-medium">{t("tm.edge")}: <span className="font-mono tabular-nums">{edgeWinRate >= 0 ? "+" : ""}{edgeWinRate.toFixed(1)}pp</span> {t("tm.winRateAdvantage")}</span>
                    </div>
                  )}
                  {baselineAvgReturn != null && (
                    <div className="text-xs text-zinc-500">{locale === "ko" ? "기준 평균 수익률" : "Baseline avg return"}: <span className="font-mono tabular-nums text-zinc-400">{baselineAvgReturn >= 0 ? "+" : ""}{baselineAvgReturn.toFixed(2)}%</span></div>
                  )}
                </div>
              ) : <div className="text-center py-6 text-sm text-zinc-500">{t("tm.noEdgeData")}</div>}
            </div>
          </div>

          {/* Percentile Ranking */}
          {activeActual && result.percentile_rank != null && activePeriod === "20" && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 animate-reveal-up delay-300">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t("tm.howThisRanked")}</h3>
              <div className="space-y-2">
                <div className="text-sm text-zinc-400">{t("tm.outcomeWasBetterThan")} <span className="font-semibold text-zinc-200">{result.percentile_rank.toFixed(0)}%</span> {t("tm.ofSimilarHistorical")}</div>
                <div className="pt-5"><PercentileBar percentile={result.percentile_rank} actualReturn={activeActual.return_pct} worstLabel={t("tm.worst")} bestLabel={t("tm.best")} /></div>
              </div>
            </div>
          )}

          {/* Indicator Breakdown */}
          {filteredConditions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
              <button onClick={() => setShowIndicators(!showIndicators)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t("tm.individualBreakdown")}</span>
                  {filteredConditions.length < result.signal.conditions.length && <span className="text-[10px] text-zinc-600">({filteredConditions.length} of {result.signal.conditions.length})</span>}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform", showIndicators && "rotate-180")} />
              </button>
              {showIndicators && (
                <div className="px-5 pb-5 border-t border-zinc-800/40">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-zinc-800/60">
                        <th className="text-left text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2 pr-4">{t("tm.condition")}</th>
                        <th className="text-left text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2 pr-4">{t("tm.state")}</th>
                        <th className="text-right text-[11px] text-zinc-500 font-medium uppercase tracking-wider pb-2">{t("tm.value")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConditions.map((cond, i) => {
                        const indKey = cond.indicator.toLowerCase();
                        const indValue = result.indicators_at_date[indKey] ?? result.indicators_at_date[`${indKey}_event`] ?? result.indicators_at_date[`${indKey}_trend`];
                        const indState = cond.state || (result.indicators_at_date[`${indKey}_event`] as string) || (result.indicators_at_date[`${indKey}_trend`] as string) || (result.indicators_at_date[indKey] as string);
                        return (
                          <tr key={i} className="border-b border-zinc-800/30 last:border-0">
                            <td className="py-2.5 pr-4"><span className="text-xs font-medium text-zinc-300 uppercase">{cond.indicator}</span></td>
                            <td className="py-2.5 pr-4"><span className="text-xs font-mono text-zinc-400">{typeof indState === "string" ? indState.replace(/_/g, " ") : "--"}</span></td>
                            <td className="py-2.5 text-right"><span className="text-xs font-mono text-zinc-500 tabular-nums">{indValue != null ? (typeof indValue === "number" ? indValue.toFixed(2) : String(indValue)) : "--"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Highlights */}
          {result.highlights && result.highlights.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">{t("tm.highlights")}</h3>
              <ul className="space-y-2">
                {result.highlights.map((h, i) => (
                  <li key={i} className={cn("text-sm px-4 py-2.5 rounded-lg flex items-start gap-2 border transition-colors",
                    h.type === "positive" || h.type === "bullish" ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" : h.type === "negative" || h.type === "bearish" ? "bg-red-500/5 text-red-400 border-red-500/10" : "bg-zinc-800/40 text-zinc-300 border-zinc-800/60")}>
                    {h.type === "positive" || h.type === "bullish" ? <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" /> : h.type === "negative" || h.type === "bearish" ? <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" /> : null}
                    <span>{h.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700/50 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all">
              <Share2 className="w-4 h-4" />
              {shareToast ? t("tm.copied") : t("tm.shareThisDiscovery")}
            </button>
            <button onClick={scrollToTop} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-sm font-medium text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/30 transition-all">
              <RotateCcw className="w-4 h-4" />
              {t("tm.tryAnotherDate")}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-6 text-center animate-reveal-up">
          <div className="relative">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 animate-float">
              <Clock className="w-10 h-10 text-indigo-400/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 animate-pulse-dot" />
          </div>
          <div>
            <p className="text-base font-medium text-zinc-300">{t("tm.pickDateFromHistory")}</p>
            <p className="text-sm text-zinc-500 max-w-md mt-1.5 leading-relaxed">{t("tm.pickDateDesc")}</p>
          </div>
          <div className="w-full max-w-2xl mt-2">
            <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-2">{t("tm.mostInteresting")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_DATES.filter((p) => FEATURED_DATES.includes(p.date)).map((preset) => (
                <button key={preset.date} onClick={() => runTimeMachine(preset.date)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800/60 text-left hover:border-indigo-500/30 hover:bg-zinc-800/40 transition-all group">
                  <span className="text-xl">{preset.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-200">{t(preset.labelKey)}</div>
                    <div className="text-xs text-zinc-600">{t(preset.descKey)}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

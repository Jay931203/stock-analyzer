"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  api,
  type Signal,
} from "@/lib/api";
import { SignalTable } from "@/components/dashboard/SignalTable";
import {
  RefreshCw,
  Circle,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  BarChart3,
  Loader2,
  CalendarClock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIODS = [
  { value: "1y", label: "1Y", desc: "1 Year" },
  { value: "2y", label: "2Y", desc: "2 Years" },
  { value: "3y", label: "3Y", desc: "3 Years" },
  { value: "5y", label: "5Y", desc: "5 Years" },
  { value: "10y", label: "10Y", desc: "10 Years" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

const ETF_TICKERS = new Set(["SPY", "QQQ", "DIA", "IWM", "ARKK"]);

/** Sector filter categories. Order matters for display. */
const SECTOR_FILTERS = [
  { key: "All", label: "All" },
  { key: "Technology", label: "Technology" },
  { key: "Healthcare", label: "Healthcare" },
  { key: "Energy", label: "Energy" },
  { key: "Finance", label: "Finance" },
  { key: "Consumer", label: "Consumer" },
  { key: "Industrial", label: "Industrial" },
  { key: "ETFs", label: "ETFs" },
] as const;

type SectorFilterKey = (typeof SECTOR_FILTERS)[number]["key"];

/** Map a signal's sector to a filter key */
function sectorToFilterKey(sector: string, ticker: string): SectorFilterKey {
  if (ETF_TICKERS.has(ticker)) return "ETFs";
  if (!sector) return "All";
  const s = sector.toLowerCase();
  if (s.includes("technology") || s.includes("tech")) return "Technology";
  if (s.includes("health") || s.includes("pharma") || s.includes("bio")) return "Healthcare";
  if (s.includes("energy")) return "Energy";
  if (s.includes("financ") || s.includes("bank")) return "Finance";
  if (s.includes("consumer") || s.includes("retail") || s.includes("staple")) return "Consumer";
  if (s.includes("industrial") || s.includes("defense") || s.includes("aero")) return "Industrial";
  return "All";
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function getRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} min${m > 1 ? "s" : ""} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hr${h > 1 ? "s" : ""} ago`;
  }
  const d = Math.floor(diffSec / 86400);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

// ---------------------------------------------------------------------------
// Market state helper
// ---------------------------------------------------------------------------

function getMarketState(): { label: string; color: string; isClosed: boolean } {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay();
  const mins = h * 60 + m;

  if (day === 0 || day === 6) return { label: "Closed", color: "text-zinc-500", isClosed: true };
  if (mins >= 570 && mins < 960)
    return { label: "Market Open", color: "text-emerald-400", isClosed: false };
  if (mins >= 240 && mins < 570)
    return { label: "Pre-Market", color: "text-amber-400", isClosed: false };
  if (mins >= 960 && mins < 1200)
    return { label: "After Hours", color: "text-amber-400", isClosed: false };
  return { label: "Closed", color: "text-zinc-500", isClosed: true };
}

// ---------------------------------------------------------------------------
// Sector filter chip badge colors (reuse table colors)
// ---------------------------------------------------------------------------

const FILTER_CHIP_COLORS: Record<SectorFilterKey, { active: string; dot: string }> = {
  All: { active: "border-zinc-500 text-zinc-200 bg-zinc-700/50", dot: "bg-zinc-400" },
  Technology: { active: "border-indigo-500/40 text-indigo-300 bg-indigo-500/15", dot: "bg-indigo-400" },
  Healthcare: { active: "border-cyan-500/40 text-cyan-300 bg-cyan-500/15", dot: "bg-cyan-400" },
  Energy: { active: "border-orange-500/40 text-orange-300 bg-orange-500/15", dot: "bg-orange-400" },
  Finance: { active: "border-emerald-500/40 text-emerald-300 bg-emerald-500/15", dot: "bg-emerald-400" },
  Consumer: { active: "border-amber-500/40 text-amber-300 bg-amber-500/15", dot: "bg-amber-400" },
  Industrial: { active: "border-slate-400/40 text-slate-300 bg-slate-400/15", dot: "bg-slate-400" },
  ETFs: { active: "border-purple-500/40 text-purple-300 bg-purple-500/15", dot: "bg-purple-400" },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ScannerPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [totalSignals, setTotalSignals] = useState<number | undefined>();
  const [marketStateLabel, setMarketStateLabel] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("3y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [sectorFilter, setSectorFilter] = useState<SectorFilterKey>("All");

  const [localMarketState, setLocalMarketState] = useState<ReturnType<typeof getMarketState> | null>(null);
  useEffect(() => {
    setLocalMarketState(getMarketState());
  }, []);

  // Relative time ticker
  const [relativeTime, setRelativeTime] = useState<string>("");
  useEffect(() => {
    if (!lastUpdated) return;
    setRelativeTime(getRelativeTime(lastUpdated));
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(lastUpdated));
    }, 30_000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const fetchSignals = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await api.getSignals(period, 101, showRefresh);
        setSignals(data.signals);
        setTotalSignals(data.total_signals ?? data.signals.length);
        setMarketStateLabel(data.market_state || null);
        setScanned(data.scanned || 0);
        setLastUpdated(data.updated || new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch signals");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // ---- Sector counts and filtering ----
  const sectorCounts = useMemo(() => {
    const counts: Record<SectorFilterKey, number> = {
      All: signals.length,
      Technology: 0,
      Healthcare: 0,
      Energy: 0,
      Finance: 0,
      Consumer: 0,
      Industrial: 0,
      ETFs: 0,
    };
    for (const s of signals) {
      const key = sectorToFilterKey(s.sector, s.ticker);
      if (key !== "All") counts[key]++;
    }
    return counts;
  }, [signals]);

  const filteredSignals = useMemo(() => {
    if (sectorFilter === "All") return signals;
    return signals.filter(
      (s) => sectorToFilterKey(s.sector, s.ticker) === sectorFilter,
    );
  }, [signals, sectorFilter]);

  // ---- Summary stats (computed on ALL signals) ----
  const stats = useMemo(() => {
    if (signals.length === 0) return null;
    const bullish = signals.filter((s) => s.win_rate_20d > 50);
    const bearish = signals.filter((s) => s.win_rate_20d <= 50);
    const avgWinRate = signals.reduce((sum, s) => sum + s.win_rate_20d, 0) / signals.length;
    const strongest = signals.reduce((best, s) => ((s.strength ?? 0) > (best.strength ?? 0) ? s : best), signals[0]);

    return {
      bullishCount: bullish.length,
      bearishCount: bearish.length,
      avgWinRate,
      strongest,
    };
  }, [signals]);

  // ---- Sector summary (computed on filtered signals when a sector is selected) ----
  const sectorSummary = useMemo(() => {
    if (sectorFilter === "All" || filteredSignals.length === 0) return null;
    const bullish = filteredSignals.filter((s) => s.win_rate_20d > 50);
    const bearish = filteredSignals.filter((s) => s.win_rate_20d <= 50);
    const avgWR = filteredSignals.reduce((sum, s) => sum + s.win_rate_20d, 0) / filteredSignals.length;
    const top = filteredSignals.reduce((best, s) => (s.strength > best.strength ? s : best), filteredSignals[0]);
    return {
      bullishCount: bullish.length,
      bearishCount: bearish.length,
      avgWinRate: avgWR,
      topSignal: top,
    };
  }, [filteredSignals, sectorFilter]);

  const isMarketClosed = marketStateLabel
    ? marketStateLabel.toLowerCase().includes("closed")
    : localMarketState?.isClosed ?? false;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-4">
        {/* ====== Market Summary Bar ====== */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Market state badge */}
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                (localMarketState?.isClosed ?? true)
                  ? "border-zinc-700/60 bg-zinc-800/60 text-zinc-500"
                  : localMarketState?.color === "text-emerald-400"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400",
              )}
            >
              <Circle className={cn(
                "w-2 h-2 fill-current",
                !(localMarketState?.isClosed ?? true) && "animate-pulse-dot",
              )} />
              {marketStateLabel || localMarketState?.label || "Loading..."}
            </span>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-zinc-800" />

            {/* Bullish card */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] text-zinc-500">Bullish</span>
              <span className="font-mono font-bold text-sm text-emerald-400 tabular-nums">
                {stats?.bullishCount ?? "--"}
              </span>
            </div>

            {/* Bearish card */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-colors">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[11px] text-zinc-500">Bearish</span>
              <span className="font-mono font-bold text-sm text-red-400 tabular-nums">
                {stats?.bearishCount ?? "--"}
              </span>
            </div>

            {/* Avg Win Rate */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800/40 transition-colors">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] text-zinc-500">Avg WR</span>
              <span className="font-mono font-bold text-sm text-indigo-400 tabular-nums">
                {stats ? `${stats.avgWinRate.toFixed(1)}%` : "--%"}
              </span>
            </div>

            {/* Strongest Signal - with subtle pulse */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
              stats?.strongest && "animate-strength-pulse hover:bg-amber-500/5",
            )}>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-zinc-500">Strongest</span>
              {stats?.strongest ? (
                <span className="font-mono font-bold text-sm text-zinc-100 tabular-nums">
                  {stats.strongest.ticker}
                  <span className="text-amber-400 ml-1">
                    ({stats.strongest.strength.toFixed(0)})
                  </span>
                </span>
              ) : (
                <span className="font-mono text-zinc-600">--</span>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Last updated - relative time */}
            {lastUpdated && (
              <div
                className="text-[11px] text-zinc-500 flex items-center gap-1.5 cursor-default"
                title={new Date(lastUpdated).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              >
                <Clock className="w-3 h-3" />
                <span className="tabular-nums">{relativeTime || "just now"}</span>
                {scanned > 0 && (
                  <span className="text-zinc-600 ml-0.5">
                    ({scanned.toLocaleString()} scanned)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====== Header: Title + Period Tabs + Refresh ====== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-zinc-100">
            Signal Scanner
          </h1>

          <div className="flex items-center gap-3">
            {/* Period tabs (prominent) */}
            <div className="flex items-center bg-zinc-900 border border-zinc-700/60 rounded-lg p-1 shadow-lg">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  title={p.desc}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200",
                    period === p.value
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchSignals(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5 transition-transform", refreshing && "animate-spin")}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* ====== Sector Filter Chips ====== */}
        <div className="flex flex-wrap items-center gap-2">
          {SECTOR_FILTERS.map((sf) => {
            const count = sectorCounts[sf.key];
            const isActive = sectorFilter === sf.key;
            if (sf.key !== "All" && count === 0) return null;
            const chipColors = FILTER_CHIP_COLORS[sf.key];
            return (
              <button
                key={sf.key}
                onClick={() => setSectorFilter(sf.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                  isActive
                    ? cn(chipColors.active, "ring-1 ring-white/5 shadow-sm")
                    : "border-zinc-800/80 text-zinc-500 bg-transparent hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/50",
                )}
              >
                {sf.label}
                <span
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded-full tabular-nums",
                    isActive
                      ? "bg-white/10"
                      : "bg-zinc-800/80 text-zinc-600",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ====== Sector Summary Card (shown when a specific sector is selected) ====== */}
        {sectorSummary && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-sm font-semibold text-zinc-200">
                {sectorFilter}
              </span>
              <div className="hidden sm:block w-px h-5 bg-zinc-800" />
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-zinc-500">Bullish</span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  {sectorSummary.bullishCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-zinc-500">Bearish</span>
                <span className="font-mono font-semibold text-red-400 tabular-nums">
                  {sectorSummary.bearishCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <BarChart3 className="w-3 h-3 text-indigo-500" />
                <span className="text-zinc-500">Avg WR</span>
                <span className="font-mono font-semibold text-indigo-400 tabular-nums">
                  {sectorSummary.avgWinRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-zinc-500">Top Signal</span>
                <span className="font-mono font-semibold text-zinc-100 tabular-nums">
                  {sectorSummary.topSignal.ticker}
                  <span className="text-amber-400 ml-1">
                    ({sectorSummary.topSignal.strength.toFixed(0)})
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ====== Error State ====== */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchSignals()}
              className="px-3 py-1 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* ====== Empty / First-load State ====== */}
        {!loading && !error && signals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700">
              <CalendarClock className="w-8 h-8 text-zinc-500" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-zinc-200">
                Signal scanner is refreshing
              </h2>
              <p className="text-sm text-zinc-500 max-w-md">
                Data updates every day at market close. If this is your first visit,
                the scan may take a moment to complete.
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        )}

        {/* ====== Loading State (first load) ====== */}
        {loading && !refreshing && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-zinc-200">
                Loading signals...
              </h2>
              <p className="text-sm text-zinc-500">
                Fetching the latest scanner results.
              </p>
            </div>
          </div>
        )}

        {/* ====== Signal Table (full width) ====== */}
        {!loading && signals.length > 0 && (
          <SignalTable
            signals={filteredSignals}
            loading={false}
            totalSignals={filteredSignals.length}
            scanned={sectorFilter === "All" ? scanned : undefined}
            isMarketClosed={!!isMarketClosed}
          />
        )}

        {/* Refreshing overlay indicator */}
        {refreshing && signals.length > 0 && (
          <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-700/60 shadow-xl backdrop-blur-md text-xs text-zinc-300 z-50">
            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            Refreshing signals...
          </div>
        )}
      </div>
    </div>
  );
}

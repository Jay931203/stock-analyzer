"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  api,
  type Signal,
  type FlipItem,
} from "@/lib/api";
import { SignalTable } from "@/components/dashboard/SignalTable";
import {
  RefreshCw,
  Circle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  Target,
} from "lucide-react";

const PERIODS = [
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

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

export default function ScannerPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [totalSignals, setTotalSignals] = useState<number | undefined>();
  const [marketStateLabel, setMarketStateLabel] = useState<string | null>(null);
  const [flips, setFlips] = useState<FlipItem[]>([]);
  const [period, setPeriod] = useState<Period>("3y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scanned, setScanned] = useState(0);

  const localMarketState = getMarketState();

  const fetchSignals = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await api.getSignals(period);
        setSignals(data.signals);
        setTotalSignals(data.total_signals ?? data.signals.length);
        setMarketStateLabel(data.market_state || null);
        setScanned(data.scanned || 0);
        setFlips(data.flips?.flips || []);
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

  // Compute summary stats
  const stats = useMemo(() => {
    if (signals.length === 0) return null;
    const bullish = signals.filter((s) => s.win_rate_20d > 50);
    const bearish = signals.filter((s) => s.win_rate_20d < 50);
    const avgWinRate = signals.reduce((sum, s) => sum + s.win_rate_20d, 0) / signals.length;
    const strongest = signals.reduce((best, s) => (s.strength > best.strength ? s : best), signals[0]);
    const avgReturn = signals.reduce((sum, s) => sum + s.avg_return_20d, 0) / signals.length;

    return {
      bullishCount: bullish.length,
      bearishCount: bearish.length,
      avgWinRate,
      avgReturn,
      strongest,
    };
  }, [signals]);

  const isMarketClosed = localMarketState.isClosed || (marketStateLabel?.toLowerCase().includes("closed"));

  return (
    <div className="flex gap-0 h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Market closed banner */}
        {isMarketClosed && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-700/50">
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <span className="text-sm font-medium text-zinc-300">
                Market is Closed
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Showing signals from the last trading session. Data will refresh when the market opens.
              </p>
            </div>
          </div>
        )}

        {/* Header area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-zinc-100">
                Signal Scanner
              </h1>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                  localMarketState.isClosed
                    ? "border-zinc-700 bg-zinc-800/50 text-zinc-500"
                    : localMarketState.color === "text-emerald-400"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                )}
              >
                <Circle className="w-2 h-2 fill-current" />
                {marketStateLabel || localMarketState.label}
              </span>
            </div>
            {lastUpdated && (
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated{" "}
                {new Date(lastUpdated).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })}{" "}
                ET
                {scanned > 0 && (
                  <span className="ml-2 text-zinc-600">
                    ({scanned.toLocaleString()} tickers scanned)
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                    period === p.value
                      ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300",
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5 transition-transform", refreshing && "animate-spin")}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchSignals()}
              className="px-3 py-1 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Signal Table */}
        <SignalTable
          signals={signals}
          loading={loading && !refreshing}
          totalSignals={totalSignals}
          scanned={scanned}
        />
      </div>

      {/* Right sidebar panels - visible on lg+ */}
      <aside className="hidden lg:block w-72 border-l border-zinc-800 bg-zinc-950/50 overflow-y-auto shrink-0">
        <div className="p-4 space-y-5">
          {/* Market State */}
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Market State
            </h3>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-zinc-200">
                  {marketStateLabel || localMarketState.label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {scanned > 0
                  ? `Scanned ${scanned.toLocaleString()} tickers for signals`
                  : "Signal scanner active"}
              </p>
            </div>
          </div>

          {/* Signal Flips */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Recent Signal Flips
              </h3>
              {flips.length > 0 && (
                <span className="text-[10px] font-mono text-zinc-600">({flips.length})</span>
              )}
            </div>
            {flips.length > 0 ? (
              <div className="space-y-2">
                {flips.slice(0, 6).map((flip, i) => (
                  <div
                    key={`${flip.ticker}-${i}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-xs hover:bg-zinc-800/40 transition-colors"
                  >
                    <span className="font-mono font-semibold text-zinc-200 w-12">
                      {flip.ticker}
                    </span>
                    <span className={cn(
                      "truncate",
                      flip.direction === "bullish" ? "text-emerald-400" : "text-red-400",
                    )}>
                      {flip.prev_win_rate.toFixed(0)}%
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span className={cn(
                      "truncate",
                      flip.direction === "bullish" ? "text-emerald-400" : "text-red-400",
                    )}>
                      {flip.curr_win_rate.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 bg-zinc-800/30 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 py-3">No recent flips</p>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-zinc-800" />

          {/* Stats summary */}
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {/* Bullish count */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-zinc-500">Bullish</span>
                </div>
                <div className="text-lg font-mono font-semibold text-emerald-400">
                  {stats?.bullishCount ?? "--"}
                </div>
              </div>
              {/* Bearish count */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] text-zinc-500">Bearish</span>
                </div>
                <div className="text-lg font-mono font-semibold text-red-400">
                  {stats?.bearishCount ?? "--"}
                </div>
              </div>
              {/* Avg Win Rate */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3 h-3 text-indigo-500" />
                  <span className="text-[10px] text-zinc-500">Avg WR 20d</span>
                </div>
                <div className="text-lg font-mono font-semibold text-indigo-400">
                  {stats ? `${stats.avgWinRate.toFixed(1)}%` : "--%"}
                </div>
              </div>
              {/* Avg Return */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-zinc-500">Avg Ret 20d</span>
                </div>
                <div className={cn(
                  "text-lg font-mono font-semibold",
                  stats && stats.avgReturn >= 0 ? "text-emerald-400" : "text-red-400",
                )}>
                  {stats ? `${stats.avgReturn >= 0 ? "+" : ""}${stats.avgReturn.toFixed(2)}%` : "--%"}
                </div>
              </div>
              {/* Strongest signal */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3 col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-zinc-500">Strongest Signal</span>
                </div>
                {stats?.strongest ? (
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-zinc-100">
                      {stats.strongest.ticker}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Strength{" "}
                      <span className="font-mono text-amber-400 font-semibold">
                        {stats.strongest.strength.toFixed(0)}
                      </span>
                      {" / "}
                      WR{" "}
                      <span className={cn(
                        "font-mono font-semibold",
                        stats.strongest.win_rate_20d > 50 ? "text-emerald-400" : "text-red-400",
                      )}>
                        {stats.strongest.win_rate_20d.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-600 text-sm">--</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  api,
  type Signal,
  type MarketRegime,
  type SignalFlip,
} from "@/lib/api";
import { SignalTable } from "@/components/dashboard/SignalTable";
import {
  RefreshCw,
  Circle,
  TrendingUp,
  ArrowRightLeft,
  Clock,
} from "lucide-react";

const PERIODS = [
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

function getMarketState(): { label: string; color: string } {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay();
  const mins = h * 60 + m;

  if (day === 0 || day === 6) return { label: "Closed", color: "text-zinc-500" };
  if (mins >= 570 && mins < 960)
    return { label: "Market Open", color: "text-emerald-400" };
  if (mins >= 240 && mins < 570)
    return { label: "Pre-Market", color: "text-amber-400" };
  if (mins >= 960 && mins < 1200)
    return { label: "After Hours", color: "text-amber-400" };
  return { label: "Closed", color: "text-zinc-500" };
}

export default function ScannerPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
  const [flips, setFlips] = useState<SignalFlip[]>([]);
  const [period, setPeriod] = useState<Period>("3y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const marketState = getMarketState();

  const fetchSignals = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await api.getSignals(period);
        setSignals(data.signals);
        setMarketRegime(data.market_regime);
        setFlips(data.flips || []);
        setLastUpdated(data.generated_at || new Date().toISOString());
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

  return (
    <div className="flex gap-0 h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Header area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-zinc-100">
                Signal Scanner
              </h1>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium",
                  marketState.color,
                )}
              >
                <Circle className="w-2 h-2 fill-current" />
                {marketState.label}
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

            {/* Refresh */}
            <button
              onClick={() => fetchSignals(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
              />
              Refresh
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

        {/* Signal count */}
        {!loading && !error && (
          <div className="mb-4 text-xs text-zinc-500">
            {signals.length} signal{signals.length !== 1 ? "s" : ""} found
          </div>
        )}

        {/* Signal Table */}
        <SignalTable signals={signals} loading={loading && !refreshing} />
      </div>

      {/* Right sidebar panels */}
      <aside className="hidden xl:block w-72 border-l border-zinc-800 bg-zinc-950/50 overflow-y-auto shrink-0">
        <div className="p-4 space-y-5">
          {/* Market Regime */}
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Market Regime
            </h3>
            {marketRegime ? (
              <div
                className="rounded-lg border p-3"
                style={{
                  borderColor: `${marketRegime.color}33`,
                  backgroundColor: `${marketRegime.color}08`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp
                    className="w-4 h-4"
                    style={{ color: marketRegime.color }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: marketRegime.color }}
                  >
                    {marketRegime.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {marketRegime.description}
                </p>
              </div>
            ) : (
              <div className="h-20 bg-zinc-800/30 rounded-lg animate-pulse" />
            )}
          </div>

          {/* Signal Flips */}
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Recent Signal Flips
            </h3>
            {flips.length > 0 ? (
              <div className="space-y-2">
                {flips.slice(0, 6).map((flip, i) => (
                  <div
                    key={`${flip.ticker}-${i}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-xs"
                  >
                    <span className="font-mono font-semibold text-zinc-200 w-12">
                      {flip.ticker}
                    </span>
                    <span className="text-red-400 truncate">{flip.from}</span>
                    <ArrowRightLeft className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span className="text-emerald-400 truncate">
                      {flip.to}
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

          {/* Stats summary */}
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-mono font-semibold text-emerald-400">
                  {signals.filter((s) => s.direction === "bullish").length}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Bullish</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-mono font-semibold text-red-400">
                  {signals.filter((s) => s.direction === "bearish").length}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Bearish</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3 text-center col-span-2">
                <div className="text-lg font-mono font-semibold text-indigo-400">
                  {signals.length > 0
                    ? (
                        signals.reduce((sum, s) => sum + s.win_rate_20d, 0) /
                        signals.length
                      ).toFixed(1)
                    : "--"}
                  %
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Avg Win Rate (20d)
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

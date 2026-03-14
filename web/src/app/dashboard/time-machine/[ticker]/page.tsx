"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { TimeMachineCard } from "@/components/dashboard/TimeMachineCard";
import {
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";

const PRESET_DATES = [
  { label: "COVID Bottom", date: "2020-03-23", description: "Market crash low" },
  { label: "Rate Shock", date: "2022-01-03", description: "Fed hawkish pivot" },
  { label: "AI Rally Start", date: "2023-01-03", description: "ChatGPT momentum" },
  { label: "SVB Crisis", date: "2023-03-10", description: "Bank run panic" },
  { label: "Oct 2023 Low", date: "2023-10-27", description: "Bond yield peak" },
  { label: "2024 Election", date: "2024-11-05", description: "US presidential" },
] as const;

interface TimeMachineResult {
  ticker: string;
  date: string;
  signal: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  verdict: "correct" | "incorrect" | "partial";
  forward_returns: {
    period: string;
    expected: number;
    actual: number;
  }[];
  indicators: {
    name: string;
    state: string;
    value: number | string;
  }[];
}

export default function TimeMachinePage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker || "").toUpperCase();

  const [selectedDate, setSelectedDate] = useState("");
  const [result, setResult] = useState<TimeMachineResult | null>(null);
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
        const raw = await api.getTimeMachine(ticker, date);

        const mapped: TimeMachineResult = {
          ticker: (raw.ticker as string) || ticker,
          date: (raw.date as string) || date,
          signal: (raw.signal as string) || "Unknown",
          direction:
            (raw.direction as TimeMachineResult["direction"]) || "neutral",
          strength: (raw.strength as number) || 0,
          verdict:
            (raw.verdict as TimeMachineResult["verdict"]) || "partial",
          forward_returns: Array.isArray(raw.forward_returns)
            ? (raw.forward_returns as TimeMachineResult["forward_returns"])
            : [
                { period: "1W", expected: 0, actual: 0 },
                { period: "2W", expected: 0, actual: 0 },
                { period: "1M", expected: 0, actual: 0 },
                { period: "3M", expected: 0, actual: 0 },
                { period: "6M", expected: 0, actual: 0 },
              ],
          indicators: Array.isArray(raw.indicators)
            ? (raw.indicators as TimeMachineResult["indicators"])
            : [],
        };

        setResult(mapped);
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

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/analyze/${ticker}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
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
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                />
              </div>
              <button
                onClick={() => runTimeMachine(selectedDate)}
                disabled={!selectedDate || loading}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  "flex flex-col items-center px-3 py-2.5 rounded-lg border text-center transition-colors",
                  selectedDate === preset.date
                    ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-400"
                    : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300",
                )}
              >
                <span className="text-xs font-medium">{preset.label}</span>
                <span className="text-[10px] text-zinc-600 mt-0.5">
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

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-zinc-500">
            Reconstructing signals for {selectedDate}...
          </p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          <TimeMachineCard
            ticker={result.ticker}
            date={result.date}
            signal={result.signal}
            direction={result.direction}
            verdict={result.verdict}
            strength={result.strength}
            forwardReturns={result.forward_returns.map((fr) => ({
              period: fr.period,
              expected: fr.expected,
              actual: fr.actual,
            }))}
          />

          {/* Indicator states at that date */}
          {result.indicators.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Indicator States on {result.date}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {result.indicators.map((ind) => (
                  <div
                    key={ind.name}
                    className="bg-zinc-800/40 rounded-lg p-3"
                  >
                    <div className="text-[11px] text-zinc-500 mb-1">
                      {ind.name}
                    </div>
                    <div className="text-sm font-mono font-semibold text-zinc-200">
                      {typeof ind.value === "number"
                        ? ind.value.toFixed(2)
                        : ind.value}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {ind.state}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Clock className="w-12 h-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            Select a date to see what signals looked like in the past
          </p>
          <p className="text-xs text-zinc-600 max-w-md">
            The Time Machine reconstructs technical indicator states from
            historical data and compares the generated signals against actual
            forward returns.
          </p>
        </div>
      )}
    </div>
  );
}

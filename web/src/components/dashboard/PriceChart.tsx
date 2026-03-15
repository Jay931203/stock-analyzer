"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { api, type ChartResponse } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

const CHART_PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "5Y"] as const;
type ChartPeriod = (typeof CHART_PERIODS)[number];

// Fetch exact period — data = display range
const FETCH_PERIOD_MAP: Record<ChartPeriod, string> = {
  "1M": "3m",
  "3M": "6m",
  "6M": "1y",
  "1Y": "2y",
  "2Y": "5y",
  "5Y": "5y",
};

const PERIOD_BARS: Record<ChartPeriod, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  "2Y": 504,
  "5Y": 1260,
};

function calcSMA(
  candles: { time: string; close: number }[],
  window: number,
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = window - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += candles[j].close;
    result.push({ time: candles[i].time, value: sum / window });
  }
  return result;
}

interface PriceChartProps {
  ticker: string;
  className?: string;
}

export function PriceChart({ ticker, className }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<unknown>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>("1Y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      setLoading(true);
      setError(null);

      // Cleanup previous
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (chartInstanceRef.current) {
        try {
          (chartInstanceRef.current as { remove: () => void }).remove();
        } catch {}
        chartInstanceRef.current = null;
      }

      try {
        // Fetch data
        const data: ChartResponse = await api.getChart(
          ticker,
          FETCH_PERIOD_MAP[period],
        );
        if (cancelled || !containerRef.current) return;

        if (!data.candles || data.candles.length === 0) {
          setError("No chart data available");
          setLoading(false);
          return;
        }

        // Dynamic import
        const lc = await import("lightweight-charts");
        if (cancelled || !containerRef.current) return;

        const container = containerRef.current;

        // Create chart
        const chart = lc.createChart(container, {
          width: container.clientWidth || 800,
          height: 400,
          layout: {
            background: { type: lc.ColorType.Solid, color: "transparent" },
            textColor: "#71717a",
            fontSize: 11,
          },
          grid: {
            vertLines: { color: "#1e1e22", style: lc.LineStyle.Dotted },
            horzLines: { color: "#1e1e22", style: lc.LineStyle.Dotted },
          },
          crosshair: {
            mode: lc.CrosshairMode.Normal,
            vertLine: { color: "#52525b", labelBackgroundColor: "#3f3f46" },
            horzLine: { color: "#52525b", labelBackgroundColor: "#3f3f46" },
          },
          rightPriceScale: { borderColor: "#27272a" },
          timeScale: { borderColor: "#27272a", timeVisible: false },
        });

        chartInstanceRef.current = chart;

        // Candlestick
        const candleSeries = chart.addSeries(lc.CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#22c55e",
          wickDownColor: "#ef4444",
          wickUpColor: "#22c55e",
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candleData = data.candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeries.setData(candleData);

        // Volume
        const volSeries = chart.addSeries(lc.HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });
        chart.priceScale("volume").applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });
        volSeries.setData(
          data.candles.map((c) => ({
            time: c.time as any,
            value: c.volume,
            color: c.close >= c.open ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
          })),
        );

        // SMA 20
        const sma20 = calcSMA(data.candles, 20);
        if (sma20.length > 0) {
          const sma20Series = chart.addSeries(lc.LineSeries, {
            color: "#6366f1",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          sma20Series.setData(
            sma20.map((s) => ({
              time: s.time as any,
              value: s.value,
            })),
          );
        }

        // SMA 50
        const sma50 = calcSMA(data.candles, 50);
        if (sma50.length > 0) {
          const sma50Series = chart.addSeries(lc.LineSeries, {
            color: "#f97316",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          sma50Series.setData(
            sma50.map((s) => ({
              time: s.time as any,
              value: s.value,
            })),
          );
        }

        // Fit all data into view
        chart.timeScale().fitContent();

        // Resize observer
        const obs = new ResizeObserver((entries) => {
          for (const entry of entries) {
            chart.applyOptions({ width: entry.contentRect.width });
          }
        });
        obs.observe(container);
        observerRef.current = obs;

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[PriceChart] Error:", msg);
        setError(msg);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (chartInstanceRef.current) {
        try {
          (chartInstanceRef.current as { remove: () => void }).remove();
        } catch {}
        chartInstanceRef.current = null;
      }
    };
  }, [ticker, period]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Period selector + Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg">
          {CHART_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                period === p
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] bg-indigo-500 rounded-full inline-block" />
            SMA 20
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] bg-orange-500 rounded-full inline-block" />
            SMA 50
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative w-full rounded-lg overflow-hidden" style={{ height: 400 }}>
        <div ref={containerRef} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-xs text-zinc-500">Loading chart...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 z-10 rounded-lg">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-zinc-400">{error}</p>
              <button
                onClick={() => setPeriod(period)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { api, type ChartResponse } from "@/lib/api";
import { Loader2 } from "lucide-react";

const CHART_PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "5Y"] as const;
type ChartPeriod = (typeof CHART_PERIODS)[number];

const PERIOD_MAP: Record<ChartPeriod, string> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "2Y": "2y",
  "5Y": "5y",
};

/**
 * Fetch MORE data than the display period so users can scroll left to see
 * older candles without hitting empty space.
 */
const FETCH_PERIOD_MAP: Record<ChartPeriod, string> = {
  "1M": "1y",
  "3M": "2y",
  "6M": "2y",
  "1Y": "5y",
  "2Y": "5y",
  "5Y": "5y",
};

/** Approximate number of trading days per display period */
const PERIOD_BARS: Record<ChartPeriod, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  "2Y": 504,
  "5Y": 1260,
};

/** Calculate Simple Moving Average from close prices */
function calcSMA(
  candles: { time: string; close: number }[],
  window: number,
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = window - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += candles[j].close;
    }
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
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>("1Y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function buildChart() {
      setLoading(true);
      setError(null);

      try {
        const data: ChartResponse = await api.getChart(ticker, FETCH_PERIOD_MAP[period]);

        // If the effect was cleaned up while we were fetching, bail out
        if (cancelled || !containerRef.current) return;

        // Dynamically import lightweight-charts to avoid SSR issues
        const {
          createChart,
          ColorType,
          CrosshairMode,
          LineStyle,
          CandlestickSeries,
          HistogramSeries,
          LineSeries,
        } = await import("lightweight-charts");

        if (cancelled || !containerRef.current) return;

        // Cleanup existing chart & observer before creating new ones
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const container = containerRef.current;
        const chart = createChart(container, {
          width: container.clientWidth,
          height: container.clientHeight || 400,
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: "#71717a",
            fontSize: 11,
          },
          grid: {
            vertLines: { color: "#1e1e22", style: LineStyle.Dotted },
            horzLines: { color: "#1e1e22", style: LineStyle.Dotted },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: "#52525b", labelBackgroundColor: "#3f3f46" },
            horzLine: { color: "#52525b", labelBackgroundColor: "#3f3f46" },
          },
          rightPriceScale: {
            borderColor: "#27272a",
          },
          timeScale: {
            borderColor: "#27272a",
            timeVisible: false,
          },
        });

        chartRef.current = chart;

        // Candlestick series (v5 API)
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#22c55e",
          wickDownColor: "#ef4444",
          wickUpColor: "#22c55e",
        });

        const candles = data.candles.map((c) => ({
          time: c.time as unknown as import("lightweight-charts").UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        candleSeries.setData(candles);

        // Volume series (v5 API)
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });

        chart.priceScale("volume").applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });

        volumeSeries.setData(
          data.candles.map((c) => ({
            time: c.time as unknown as import("lightweight-charts").UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? "#22c55e33" : "#ef444433",
          })),
        );

        // Calculate SMA 20 and SMA 50 on the frontend
        const closePrices = data.candles.map((c) => ({
          time: c.time,
          close: c.close,
        }));

        const sma20 = calcSMA(closePrices, 20);
        const sma50 = calcSMA(closePrices, 50);

        if (sma20.length > 0) {
          const sma20Series = chart.addSeries(LineSeries, {
            color: "#6366f1",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          sma20Series.setData(
            sma20.map((v) => ({
              time: v.time as unknown as import("lightweight-charts").UTCTimestamp,
              value: v.value,
            })),
          );
        }

        if (sma50.length > 0) {
          const sma50Series = chart.addSeries(LineSeries, {
            color: "#f97316",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          sma50Series.setData(
            sma50.map((v) => ({
              time: v.time as unknown as import("lightweight-charts").UTCTimestamp,
              value: v.value,
            })),
          );
        }

        // Show only the selected period initially; older data is available on scroll
        const visibleBars = PERIOD_BARS[period];
        if (candles.length > visibleBars) {
          const from = candles[candles.length - visibleBars].time;
          const to = candles[candles.length - 1].time;
          chart.timeScale().setVisibleRange({ from, to });
        } else {
          chart.timeScale().fitContent();
        }

        // Resize handler
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            chart.applyOptions({ width, height: height || 400 });
          }
        });
        observer.observe(container);
        resizeObserverRef.current = observer;

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load chart");
        setLoading(false);
      }
    }

    buildChart();

    return () => {
      cancelled = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ticker, period, retryKey]);

  return (
    <div className={cn("relative", className)}>
      {/* Top bar: Period selector + Legend */}
      <div className="flex items-center justify-between mb-3">
        {/* Period buttons */}
        <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5 gap-0.5">
          {CHART_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                period === p
                  ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Legend */}
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
      <div
        ref={containerRef}
        className="w-full h-[400px] rounded-lg overflow-hidden"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-xs text-zinc-500">Loading chart...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-10 rounded-lg gap-2">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

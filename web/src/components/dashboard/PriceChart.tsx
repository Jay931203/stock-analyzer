"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [period, setPeriod] = useState<ChartPeriod>("1Y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChart = useCallback(
    async (p: ChartPeriod) => {
      setLoading(true);
      setError(null);

      try {
        const data: ChartResponse = await api.getChart(ticker, PERIOD_MAP[p]);

        if (!containerRef.current) return;

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

        // Cleanup existing chart
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
            vertLines: { color: "#27272a", style: LineStyle.Dotted },
            horzLines: { color: "#27272a", style: LineStyle.Dotted },
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

        chart.timeScale().fitContent();

        // Resize handler
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            chart.applyOptions({ width, height: height || 400 });
          }
        });
        resizeObserver.observe(container);

        setLoading(false);

        return () => {
          resizeObserver.disconnect();
          chart.remove();
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chart");
        setLoading(false);
      }
    },
    [ticker],
  );

  useEffect(() => {
    const cleanup = loadChart(period);
    return () => {
      cleanup?.then((fn) => fn?.());
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [period, loadChart]);

  return (
    <div className={cn("relative", className)}>
      {/* Period selector */}
      <div className="flex items-center gap-1 mb-3">
        {CHART_PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              period === p
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60",
            )}
          >
            {p}
          </button>
        ))}
        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block" />
            SMA 20
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-orange-500 rounded-full inline-block" />
            SMA 50
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="w-full h-[400px] md:h-[400px] sm:h-[300px] rounded-lg overflow-hidden"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10 rounded-lg">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-10 rounded-lg gap-2">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => loadChart(period)}
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

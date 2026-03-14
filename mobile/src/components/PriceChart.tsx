import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../theme';
import api from '../api/client';

const PERIODS = ['1M', '3M', '6M', '1Y', '2Y', '5Y'] as const;
type ChartPeriod = typeof PERIODS[number];

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  ticker: string;
  priceData?: {
    current: number;
    change: number;
    change_pct: number;
    high_52w?: number;
    low_52w?: number;
  };
  height?: number;
}

/**
 * Calculate Simple Moving Average from candle close prices.
 */
function calcSMA(candles: CandleData[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    result.push({ time: candles[i].time, value: +(sum / period).toFixed(2) });
  }
  return result;
}

// ── Web-only chart using lightweight-charts ──

function WebChart({ ticker, height, priceData }: PriceChartProps) {
  const { isDark, colors } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRefs = useRef<{ candle: any; volume: any; sma20: any; sma50: any }>({
    candle: null,
    volume: null,
    sma20: null,
    sma50: null,
  });
  const [period, setPeriod] = useState<ChartPeriod>('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const chartHeight = height ?? 360;

  // Fetch data when ticker or period changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getChartData(ticker, period.toLowerCase())
      .then(res => {
        if (!cancelled) {
          setCandles(res.candles);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError('Failed to load chart data');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [ticker, period]);

  // Create / update chart
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    let chart = chartRef.current;

    // Dynamically import lightweight-charts (only on web)
    const initChart = async () => {
      const lc = await import('lightweight-charts');

      if (!containerRef.current) return;

      // Dispose previous chart to avoid stale references
      if (chart) {
        try { chart.remove(); } catch {}
        chartRef.current = null;
        seriesRefs.current = { candle: null, volume: null, sma20: null, sma50: null };
      }

      const bgColor = isDark ? '#060612' : '#f4f5f9';
      const textColor = isDark ? '#9090b0' : '#505068';
      const gridColor = isDark ? '#1c1c3a' : '#dcdde5';
      const borderColor = isDark ? '#1c1c3a' : '#dcdde5';

      chart = lc.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: chartHeight,
        layout: {
          background: { type: lc.ColorType.Solid, color: bgColor },
          textColor,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: { color: isDark ? '#5c6bc060' : '#4a5ab830', width: 1, style: lc.LineStyle.Dashed, labelBackgroundColor: isDark ? '#5c6bc0' : '#4a5ab8' },
          horzLine: { color: isDark ? '#5c6bc060' : '#4a5ab830', width: 1, style: lc.LineStyle.Dashed, labelBackgroundColor: isDark ? '#5c6bc0' : '#4a5ab8' },
        },
        rightPriceScale: {
          borderColor,
          scaleMargins: { top: 0.05, bottom: 0.25 },
        },
        timeScale: {
          borderColor,
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      // Candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: isDark ? '#26a69a' : '#00897b',
        downColor: isDark ? '#ef5350' : '#e53935',
        borderUpColor: isDark ? '#26a69a' : '#00897b',
        borderDownColor: isDark ? '#ef5350' : '#e53935',
        wickUpColor: isDark ? '#26a69a' : '#00897b',
        wickDownColor: isDark ? '#ef5350' : '#e53935',
      });
      candleSeries.setData(candles);
      seriesRefs.current.candle = candleSeries;

      // Volume histogram
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        candles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open
            ? (isDark ? '#26a69a30' : '#00897b25')
            : (isDark ? '#ef535030' : '#e5393525'),
        })),
      );
      seriesRefs.current.volume = volumeSeries;

      // SMA 20
      const sma20Data = calcSMA(candles, 20);
      const sma20Series = chart.addLineSeries({
        color: isDark ? '#7986cb' : '#6370c5',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      sma20Series.setData(sma20Data);
      seriesRefs.current.sma20 = sma20Series;

      // SMA 50
      const sma50Data = calcSMA(candles, 50);
      const sma50Series = chart.addLineSeries({
        color: isDark ? '#ffa726' : '#ef6c00',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      sma50Series.setData(sma50Data);
      seriesRefs.current.sma50 = sma50Series;

      // Current price line
      if (priceData) {
        candleSeries.createPriceLine({
          price: priceData.current,
          color: isDark ? '#5c6bc0' : '#4a5ab8',
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dotted,
          axisLabelVisible: true,
          title: '',
        });
      }

      chart.timeScale().fitContent();

      // Resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      const ro = new ResizeObserver(entries => {
        if (!chartRef.current || !containerRef.current) return;
        const { width } = entries[0].contentRect;
        if (width > 0) {
          chartRef.current.applyOptions({ width });
        }
      });
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
    };

    initChart();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [candles, isDark, chartHeight, priceData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch {}
        chartRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      {/* Period selector */}
      <View style={s.periodRow}>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: isDark ? '#7986cb' : '#6370c5' }]} />
          <Text style={s.legendText}>SMA 20</Text>
          <View style={[s.legendDot, { backgroundColor: isDark ? '#ffa726' : '#ef6c00' }]} />
          <Text style={s.legendText}>SMA 50</Text>
        </View>
        <View style={s.periodBtns}>
          {PERIODS.map(p => (
            <Pressable
              key={p}
              style={[s.periodBtn, period === p && s.periodBtnActive]}
              onPress={() => setPeriod(p)}
              accessibilityRole="button"
              accessibilityLabel={`Chart period ${p}`}
            >
              <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Chart area */}
      <View style={[s.chartWrapper, { height: chartHeight }]}>
        {loading && (
          <View style={s.overlay}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
        {error && !loading && (
          <View style={s.overlay}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: chartHeight,
            opacity: loading ? 0.3 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />
      </View>
    </View>
  );
}

// ── Native fallback ──

function NativeChart({ ticker }: PriceChartProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[s.container, s.nativeFallback]}>
      <Text style={s.nativeFallbackText}>
        Interactive chart available on web
      </Text>
    </View>
  );
}

// ── Export: pick platform-appropriate component ──

export default function PriceChart(props: PriceChartProps) {
  if (Platform.OS === 'web') {
    return <WebChart {...props} />;
  }
  return <NativeChart {...props} />;
}

// ── Styles ──

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    periodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendDot: {
      width: 8,
      height: 3,
      borderRadius: 1,
    },
    legendText: {
      fontSize: 10,
      color: colors.textTertiary,
      marginRight: spacing.sm,
    },
    periodBtns: {
      flexDirection: 'row',
      gap: 2,
    },
    periodBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    periodBtnActive: {
      backgroundColor: colors.accentDim,
    },
    periodBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    periodBtnTextActive: {
      color: colors.accent,
    },
    chartWrapper: {
      position: 'relative',
      width: '100%',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
    },
    nativeFallback: {
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nativeFallbackText: {
      color: colors.textTertiary,
      fontSize: 13,
    },
  });
}

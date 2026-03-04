import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, radius, type ThemeColors } from '../theme';
import type { PriceDistBin } from '../types/analysis';

interface Props {
  current: number;
  low: number;
  high: number;
  width?: number;
  distribution?: PriceDistBin[];
}

export default function Week52Gauge({ current, low, high, width = 280, distribution }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const range = high - low;
  const position = range > 0 ? ((current - low) / range) : 0.5;
  const clampedPos = Math.min(Math.max(position, 0), 1);
  const barHeight = 12;
  const markerR = 8;
  const positionPct = (clampedPos * 100).toFixed(0);
  const fromHigh = ((1 - clampedPos) * 100).toFixed(0);

  // Distribution histogram computed in the same coordinate space as the position bar.
  // The usable track spans from markerR to (width - markerR), matching the gauge bar exactly.
  const distHistogram = useMemo(() => {
    if (!distribution || distribution.length === 0) return null;

    const trackStart = markerR;
    const trackWidth = width - markerR * 2;
    const maxHistHeight = 40; // px, tallest bar height
    const histGap = 1;       // px gap between bars
    const maxDays = Math.max(...distribution.map(b => b.days));
    if (maxDays === 0) return null;

    // Each bin maps its [price_low, price_high] into the track coordinate space.
    // We clip bins to [low, high] so out-of-range data doesn't overflow.
    return distribution.map((bin, i) => {
      // Map prices to x-axis fractions within the 52w range
      const binLowFrac = range > 0 ? Math.min(Math.max((bin.price_low - low) / range, 0), 1) : 0;
      const binHighFrac = range > 0 ? Math.min(Math.max((bin.price_high - low) / range, 0), 1) : 1;

      const x = trackStart + binLowFrac * trackWidth;
      const binWidth = Math.max((binHighFrac - binLowFrac) * trackWidth - histGap, 1);
      const barH = Math.max((bin.days / maxDays) * maxHistHeight, 2);

      const isCurrentBin =
        current >= bin.price_low &&
        (i === distribution.length - 1 ? current <= bin.price_high : current < bin.price_high);

      return { x, binWidth, barH, isCurrentBin, key: i };
    });
  }, [distribution, low, high, range, width, current, markerR]);

  const distSvgHeight = 48; // label + histogram bars

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>52-Week Position</Text>
        <Text style={[s.pctBadge, {
          color: clampedPos >= 0.8 ? colors.bearish : clampedPos <= 0.2 ? colors.bullish : colors.accent,
        }]}>
          {positionPct}%
        </Text>
      </View>

      <View style={s.gaugeContainer}>
        <Svg width={width} height={barHeight + markerR * 2 + 4}>
          <Defs>
            <LinearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.bullish} stopOpacity="0.6" />
              <Stop offset="0.5" stopColor={colors.accent} stopOpacity="0.4" />
              <Stop offset="1" stopColor={colors.bearish} stopOpacity="0.6" />
            </LinearGradient>
          </Defs>
          <Rect x={markerR} y={markerR} width={width - markerR * 2} height={barHeight} rx={barHeight / 2} fill={colors.bgElevated} />
          <Rect x={markerR} y={markerR} width={width - markerR * 2} height={barHeight} rx={barHeight / 2} fill="url(#barGrad)" />
          <Circle cx={markerR + clampedPos * (width - markerR * 2)} cy={markerR + barHeight / 2} r={markerR}
            fill={colors.textPrimary} stroke={colors.bg} strokeWidth={2}
          />
        </Svg>
      </View>

      <View style={s.labels}>
        <View>
          <Text style={s.labelValue}>${low.toFixed(2)}</Text>
          <Text style={s.labelText}>52W Low</Text>
        </View>
        <View style={s.centerLabel}>
          <Text style={[s.currentValue, {
            color: clampedPos >= 0.8 ? colors.bearish : clampedPos <= 0.2 ? colors.bullish : colors.textPrimary,
          }]}>${current.toFixed(2)}</Text>
          <Text style={s.labelText}>{fromHigh}% from high</Text>
        </View>
        <View>
          <Text style={[s.labelValue, { textAlign: 'right' }]}>${high.toFixed(2)}</Text>
          <Text style={[s.labelText, { textAlign: 'right' }]}>52W High</Text>
        </View>
      </View>

      {distHistogram && (
        <View style={s.distContainer}>
          <Text style={s.distLabel}>Price distribution (252d)</Text>
          {/* SVG shares the same width as the gauge so bars line up perfectly */}
          <Svg width={width} height={distSvgHeight}>
            {distHistogram.map(({ x, binWidth, barH, isCurrentBin, key }) => (
              <Rect
                key={key}
                x={x}
                y={distSvgHeight - barH}
                width={binWidth}
                height={barH}
                rx={1}
                fill={isCurrentBin ? colors.accent : `${colors.textMuted}40`}
              />
            ))}
          </Svg>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: c.bgCard, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  title: { color: c.textSecondary, ...typography.bodySm, fontWeight: '600' },
  pctBadge: { ...typography.bodyBold },
  gaugeContainer: { alignItems: 'center', marginBottom: spacing.sm },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  labelValue: { color: c.textTertiary, ...typography.numberSm },
  labelText: { color: c.textMuted, ...typography.labelSm, marginTop: 1 },
  centerLabel: { alignItems: 'center' },
  currentValue: { ...typography.bodyBold },
  distContainer: { marginTop: 8, alignItems: 'center' },
  distLabel: { color: c.textMuted, fontSize: 9, marginBottom: 4, alignSelf: 'flex-start' },
});

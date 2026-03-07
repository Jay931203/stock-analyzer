import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PeriodStats } from '../types/analysis';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, getWinRateColor, type ThemeColors } from '../theme';

interface Props {
  label?: string;
  periods: Record<string, PeriodStats>;
}

const PERIOD_LABELS: Record<string, string> = {
  '5': '5D', '10': '10D', '20': '1M', '60': '3M', '120': '6M', '252': '1Y',
};

export default function ProbabilityBar({ label, periods }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const sorted = Object.entries(periods).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <View style={s.container}>
      {label && <Text style={s.label}>{label}</Text>}
      {sorted.map(([period, stats]) => {
        const winColor = getWinRateColor(stats.win_rate, colors);
        const barWidth = Math.min(Math.max(stats.win_rate, 0), 100);
        return (
          <View key={period} style={s.row}>
            <Text style={s.period}>{PERIOD_LABELS[period] ?? `${period}d`}</Text>
            <View style={s.barContainer}>
              <View style={s.barTrack}>
                <View style={s.centerLine} />
                <View style={[s.barFill, { width: `${barWidth}%`, backgroundColor: winColor }]} />
              </View>
            </View>
            <Text style={[s.value, { color: winColor }]}>{stats.win_rate.toFixed(0)}%</Text>
            <Text style={[s.returnValue, { color: stats.avg_return >= 0 ? colors.bullish : colors.bearish }]}>
              {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { marginBottom: spacing.xs },
  label: {
    color: c.textTertiary,
    ...typography.labelSm,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: spacing.sm,
  },
  period: {
    color: c.textTertiary,
    ...typography.labelSm,
    width: 24,
    textAlign: 'right',
    fontWeight: '600',
  },
  barContainer: { flex: 1 },
  barTrack: {
    height: 16,
    backgroundColor: c.bgElevated,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: `${c.textPrimary}10`,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    opacity: 0.6,
  },
  value: {
    ...typography.numberSm,
    width: 36,
    textAlign: 'right',
  },
  returnValue: {
    ...typography.labelSm,
    width: 46,
    textAlign: 'right',
  },
});

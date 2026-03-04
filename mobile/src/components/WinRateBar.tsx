import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, getWinRateColor, type ThemeColors } from '../theme';
import type { ProbabilityData } from '../types/analysis';

const PERIOD_LABELS: Record<string, string> = {
  '5': '5D', '10': '10D', '20': '1M', '60': '3M', '120': '6M', '252': '1Y',
};

interface Props {
  probability: ProbabilityData;
  compact?: boolean;
}

export default function WinRateBar({ probability, compact = false }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const periods = Object.entries(probability.periods)
    .filter(([k]) => compact ? ['5', '20', '60', '252'].includes(k) : true)
    .sort(([a], [b]) => Number(a) - Number(b));

  if (periods.length === 0) return null;

  const barWidth = 180;
  const barHeight = compact ? 14 : 16;
  const gap = compact ? 4 : 6;

  return (
    <View style={s.container}>
      {periods.map(([period, stats]) => {
        const wr = stats.win_rate;
        const fillWidth = (wr / 100) * barWidth;
        const barColor = getWinRateColor(wr);
        const label = PERIOD_LABELS[period] || `${period}D`;

        return (
          <View key={period} style={[s.row, { marginBottom: gap }]}>
            <Text style={[s.periodLabel, compact && s.periodLabelSm]}>{label}</Text>
            <View style={s.barContainer}>
              <Svg width={barWidth} height={barHeight}>
                <Rect x={0} y={0} width={barWidth} height={barHeight} rx={barHeight / 2} fill={colors.bgElevated} />
                <Rect x={0} y={0} width={Math.max(fillWidth, barHeight)} height={barHeight} rx={barHeight / 2} fill={barColor} opacity={0.7} />
                <Line x1={barWidth / 2} y1={0} x2={barWidth / 2} y2={barHeight} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="2,2" opacity={0.5} />
              </Svg>
            </View>
            <Text style={[s.winRate, { color: barColor }]}>{wr.toFixed(0)}%</Text>
            {!compact && (
              <Text style={[s.avgReturn, { color: stats.avg_return >= 0 ? colors.bullish : colors.bearish }]}>
                {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
              </Text>
            )}
          </View>
        );
      })}
      <View style={s.footer}>
        <Text style={s.samplesText}>{probability.occurrences} historical cases</Text>
        {probability.warning && <Text style={s.warningText}>{probability.warning}</Text>}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  periodLabel: {
    width: 28, color: c.textTertiary, ...typography.labelSm, textAlign: 'right', marginRight: spacing.sm,
  },
  periodLabelSm: { width: 22, fontSize: 9 },
  barContainer: { flex: 1, maxWidth: 180 },
  winRate: { width: 36, ...typography.numberSm, textAlign: 'right', marginLeft: spacing.sm },
  avgReturn: { width: 44, ...typography.labelSm, textAlign: 'right', marginLeft: spacing.xs },
  footer: { marginTop: spacing.xs },
  samplesText: { color: c.textMuted, ...typography.labelSm },
  warningText: { color: c.warning, ...typography.labelSm, marginTop: 2 },
});

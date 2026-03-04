import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { AnalysisResponse } from '../types/analysis';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../theme';

interface Props {
  data: AnalysisResponse;
  activeIndicators: Set<string>;
  onToggle: (key: string) => void;
}

interface Badge {
  key: string;
  label: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export default function DashboardSummary({ data, activeIndicators, onToggle }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { indicators } = data;

  const badges: Badge[] = [
    { key: 'RSI', label: 'RSI', value: indicators.rsi.value !== null ? indicators.rsi.value.toFixed(0) : '--',
      signal: indicators.rsi.value !== null ? indicators.rsi.value < 30 ? 'bullish' : indicators.rsi.value > 70 ? 'bearish' : 'neutral' : 'neutral' },
    { key: 'MACD', label: 'MACD',
      value: indicators.macd.event === 'golden_cross' ? 'GX' : indicators.macd.event === 'dead_cross' ? 'DX' : indicators.macd.histogram && indicators.macd.histogram > 0 ? '+' : '-',
      signal: indicators.macd.event === 'golden_cross' ? 'bullish' : indicators.macd.event === 'dead_cross' ? 'bearish' : indicators.macd.histogram && indicators.macd.histogram > 0 ? 'bullish' : 'bearish' },
    { key: 'MA', label: 'MA', value: indicators.ma.alignment === 'bullish' ? 'Bull' : indicators.ma.alignment === 'bearish' ? 'Bear' : '--',
      signal: indicators.ma.alignment === 'bullish' ? 'bullish' : indicators.ma.alignment === 'bearish' ? 'bearish' : 'neutral' },
    { key: 'Drawdown', label: 'DD', value: indicators.drawdown.from_60d_high !== null ? `${indicators.drawdown.from_60d_high.toFixed(0)}%` : '--',
      signal: indicators.drawdown.from_60d_high !== null ? indicators.drawdown.from_60d_high <= -10 ? 'bearish' : indicators.drawdown.from_60d_high <= -5 ? 'neutral' : 'bullish' : 'neutral' },
    { key: 'ADX', label: 'ADX', value: indicators.adx.adx !== null ? indicators.adx.adx.toFixed(0) : '--',
      signal: indicators.adx.adx !== null ? indicators.adx.adx >= 25 ? 'bullish' : 'neutral' : 'neutral' },
    { key: 'BB', label: 'BB', value: indicators.bb.position !== null ? `${(indicators.bb.position * 100).toFixed(0)}%` : '--',
      signal: indicators.bb.position !== null ? indicators.bb.position < 0.2 ? 'bullish' : indicators.bb.position > 0.8 ? 'bearish' : 'neutral' : 'neutral' },
    { key: 'MADist', label: 'Dist', value: indicators.ma_distance.from_sma20 !== null ? `${indicators.ma_distance.from_sma20 > 0 ? '+' : ''}${indicators.ma_distance.from_sma20.toFixed(0)}%` : '--',
      signal: indicators.ma_distance.from_sma20 !== null ? Math.abs(indicators.ma_distance.from_sma20) > 5 ? 'bearish' : 'neutral' : 'neutral' },
    { key: 'Consec', label: 'Streak', value: `${indicators.consecutive.days > 0 ? '+' : ''}${indicators.consecutive.days}d`,
      signal: indicators.consecutive.days >= 5 ? 'bearish' : indicators.consecutive.days <= -5 ? 'bullish' : 'neutral' },
    { key: 'Vol', label: 'Vol', value: indicators.volume.ratio !== null ? `${indicators.volume.ratio.toFixed(1)}x` : '--',
      signal: indicators.volume.ratio !== null && indicators.volume.ratio > 2 ? 'bullish' : 'neutral' },
    { key: 'W52', label: '52W', value: indicators.week52.position_pct !== null ? `${indicators.week52.position_pct.toFixed(0)}%` : '--',
      signal: indicators.week52.position_pct !== null ? indicators.week52.position_pct >= 90 ? 'bearish' : indicators.week52.position_pct <= 10 ? 'bullish' : 'neutral' : 'neutral' },
    { key: 'Stoch', label: 'Stoch', value: indicators.stochastic.k !== null ? indicators.stochastic.k.toFixed(0) : '--',
      signal: indicators.stochastic.k !== null ? indicators.stochastic.k < 20 ? 'bullish' : indicators.stochastic.k > 80 ? 'bearish' : 'neutral' : 'neutral' },
    { key: 'ATR', label: 'ATR', value: indicators.atr.atr_pct !== null ? `${indicators.atr.atr_pct.toFixed(1)}%` : '--', signal: 'neutral' },
  ];

  const sigColor = { bullish: colors.bullish, bearish: colors.bearish, neutral: colors.neutral };
  const sigBg = { bullish: colors.bullishBg, bearish: colors.bearishBg, neutral: colors.neutralBg };

  return (
    <View style={s.container}>
      <View style={s.grid}>
        {badges.map((badge) => {
          const isActive = activeIndicators.has(badge.key);
          return (
            <Pressable key={badge.key}
              style={[s.badge, { backgroundColor: sigBg[badge.signal] }, isActive && s.badgeActive]}
              onPress={() => onToggle(badge.key)}
            >
              <Text style={s.badgeLabel}>{badge.label}</Text>
              <Text style={[s.badgeValue, { color: sigColor[badge.signal] }]}>{badge.value}</Text>
              {isActive && <View style={[s.activeDot, { backgroundColor: sigColor[badge.signal] }]} />}
            </Pressable>
          );
        })}
        <Pressable
          style={[s.badge, s.combinedBadge, activeIndicators.has('Combined') && s.badgeActive]}
          onPress={() => onToggle('Combined')}
        >
          <Text style={s.badgeLabel}>Combo</Text>
          <Text style={[s.badgeValue, { color: colors.accent }]}>Mix</Text>
          {activeIndicators.has('Combined') && <View style={[s.activeDot, { backgroundColor: colors.accent }]} />}
        </Pressable>
      </View>
      <Text style={s.hint}>Tap to toggle details. Select multiple.</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    minWidth: 72, flexGrow: 1, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: radius.sm, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', position: 'relative',
  },
  badgeActive: {
    borderColor: c.accentGlow,
    shadowColor: c.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  combinedBadge: { backgroundColor: c.bgElevated },
  badgeLabel: { color: c.textTertiary, ...typography.labelSm, textTransform: 'uppercase' },
  badgeValue: { ...typography.number, marginTop: 2 },
  activeDot: { position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  hint: { color: c.textMuted, ...typography.labelSm, textAlign: 'center', marginTop: spacing.sm },
});

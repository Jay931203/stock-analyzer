import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { AnalysisResponse } from '../types/analysis';

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
  const { indicators } = data;

  const badges: Badge[] = [
    {
      key: 'RSI',
      label: 'RSI',
      value: indicators.rsi.value !== null ? indicators.rsi.value.toFixed(0) : '--',
      signal: indicators.rsi.value !== null
        ? indicators.rsi.value < 30 ? 'bullish' : indicators.rsi.value > 70 ? 'bearish' : 'neutral'
        : 'neutral',
    },
    {
      key: 'MACD',
      label: 'MACD',
      value: indicators.macd.event === 'golden_cross' ? 'GX'
        : indicators.macd.event === 'dead_cross' ? 'DX'
        : indicators.macd.histogram && indicators.macd.histogram > 0 ? '+' : '-',
      signal: indicators.macd.event === 'golden_cross' ? 'bullish'
        : indicators.macd.event === 'dead_cross' ? 'bearish'
        : indicators.macd.histogram && indicators.macd.histogram > 0 ? 'bullish' : 'bearish',
    },
    {
      key: 'MA',
      label: 'MA',
      value: indicators.ma.alignment === 'bullish' ? 'Bull'
        : indicators.ma.alignment === 'bearish' ? 'Bear' : '--',
      signal: indicators.ma.alignment === 'bullish' ? 'bullish'
        : indicators.ma.alignment === 'bearish' ? 'bearish' : 'neutral',
    },
    {
      key: 'Drawdown',
      label: 'DD',
      value: indicators.drawdown.from_60d_high !== null
        ? `${indicators.drawdown.from_60d_high.toFixed(0)}%` : '--',
      signal: indicators.drawdown.from_60d_high !== null
        ? indicators.drawdown.from_60d_high <= -10 ? 'bearish'
        : indicators.drawdown.from_60d_high <= -5 ? 'neutral'
        : 'bullish'
        : 'neutral',
    },
    {
      key: 'ADX',
      label: 'ADX',
      value: indicators.adx.adx !== null ? indicators.adx.adx.toFixed(0) : '--',
      signal: indicators.adx.adx !== null
        ? indicators.adx.adx >= 25 ? 'bullish' : 'neutral'
        : 'neutral',
    },
    {
      key: 'BB',
      label: 'BB',
      value: indicators.bb.position !== null ? `${(indicators.bb.position * 100).toFixed(0)}%` : '--',
      signal: indicators.bb.position !== null
        ? indicators.bb.position < 0.2 ? 'bullish'
        : indicators.bb.position > 0.8 ? 'bearish' : 'neutral'
        : 'neutral',
    },
    {
      key: 'MADist',
      label: 'Dist',
      value: indicators.ma_distance.from_sma20 !== null
        ? `${indicators.ma_distance.from_sma20 > 0 ? '+' : ''}${indicators.ma_distance.from_sma20.toFixed(0)}%` : '--',
      signal: indicators.ma_distance.from_sma20 !== null
        ? Math.abs(indicators.ma_distance.from_sma20) > 5 ? 'bearish' : 'neutral'
        : 'neutral',
    },
    {
      key: 'Consec',
      label: 'Streak',
      value: `${indicators.consecutive.days > 0 ? '+' : ''}${indicators.consecutive.days}d`,
      signal: indicators.consecutive.days >= 5 ? 'bearish'
        : indicators.consecutive.days <= -5 ? 'bullish'
        : 'neutral',
    },
    {
      key: 'Vol',
      label: 'Vol',
      value: indicators.volume.ratio !== null ? `${indicators.volume.ratio.toFixed(1)}x` : '--',
      signal: indicators.volume.ratio !== null && indicators.volume.ratio > 2 ? 'bullish' : 'neutral',
    },
    {
      key: 'W52',
      label: '52W',
      value: indicators.week52.position_pct !== null
        ? `${indicators.week52.position_pct.toFixed(0)}%` : '--',
      signal: indicators.week52.position_pct !== null
        ? indicators.week52.position_pct >= 90 ? 'bearish'
        : indicators.week52.position_pct <= 10 ? 'bullish' : 'neutral'
        : 'neutral',
    },
    {
      key: 'Stoch',
      label: 'Stoch',
      value: indicators.stochastic.k !== null ? indicators.stochastic.k.toFixed(0) : '--',
      signal: indicators.stochastic.k !== null
        ? indicators.stochastic.k < 20 ? 'bullish'
        : indicators.stochastic.k > 80 ? 'bearish' : 'neutral'
        : 'neutral',
    },
    {
      key: 'ATR',
      label: 'ATR',
      value: indicators.atr.atr_pct !== null ? `${indicators.atr.atr_pct.toFixed(1)}%` : '--',
      signal: 'neutral',
    },
  ];

  const signalColors = { bullish: '#4caf50', bearish: '#f44336', neutral: '#888' };
  const signalBg = { bullish: '#4caf5018', bearish: '#f4433618', neutral: '#88888810' };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {badges.map((badge) => {
          const isActive = activeIndicators.has(badge.key);
          return (
            <Pressable
              key={badge.key}
              style={[
                styles.badge,
                { backgroundColor: signalBg[badge.signal] },
                isActive && styles.badgeActive,
              ]}
              onPress={() => onToggle(badge.key)}
            >
              <Text style={styles.badgeLabel}>{badge.label}</Text>
              <Text style={[styles.badgeValue, { color: signalColors[badge.signal] }]}>
                {badge.value}
              </Text>
              {isActive && <View style={[styles.activeDot, { backgroundColor: signalColors[badge.signal] }]} />}
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.badge, styles.combinedBadge, activeIndicators.has('Combined') && styles.badgeActive]}
          onPress={() => onToggle('Combined')}
        >
          <Text style={styles.badgeLabel}>Combo</Text>
          <Text style={[styles.badgeValue, { color: '#6c9bd1' }]}>Mix</Text>
          {activeIndicators.has('Combined') && <View style={[styles.activeDot, { backgroundColor: '#6c9bd1' }]} />}
        </Pressable>
      </View>
      <Text style={styles.hint}>Tap to toggle details. Select multiple.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    minWidth: 72,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e3e',
    alignItems: 'center',
    position: 'relative',
  },
  badgeActive: {
    borderColor: '#6c9bd180',
    shadowColor: '#6c9bd1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  combinedBadge: { backgroundColor: '#1a1a3018' },
  badgeLabel: { color: '#777', fontSize: 10, fontWeight: '500', letterSpacing: 0.3, textTransform: 'uppercase' },
  badgeValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  activeDot: { position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  hint: { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 8 },
});

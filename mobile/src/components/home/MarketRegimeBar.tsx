import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SignalItem } from '../../types/analysis';
import { spacing, radius, type ThemeColors } from '../../theme';
import { PERIOD_LABELS } from '../../constants/ui';

const LEVERAGED_TICKERS = new Set(['TQQQ', 'SOXL', 'UPRO', 'TECL', 'SQQQ', 'LABU', 'TNA', 'FNGU']);

function getWinRateForPeriod(sig: SignalItem, period: string): number {
  if (period === '5d') return sig.win_rate_5d;
  if (period === '60d') return sig.win_rate_60d;
  if (period === '120d') return sig.win_rate_120d ?? sig.win_rate_60d;
  if (period === '252d') return sig.win_rate_252d ?? sig.win_rate_60d;
  return sig.win_rate_20d;
}

interface Props {
  signals: SignalItem[];
  period: string;
  colors: ThemeColors;
}

function MarketRegimeBar({ signals, period, colors }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);

  const marketRegime = useMemo(() => {
    const nonLev = signals.filter(
      (sig) => !LEVERAGED_TICKERS.has(sig.ticker) && sig.ticker !== 'QQQ' && sig.ticker !== 'SPY',
    );
    if (nonLev.length === 0) return null;
    const bullCount = nonLev.filter((sig) => getWinRateForPeriod(sig, period) >= 50).length;
    const bearCount = nonLev.length - bullCount;
    const bullPct = Math.round((bullCount / nonLev.length) * 100);
    const avgWinRate = nonLev.reduce((sum, sig) => sum + getWinRateForPeriod(sig, period), 0) / nonLev.length;
    const mood =
      bullPct >= 65
        ? '강한 강세'
        : bullPct >= 55
          ? '약한 강세'
          : bullPct >= 45
            ? '중립'
            : bullPct >= 35
              ? '약한 약세'
              : '강한 약세';
    return { bullCount, bearCount, bullPct, total: nonLev.length, avgWinRate: Math.round(avgWinRate), mood };
  }, [signals, period]);

  if (!marketRegime) return null;

  return (
    <View style={s.regimeBar}>
      <View style={s.regimeHeader}>
        <Text style={s.regimeTitle}>시장 분위기 ({PERIOD_LABELS[period]})</Text>
        <Text
          style={[
            s.regimeMood,
            {
              color:
                marketRegime.bullPct >= 55
                  ? colors.bullish
                  : marketRegime.bullPct <= 45
                    ? colors.bearish
                    : colors.textSecondary,
            },
          ]}
        >
          {marketRegime.mood}
        </Text>
      </View>
      <View style={s.regimeTrack}>
        <View
          style={[
            s.regimeFill,
            {
              width: `${marketRegime.bullPct}%`,
              backgroundColor: colors.bullish,
            },
          ]}
        />
      </View>
      <View style={s.regimeLabels}>
        <Text style={[s.regimeStat, { color: colors.bullish }]}>{marketRegime.bullCount} 강세</Text>
        <Text style={s.regimePct}>{marketRegime.bullPct}%</Text>
        <Text style={[s.regimeStat, { color: colors.bearish }]}>{marketRegime.bearCount} 약세</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    regimeBar: {
      marginTop: 10,
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    regimeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    regimeTitle: { color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    regimeMood: { fontSize: 11, fontWeight: '800' },
    regimeTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: `${c.bearish}30`,
      overflow: 'hidden' as const,
    },
    regimeFill: { height: '100%', borderRadius: 3 },
    regimeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    regimeStat: { fontSize: 10, fontWeight: '600' },
    regimePct: { color: c.textMuted, fontSize: 10, fontWeight: '700' },
  });

export default React.memo(MarketRegimeBar);

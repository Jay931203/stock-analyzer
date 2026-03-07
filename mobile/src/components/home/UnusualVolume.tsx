import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import type { SignalItem } from '../../types/analysis';
import { spacing, radius, getDirectionColor, type ThemeColors } from '../../theme';

const LEVERAGED_TICKERS = new Set(['TQQQ', 'SOXL', 'UPRO', 'TECL', 'SQQQ', 'LABU', 'TNA', 'FNGU']);

function getWinRateForPeriod(sig: SignalItem, period: string): number {
  if (period === '5d') return sig.win_rate_5d;
  if (period === '60d') return sig.win_rate_60d;
  if (period === '120d') return sig.win_rate_120d ?? sig.win_rate_60d;
  if (period === '252d') return sig.win_rate_252d ?? sig.win_rate_60d;
  return sig.win_rate_20d;
}

function getAvgReturnForPeriod(sig: SignalItem, period: string): number {
  if (period === '5d') return sig.avg_return_5d ?? sig.avg_return_20d;
  if (period === '60d') return sig.avg_return_60d ?? sig.avg_return_20d;
  if (period === '120d') return sig.avg_return_120d ?? sig.avg_return_60d ?? sig.avg_return_20d;
  if (period === '252d') return sig.avg_return_252d ?? sig.avg_return_60d ?? sig.avg_return_20d;
  return sig.avg_return_20d;
}

// Local card styles cache (shared structure with parent)
const _cardStylesCache = new WeakMap<ThemeColors, ReturnType<typeof _makeCardStyles>>();
function cardStyles(c: ThemeColors) {
  let s = _cardStylesCache.get(c);
  if (!s) {
    s = _makeCardStyles(c);
    _cardStylesCache.set(c, s);
  }
  return s;
}
function _makeCardStyles(c: ThemeColors) {
  return StyleSheet.create({
    ticker: { color: c.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    change: { fontSize: 11, fontWeight: '600' },
    companyName: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginTop: -1, marginBottom: 2 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    price: { color: c.textTertiary, fontSize: 12, fontWeight: '500' },
    divider: { height: 1, backgroundColor: c.border, marginBottom: 8 },
    winRate: { fontSize: 30, fontWeight: '800', alignSelf: 'center' as const, letterSpacing: -1 },
    probLabel: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '600',
      alignSelf: 'center' as const,
      marginTop: 2,
      letterSpacing: 0.3,
    },
    avgBadge: {
      alignSelf: 'center' as const,
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    avgText: { fontSize: 11, fontWeight: '700' },
  });
}

interface Props {
  signals: SignalItem[];
  period: string;
  colors: ThemeColors;
  onPress: (ticker: string) => void;
}

function UnusualVolume({ signals, period, colors, onPress }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cs = cardStyles(colors);

  const unusualVolume = useMemo(() => {
    return signals
      .filter(
        (sig) =>
          !LEVERAGED_TICKERS.has(sig.ticker) &&
          sig.ticker !== 'QQQ' &&
          sig.ticker !== 'SPY' &&
          sig.volume_ratio !== undefined &&
          (sig.volume_ratio >= 2.0 || sig.volume_ratio <= 0.3),
      )
      .sort((a, b) => (b.volume_ratio ?? 1) - (a.volume_ratio ?? 1))
      .slice(0, 10);
  }, [signals]);

  const renderItem = useCallback(({ item: sig }: { item: SignalItem }) => {
    const wr = getWinRateForPeriod(sig, period);
    const avgReturn = getAvgReturnForPeriod(sig, period);
    const isSpike = (sig.volume_ratio ?? 1) >= 2.0;
    return (
      <Pressable
        style={({ pressed }) => [
          s.volumeCard,
          pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
        ]}
        onPress={() => onPress(sig.ticker)}
        accessibilityRole="button"
        accessibilityLabel={`${sig.ticker} ${sig.name || ''}, volume ${(sig.volume_ratio ?? 1).toFixed(1)}x, win rate ${wr.toFixed(0)}%`}
      >
        <Text style={cs.ticker}>{sig.ticker}</Text>
        {sig.name && (
          <Text style={cs.companyName} numberOfLines={1}>
            {sig.name}
          </Text>
        )}
        <View
          style={[
            s.volumeBadge,
            {
              backgroundColor: isSpike ? '#F9731620' : '#3B82F620',
            },
          ]}
        >
          <Text
            style={[
              s.volumeBadgeText,
              {
                color: isSpike ? '#F97316' : '#3B82F6',
              },
            ]}
          >
            Vol {(sig.volume_ratio ?? 1).toFixed(1)}x
          </Text>
        </View>
        <View style={cs.divider} />
        <Text
          style={[
            cs.winRate,
            { color: wr >= 50 ? colors.bullish : colors.bearish, fontSize: 22 },
          ]}
        >
          {wr.toFixed(0)}%
        </Text>
        <Text style={cs.probLabel}>승률</Text>
        {avgReturn !== undefined && avgReturn !== 0 && sig.occurrences > 0 && (
          <View
            style={[
              cs.avgBadge,
              {
                backgroundColor: avgReturn >= 0 ? `${colors.bullish}15` : `${colors.bearish}15`,
              },
            ]}
          >
            <Text
              style={[
                cs.avgText,
                {
                  color: avgReturn >= 0 ? colors.bullish : colors.bearish,
                },
              ]}
            >
              평균 {avgReturn >= 0 ? '+' : ''}
              {avgReturn.toFixed(1)}%
            </Text>
          </View>
        )}
        <View style={cs.priceRow}>
          <Text style={cs.price}>${sig.price.toFixed(2)}</Text>
          <Text style={[cs.change, { color: getDirectionColor(sig.change_pct, colors) }]}>
            {sig.change_pct >= 0 ? '+' : ''}
            {sig.change_pct.toFixed(1)}%
          </Text>
        </View>
      </Pressable>
    );
  }, [period, colors, onPress, s, cs]);

  if (unusualVolume.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: '#F97316' }]} />
        <Text style={s.sectionLabel}>이상 거래량</Text>
        <Text style={s.sectionCount}>{unusualVolume.length}</Text>
      </View>
      <FlatList
        horizontal
        data={unusualVolume}
        keyExtractor={item => item.ticker}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.lg }}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        renderItem={renderItem}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xs },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    sectionDot: { width: 6, height: 6, borderRadius: 3 },
    sectionLabel: {
      color: c.textTertiary,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      flex: 1,
      textTransform: 'uppercase',
    },
    sectionCount: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    volumeCard: {
      width: 156,
      minHeight: 160,
      backgroundColor: c.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginRight: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 3,
      borderLeftColor: '#F97316',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    volumeBadge: {
      alignSelf: 'center' as const,
      marginTop: 6,
      marginBottom: 4,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    volumeBadgeText: { fontSize: 13, fontWeight: '800' },
  });

export default React.memo(UnusualVolume);

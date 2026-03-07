import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { FlipItem } from '../../types/analysis';
import { spacing, radius, getDirectionColor, type ThemeColors } from '../../theme';

// Re-use the shared cardStyles cache from a local copy
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
    card: {
      width: 156,
      minHeight: 160,
      backgroundColor: c.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginRight: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    ticker: { color: c.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    change: { fontSize: 11, fontWeight: '600' },
    companyName: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginTop: -1, marginBottom: 2 },
    divider: { height: 1, backgroundColor: c.border, marginBottom: 8 },
  });
}

interface Props {
  flips: FlipItem[];
  colors: ThemeColors;
  onPress: (ticker: string) => void;
}

function SignalFlips({ flips, colors, onPress }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cs = cardStyles(colors);

  if (flips.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: '#F59E0B' }]} />
        <Text style={s.sectionLabel}>JUST FLIPPED</Text>
        <Text style={s.sectionCount}>{flips.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
        {flips.map((flip) => (
          <Pressable
            key={flip.ticker}
            style={({ pressed }) => [
              cs.card,
              { borderLeftColor: flip.direction === 'bullish' ? colors.bullish : colors.bearish },
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
            ]}
            onPress={() => onPress(flip.ticker)}
            accessibilityRole="button"
            accessibilityLabel={`${flip.ticker} flipped ${flip.direction}, win rate ${flip.curr_win_rate.toFixed(0)}%`}
          >
            <View style={cs.topRow}>
              <Text style={cs.ticker}>{flip.ticker}</Text>
              <Text style={[cs.change, { color: getDirectionColor(flip.change_pct, colors) }]}>
                {flip.change_pct >= 0 ? '+' : ''}
                {flip.change_pct.toFixed(1)}%
              </Text>
            </View>
            {flip.name && (
              <Text style={cs.companyName} numberOfLines={1}>
                {flip.name}
              </Text>
            )}
            <View style={cs.divider} />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={s.flipArrow}>
                <Text
                  style={[
                    s.flipFrom,
                    { color: flip.direction === 'bullish' ? colors.bearish : colors.bullish },
                  ]}
                >
                  {flip.prev_win_rate.toFixed(0)}%
                </Text>
                <Text style={s.flipArrowText}>{'\u2192'}</Text>
                <Text
                  style={[
                    s.flipTo,
                    { color: flip.direction === 'bullish' ? colors.bullish : colors.bearish },
                  ]}
                >
                  {flip.curr_win_rate.toFixed(0)}%
                </Text>
              </View>
              <View
                style={[
                  s.flipBadge,
                  {
                    backgroundColor:
                      flip.direction === 'bullish' ? `${colors.bullish}20` : `${colors.bearish}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    s.flipBadgeText,
                    {
                      color: flip.direction === 'bullish' ? colors.bullish : colors.bearish,
                    },
                  ]}
                >
                  {flip.direction === 'bullish' ? 'NOW BULL' : 'NOW BEAR'}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
    flipArrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    flipFrom: { fontSize: 16, fontWeight: '700' },
    flipArrowText: { fontSize: 14, color: c.textMuted },
    flipTo: { fontSize: 20, fontWeight: '800' },
    flipBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      marginTop: 2,
    },
    flipBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  });

export default React.memo(SignalFlips);

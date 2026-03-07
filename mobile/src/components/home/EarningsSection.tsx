import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import type { EarningsItem } from '../../types/analysis';
import { spacing, radius, getDirectionColor, type ThemeColors } from '../../theme';

// Local card styles for price/change display
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
    price: { color: c.textTertiary, fontSize: 12, fontWeight: '500' },
    change: { fontSize: 11, fontWeight: '600' },
  });
}

interface Props {
  earnings: EarningsItem[];
  colors: ThemeColors;
  onPress: (ticker: string) => void;
}

function EarningsSection({ earnings, colors, onPress }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cs = cardStyles(colors);

  if (earnings.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: '#8B5CF6' }]} />
        <Text style={s.sectionLabel}>EARNINGS CALENDAR</Text>
        <Text style={s.sectionCount}>{earnings.length}</Text>
      </View>
      <FlatList
        horizontal
        data={earnings}
        keyExtractor={item => `${item.ticker}-${item.earnings_date}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.lg }}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        renderItem={({ item }) => {
          const earnDate = new Date(item.earnings_date + 'T12:00:00');
          const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          const dateLabel = `${monthNames[earnDate.getMonth()]} ${earnDate.getDate()}`;
          return (
            <Pressable
              style={({ pressed }) => [
                s.earningsCard,
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
              ]}
              onPress={() => onPress(item.ticker)}
              accessibilityRole="button"
              accessibilityLabel={`${item.ticker} ${item.name}, earnings ${dateLabel}, D-${item.days_until}`}
            >
              <Text style={s.earningsTicker}>{item.ticker}</Text>
              <Text style={s.earningsName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={s.earningsDate}>{dateLabel}</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                <View style={s.earningsDday}>
                  <Text style={[s.earningsDdayText, { color: colors.accent }]}>D-{item.days_until}</Text>
                </View>
                {item.time_of_day ? (
                  <View style={s.earningsTime}>
                    <Text style={s.earningsTimeText}>{item.time_of_day}</Text>
                  </View>
                ) : null}
              </View>
              {item.price !== undefined && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 6,
                  }}
                >
                  <Text style={cs.price}>${item.price.toFixed(2)}</Text>
                  {item.change_pct !== undefined && (
                    <Text style={[cs.change, { color: getDirectionColor(item.change_pct, colors) }]}>
                      {item.change_pct >= 0 ? '+' : ''}
                      {item.change_pct.toFixed(1)}%
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
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
    earningsCard: {
      width: 156,
      minHeight: 140,
      backgroundColor: c.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginRight: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 3,
      borderLeftColor: '#8B5CF6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    earningsTicker: { color: c.textPrimary, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
    earningsName: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginTop: 1 },
    earningsDate: { color: c.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 6 },
    earningsDday: {
      backgroundColor: `${c.accent}15`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    earningsDdayText: { fontSize: 11, fontWeight: '700' },
    earningsTime: {
      backgroundColor: `${c.textMuted}15`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    earningsTimeText: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
  });

export default React.memo(EarningsSection);

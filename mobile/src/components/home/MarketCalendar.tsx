import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CalendarEvent } from '../../types/analysis';
import { spacing, radius, type ThemeColors } from '../../theme';

export const CALENDAR_TYPE_COLORS: Record<string, string> = {
  FOMC: '#EF4444',
  CPI: '#F59E0B',
  PPI: '#F97316',
  PMI: '#8B5CF6',
  NFP: '#3B82F6',
  EARNINGS: '#10B981',
};

interface CalendarGrid {
  year: number;
  month: number;
  monthName: string;
  todayDate: number;
  weeks: (number | null)[][];
  eventsByDay: Record<number, CalendarEvent[]>;
  daysInMonth: number;
}

interface Props {
  calendarGrid: CalendarGrid | null;
  selectedCalDay: number | null;
  onDaySelect: (day: number | null) => void;
  colors: ThemeColors;
  onTickerPress?: (ticker: string) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

function MarketCalendar({ calendarGrid, selectedCalDay, onDaySelect, colors, onTickerPress, onPrevMonth, onNextMonth }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);

  if (!calendarGrid) return null;

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: '#F59E0B' }]} />
        <Text style={s.sectionLabel}>마켓 캘린더</Text>
        <View style={s.monthNav}>
          {onPrevMonth && (
            <Pressable onPress={onPrevMonth} style={s.monthNavBtn} accessibilityRole="button" accessibilityLabel="Previous month">
              <Text style={s.monthNavArrow}>‹</Text>
            </Pressable>
          )}
          <Text style={s.sectionCount}>
            {calendarGrid.monthName} {calendarGrid.year}
          </Text>
          {onNextMonth && (
            <Pressable onPress={onNextMonth} style={s.monthNavBtn} accessibilityRole="button" accessibilityLabel="Next month">
              <Text style={s.monthNavArrow}>›</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={s.calGrid}>
        {/* Weekday headers */}
        <View style={s.calWeekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <View key={i} style={s.calHeaderCell}>
              <Text style={[s.calHeaderText, (i === 0 || i === 6) && { color: colors.textMuted }]}>
                {d}
              </Text>
            </View>
          ))}
        </View>
        {/* Week rows */}
        {calendarGrid.weeks.map((week, wi) => (
          <View key={wi} style={s.calWeekRow}>
            {week.map((day, di) => {
              const events = day ? calendarGrid.eventsByDay[day] || [] : [];
              const isToday = day !== null && day === calendarGrid.todayDate;
              const isPast = day !== null && day < calendarGrid.todayDate;
              const isSelected = day !== null && day === selectedCalDay;
              const typeColors = CALENDAR_TYPE_COLORS;
              return (
                <Pressable
                  key={di}
                  style={[
                    s.calDayCell,
                    day !== null && isToday && s.calDayCellToday,
                    day !== null &&
                      isSelected && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
                    day !== null && isPast && { opacity: 0.4 },
                  ]}
                  onPress={
                    day !== null && events.length > 0
                      ? () => onDaySelect(isSelected ? null : day)
                      : undefined
                  }
                  disabled={day === null}
                  accessibilityRole="button"
                  accessibilityLabel={day !== null ? `Day ${day}${events.length > 0 ? `, ${events.length} events` : ''}` : undefined}
                >
                  {day !== null ? (
                    <>
                      <Text style={[s.calDayNum, isToday && { color: colors.warning, fontWeight: '800' }]}>
                        {day}
                      </Text>
                      {events.slice(0, 2).map((ev, ei) => (
                        <Text
                          key={ei}
                          style={[s.calEventTag, { color: typeColors[ev.type] || colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {ev.type === 'EARNINGS' ? ev.ticker || 'EARN' : ev.type}
                        </Text>
                      ))}
                      {events.length > 2 && <Text style={s.calMoreTag}>+{events.length - 2}</Text>}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {/* Selected day detail */}
      {selectedCalDay && calendarGrid.eventsByDay[selectedCalDay] && (
        <View style={s.calDetail}>
          <Text style={s.calDetailDate}>
            {calendarGrid.monthName} {selectedCalDay}
          </Text>
          {calendarGrid.eventsByDay[selectedCalDay].map((ev, i, arr) => {
            const evColor = CALENDAR_TYPE_COLORS[ev.type] || colors.textMuted;
            return (
              <Pressable
                key={`${ev.type}-${i}`}
                style={({ pressed }) => [
                  s.calDetailRow,
                  i === arr.length - 1 && { borderBottomWidth: 0 },
                  pressed && ev.ticker && { opacity: 0.7 },
                ]}
                onPress={ev.ticker && onTickerPress ? () => onTickerPress(ev.ticker!) : undefined}
                accessibilityRole="button"
                accessibilityLabel={`${ev.type} event, ${ev.label}${ev.ticker ? `, ${ev.ticker}` : ''}`}
              >
                <View style={s.calDetailLeft}>
                  <View style={[s.calDetailBadge, { backgroundColor: `${evColor}20` }]}>
                    <Text style={[s.calDetailType, { color: evColor }]}>{ev.type}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.calDetailLabel} numberOfLines={1}>
                      {ev.label}
                    </Text>
                    {ev.desc ? (
                      <Text style={s.calDetailDesc} numberOfLines={2}>
                        {ev.desc}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {(ev.avg_move || ev.bullish_pct) && (
                  <View style={s.calDetailStats}>
                    {ev.avg_move ? (
                      <Text style={s.calDetailMove}>{'\u00B1'}{ev.avg_move.toFixed(1)}%</Text>
                    ) : null}
                    {ev.bullish_pct ? (
                      <Text
                        style={[
                          s.calDetailBull,
                          { color: ev.bullish_pct >= 50 ? colors.bullish : colors.bearish },
                        ]}
                      >
                        {ev.bullish_pct}% 강세
                      </Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
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
    monthNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    monthNavBtn: { paddingHorizontal: 8, paddingVertical: 2 },
    monthNavArrow: { color: c.accent, fontSize: 18, fontWeight: '700' },
    calGrid: {
      backgroundColor: c.bgElevated,
      borderRadius: radius.md,
      padding: spacing.sm,
      overflow: 'hidden' as const,
    },
    calWeekRow: { flexDirection: 'row' },
    calHeaderCell: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 4,
    },
    calHeaderText: { color: c.textTertiary, fontSize: 11, fontWeight: '700' },
    calDayCell: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      minHeight: 62,
      paddingVertical: 3,
      paddingHorizontal: 1,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    calDayCellToday: {
      backgroundColor: `${c.warning}12`,
      borderColor: `${c.warning}40`,
    },
    calDayNum: { color: c.textPrimary, fontSize: 14, fontWeight: '600' },
    calEventTag: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.2,
      marginTop: 1,
      textAlign: 'center' as const,
    },
    calMoreTag: { color: c.textMuted, fontSize: 9, fontWeight: '600', marginTop: 1 },
    calDetail: {
      marginTop: spacing.sm,
      backgroundColor: c.bgCard,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    calDetailDate: { color: c.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 8 },
    calDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    calDetailLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
    calDetailBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 1 },
    calDetailType: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
    calDetailLabel: { color: c.textPrimary, fontSize: 13, fontWeight: '600' },
    calDetailDesc: { color: c.textMuted, fontSize: 10, fontWeight: '400', marginTop: 2 },
    calDetailStats: { alignItems: 'flex-end' as const, marginLeft: 8 },
    calDetailMove: { color: c.textSecondary, fontSize: 13, fontWeight: '800' },
    calDetailBull: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  });

export default React.memo(MarketCalendar);

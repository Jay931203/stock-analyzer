import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/api/client';
import type { TimeMachineRange, TimeMachineResponse } from '../../src/types/analysis';
import { useTheme } from '../../src/contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../../src/theme';
import { ChevronLeftIcon } from '../../src/components/ThemeIcons';
import { PERIOD_LABELS } from '../../src/constants/ui';

const FORWARD_LABELS: Record<string, string> = {
  '5': '1W', '10': '2W', '20': '1M', '60': '3M', '120': '6M',
};

export default function TimeMachinePage() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [range, setRange] = useState<TimeMachineRange | null>(null);
  const [result, setResult] = useState<TimeMachineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // Preset dates for quick selection
  const presetDates = [
    { label: '2020.03 COVID', date: '2020-03-23' },
    { label: '2022.01 금리쇼크', date: '2022-01-24' },
    { label: '2022.10 바닥', date: '2022-10-13' },
    { label: '2023.10 조정', date: '2023-10-27' },
    { label: '2024.08 엔캐리', date: '2024-08-05' },
    { label: '3개월 전', date: getDateMonthsAgo(3) },
    { label: '6개월 전', date: getDateMonthsAgo(6) },
    { label: '1년 전', date: getDateMonthsAgo(12) },
  ];

  useEffect(() => {
    if (!ticker) return;
    api.timeMachineRange(ticker).then(r => {
      setRange(r);
      // Default to 1 year ago
      setSelectedDate(getDateMonthsAgo(12));
    }).catch(() => {});
  }, [ticker]);

  const analyze = async (date: string) => {
    if (!ticker || !date) return;
    setSelectedDate(date);
    setLoading(true);
    setError(null);
    try {
      const res = await api.timeMachine(ticker, date, '3y');
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <ChevronLeftIcon size={14} color={colors.accent} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.pageTitle}>Signal Time Machine</Text>
          <Text style={s.pageSubtitle}>
            {ticker?.toUpperCase()} — 과거에 이 도구가 있었다면?
          </Text>
        </View>

        {/* Date presets */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>날짜 선택</Text>
          <View style={s.presetGrid}>
            {presetDates.map(p => (
              <Pressable
                key={p.date}
                style={[s.presetBtn, selectedDate === p.date && s.presetBtnActive]}
                onPress={() => analyze(p.date)}
              >
                <Text style={[s.presetLabel, selectedDate === p.date && s.presetLabelActive]}>{p.label}</Text>
                <Text style={[s.presetDate, selectedDate === p.date && s.presetDateActive]}>{p.date}</Text>
              </Pressable>
            ))}
          </View>

          {/* Custom date input */}
          {Platform.OS === 'web' && (
            <View style={s.customDateRow}>
              <input
                type="date"
                value={selectedDate}
                min={range?.first_date}
                max={range?.last_date}
                onChange={(e: any) => setSelectedDate(e.target.value)}
                style={{
                  backgroundColor: colors.bgElevated,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 14,
                  flex: 1,
                }}
              />
              <Pressable style={s.goBtn} onPress={() => analyze(selectedDate)}>
                <Text style={s.goBtnText}>분석</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.loadingText}>{selectedDate} 시점 분석 중...</Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Signal Card */}
            <View style={s.section}>
              <View style={[s.signalCard, {
                borderColor: result.signal.direction === 'bullish' ? `${colors.bullish}50` :
                  result.signal.direction === 'bearish' ? `${colors.bearish}50` : colors.border,
              }]}>
                <View style={s.signalHeader}>
                  <Text style={s.signalDate}>{result.date} 시점</Text>
                  <View style={[s.dirBadge, {
                    backgroundColor: result.signal.direction === 'bullish' ? `${colors.bullish}20` :
                      result.signal.direction === 'bearish' ? `${colors.bearish}20` : `${colors.textMuted}20`,
                  }]}>
                    <Text style={[s.dirText, {
                      color: result.signal.direction === 'bullish' ? colors.bullish :
                        result.signal.direction === 'bearish' ? colors.bearish : colors.textMuted,
                    }]}>
                      {result.signal.direction === 'bullish' ? '강세' : result.signal.direction === 'bearish' ? '약세' : '중립'} 신호
                    </Text>
                  </View>
                </View>

                <Text style={s.signalPrice}>${result.price_at_date.toFixed(2)}</Text>
                <Text style={s.signalWinRate}>
                  예측 승률: {result.signal.win_rate_20d.toFixed(0)}% (1개월 기준)
                </Text>
                <Text style={s.signalOcc}>
                  과거 유사 상황 {result.signal.occurrences}번 발견
                </Text>
              </View>
            </View>

            {/* Actual Results */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>실제 결과</Text>
              <View style={s.resultsGrid}>
                {Object.entries(result.actual).map(([days, data]) => (
                  <View key={days} style={[s.resultCard, {
                    borderColor: data.went_up ? `${colors.bullish}30` : `${colors.bearish}30`,
                  }]}>
                    <Text style={s.resultPeriod}>{FORWARD_LABELS[days] || `${days}D`}</Text>
                    <Text style={[s.resultReturn, {
                      color: data.went_up ? colors.bullish : colors.bearish,
                    }]}>
                      {data.return_pct >= 0 ? '+' : ''}{data.return_pct.toFixed(1)}%
                    </Text>
                    <Text style={s.resultPrice}>${data.end_price.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Accuracy */}
            <View style={s.section}>
              <View style={[s.accuracyCard, {
                backgroundColor: result.accuracy.was_correct ? `${colors.bullish}10` : `${colors.bearish}10`,
                borderColor: result.accuracy.was_correct ? `${colors.bullish}30` : `${colors.bearish}30`,
              }]}>
                <Text style={[s.accuracyTitle, {
                  color: result.accuracy.was_correct ? colors.bullish : colors.bearish,
                }]}>
                  {result.accuracy.was_correct ? '적중!' : '미적중'}
                </Text>
                <Text style={s.accuracyDetail}>
                  예측: {result.accuracy.predicted_direction === 'bullish' ? '상승' : '하락'}  →  실제: {result.accuracy.actual_direction === 'up' ? '상승' : '하락'}
                </Text>
              </View>
            </View>

            {/* Highlights */}
            {result.highlights.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>그 시점의 주요 신호</Text>
                <View style={s.highlightsList}>
                  {result.highlights.map((h, i) => (
                    <View key={i} style={[s.highlightRow, {
                      backgroundColor: h.type === 'bullish' ? `${colors.bullish}08` :
                        h.type === 'bearish' ? `${colors.bearish}08` : `${colors.textMuted}08`,
                    }]}>
                      <View style={[s.highlightDot, {
                        backgroundColor: h.type === 'bullish' ? colors.bullish :
                          h.type === 'bearish' ? colors.bearish : colors.textMuted,
                      }]} />
                      <Text style={s.highlightText}>{h.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Current price comparison */}
            <View style={s.section}>
              <View style={s.compareCard}>
                <Text style={s.compareTitle}>현재와 비교</Text>
                <View style={s.compareRow}>
                  <View style={s.compareCol}>
                    <Text style={s.compareLabel}>{result.date}</Text>
                    <Text style={s.comparePrice}>${result.price_at_date.toFixed(2)}</Text>
                  </View>
                  <Text style={s.compareArrow}>→</Text>
                  <View style={s.compareCol}>
                    <Text style={s.compareLabel}>현재</Text>
                    <Text style={s.comparePrice}>${result.current_price.toFixed(2)}</Text>
                  </View>
                  <View style={s.compareCol}>
                    <Text style={s.compareLabel}>수익률</Text>
                    <Text style={[s.compareReturn, {
                      color: result.current_price >= result.price_at_date ? colors.bullish : colors.bearish,
                    }]}>
                      {((result.current_price - result.price_at_date) / result.price_at_date * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Disclaimer */}
            <View style={s.disclaimerBox}>
              <Text style={s.disclaimerText}>
                본 분석은 과거 데이터 기반 통계이며 투자 조언이 아닙니다.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  // Skip weekends
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2);
  if (day === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },

  header: {
    backgroundColor: c.bgCard,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  backText: { color: c.accent, fontSize: 14, fontWeight: '600' },
  pageTitle: { color: c.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  pageSubtitle: { color: c.textSecondary, fontSize: 13 },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { color: c.textTertiary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
    minWidth: '30%' as any, flexGrow: 1,
  },
  presetBtnActive: { borderColor: c.accent, backgroundColor: `${c.accent}15` },
  presetLabel: { color: c.textPrimary, fontSize: 12, fontWeight: '700' },
  presetLabelActive: { color: c.accent },
  presetDate: { color: c.textMuted, fontSize: 10, marginTop: 2 },
  presetDateActive: { color: c.accent },

  customDateRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md, alignItems: 'center' },
  goBtn: {
    backgroundColor: c.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md,
  },
  goBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  loadingBox: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: c.textMuted, fontSize: 13, marginTop: spacing.sm },

  errorBox: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, backgroundColor: `${c.bearish}10`, borderRadius: radius.md },
  errorText: { color: c.bearish, fontSize: 13 },

  signalCard: {
    backgroundColor: c.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1,
  },
  signalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  signalDate: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  dirBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  dirText: { fontSize: 12, fontWeight: '800' },
  signalPrice: { color: c.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  signalWinRate: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  signalOcc: { color: c.textMuted, fontSize: 12, marginTop: 2 },

  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultCard: {
    flex: 1, minWidth: '28%' as any, backgroundColor: c.bgCard,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1,
    alignItems: 'center',
  },
  resultPeriod: { color: c.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  resultReturn: { fontSize: 18, fontWeight: '800' },
  resultPrice: { color: c.textMuted, fontSize: 10, marginTop: 2 },

  accuracyCard: {
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1,
    alignItems: 'center',
  },
  accuracyTitle: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  accuracyDetail: { color: c.textSecondary, fontSize: 13 },

  highlightsList: { gap: 6 },
  highlightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
  },
  highlightDot: { width: 6, height: 6, borderRadius: 3 },
  highlightText: { color: c.textPrimary, fontSize: 13, flex: 1 },

  compareCard: {
    backgroundColor: c.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
  },
  compareTitle: { color: c.textTertiary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.md },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareCol: { alignItems: 'center' },
  compareLabel: { color: c.textMuted, fontSize: 10, marginBottom: 4 },
  comparePrice: { color: c.textPrimary, fontSize: 16, fontWeight: '700' },
  compareArrow: { color: c.textMuted, fontSize: 18 },
  compareReturn: { fontSize: 18, fontWeight: '800' },

  disclaimerBox: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, marginTop: spacing.lg },
  disclaimerText: { color: c.textMuted, fontSize: 10, textAlign: 'center' as const, lineHeight: 16 },
});

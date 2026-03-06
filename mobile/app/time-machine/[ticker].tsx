import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/api/client';
import type { TimeMachineRange, TimeMachineResponse } from '../../src/types/analysis';
import { useTheme } from '../../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../../src/theme';
import { ChevronLeftIcon, ShareIcon } from '../../src/components/ThemeIcons';
import { doShare } from '../../src/utils/share';

/* ── Constants ── */

const FORWARD_LABELS: Record<string, string> = {
  '5': '1W', '10': '2W', '20': '1M', '60': '3M', '120': '6M',
};

const WIN_RATE_PERIOD_LABELS: Record<string, string> = {
  '5': '1W', '20': '1M', '60': '3M', '120': '6M',
};

const BACKTEST_PERIODS = [
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
  { value: '10y', label: '10Y' },
] as const;

const PRESET_DATES = [
  { label: 'COVID Crash', sub: '2020-03-23', date: '2020-03-23' },
  { label: 'Rate Shock', sub: '2022-01-24', date: '2022-01-24' },
  { label: '2022 Bottom', sub: '2022-10-13', date: '2022-10-13' },
  { label: 'Oct Pullback', sub: '2023-10-27', date: '2023-10-27' },
  { label: 'Yen Carry Unwind', sub: '2024-08-05', date: '2024-08-05' },
  { label: '3 Months Ago', sub: '', date: getDateMonthsAgo(3) },
  { label: '6 Months Ago', sub: '', date: getDateMonthsAgo(6) },
  { label: '1 Year Ago', sub: '', date: getDateMonthsAgo(12) },
];

/* ── Helpers ── */

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2);
  if (day === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function directionLabel(dir: string): string {
  return dir === 'bullish' ? 'Bullish' : dir === 'bearish' ? 'Bearish' : 'Neutral';
}

function actualDirLabel(dir: string): string {
  return dir === 'up' ? 'Up' : 'Down';
}

/* ── Component ── */

export default function TimeMachinePage() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [range, setRange] = useState<TimeMachineRange | null>(null);
  const [result, setResult] = useState<TimeMachineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [backtestPeriod, setBacktestPeriod] = useState('3y');
  const [copiedMsg, setCopiedMsg] = useState('');

  useEffect(() => {
    if (!ticker) return;
    api.timeMachineRange(ticker).then(r => {
      setRange(r);
      setSelectedDate(getDateMonthsAgo(12));
    }).catch(() => {});
  }, [ticker]);

  const analyze = useCallback(async (date: string) => {
    if (!ticker || !date) return;
    setSelectedDate(date);
    setLoading(true);
    setError(null);
    try {
      const res = await api.timeMachine(ticker, date, backtestPeriod);
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [ticker, backtestPeriod]);

  const handleShare = useCallback(() => {
    if (!result) return;
    const dir = directionLabel(result.signal.direction);
    const wr = result.signal.win_rate_20d != null ? `${result.signal.win_rate_20d.toFixed(0)}%` : 'N/A';
    const actual1m = result.actual['20'];
    const returnStr = actual1m ? `${actual1m.return_pct >= 0 ? '+' : ''}${actual1m.return_pct.toFixed(1)}%` : 'N/A';
    const verdict = result.accuracy ? (result.accuracy.was_correct ? 'Correct' : 'Incorrect') : 'N/A';
    const text = `Signal Time Machine: ${ticker?.toUpperCase()} on ${result.date}\nSignal: ${dir} (${wr} win rate)\nActual 1M: ${returnStr}\nVerdict: ${verdict}`;
    doShare(text, (msg) => {
      setCopiedMsg(msg);
      setTimeout(() => setCopiedMsg(''), 2000);
    });
  }, [result, ticker]);

  const sig = result?.signal;
  const acc = result?.accuracy;

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View style={s.headerRow}>
            <Pressable
              style={s.backBtn}
              hitSlop={12}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
            >
              <ChevronLeftIcon size={18} color={colors.accent} />
            </Pressable>
            <View style={s.headerCenter}>
              <Text style={s.pageTitle}>Time Machine</Text>
              <Text style={s.tickerBadge}>{ticker?.toUpperCase()}</Text>
            </View>
            {result ? (
              <Pressable style={s.shareBtn} hitSlop={12} onPress={handleShare}>
                <ShareIcon size={16} color={colors.accent} />
              </Pressable>
            ) : <View style={{ width: 36 }} />}
          </View>
          {copiedMsg ? (
            <Text style={s.copiedToast}>{copiedMsg}</Text>
          ) : null}
        </View>

        {/* ── Date Presets ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SELECT A DATE</Text>
          <View style={s.presetGrid}>
            {PRESET_DATES.map(p => {
              const active = selectedDate === p.date;
              return (
                <Pressable
                  key={p.date}
                  style={[s.presetBtn, active && s.presetBtnActive]}
                  onPress={() => analyze(p.date)}
                >
                  <Text style={[s.presetLabel, active && s.presetLabelActive]}>{p.label}</Text>
                  <Text style={[s.presetSub, active && s.presetSubActive]}>
                    {p.sub || p.date}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom date + period selector */}
          {Platform.OS === 'web' && (
            <View style={s.controlsRow}>
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
                  borderRadius: radius.md,
                  padding: '8px 12px',
                  fontSize: 13,
                  flex: 1,
                  outline: 'none',
                } as any}
              />
              <View style={s.periodRow}>
                {BACKTEST_PERIODS.map(bp => (
                  <Pressable
                    key={bp.value}
                    style={[s.periodPill, backtestPeriod === bp.value && s.periodPillActive]}
                    onPress={() => setBacktestPeriod(bp.value)}
                  >
                    <Text style={[s.periodPillText, backtestPeriod === bp.value && s.periodPillTextActive]}>
                      {bp.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={s.analyzeBtn} onPress={() => analyze(selectedDate)}>
                <Text style={s.analyzeBtnText}>Analyze</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Empty State ── */}
        {!result && !loading && !error && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>&#8986;</Text>
            <Text style={s.emptyTitle}>Travel Back in Time</Text>
            <Text style={s.emptyDesc}>
              Select a historical date to see what signal this tool would have generated -- and whether it was right.
            </Text>
          </View>
        )}

        {/* ── Loading ── */}
        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.loadingText}>Analyzing {selectedDate}...</Text>
          </View>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <>
            {/* 1. Verdict Card */}
            {acc && (
              <View style={s.section}>
                <View style={[
                  s.verdictCard,
                  { backgroundColor: acc.was_correct ? `${colors.bullish}12` : `${colors.bearish}12` },
                  { borderColor: acc.was_correct ? `${colors.bullish}40` : `${colors.bearish}40` },
                ]}>
                  <Text style={[s.verdictIcon, { color: acc.was_correct ? colors.bullish : colors.bearish }]}>
                    {acc.was_correct ? '\u2713' : '\u2717'}
                  </Text>
                  <Text style={[s.verdictTitle, { color: acc.was_correct ? colors.bullish : colors.bearish }]}>
                    {acc.was_correct ? 'Signal Was Correct' : 'Signal Was Wrong'}
                  </Text>
                  <View style={s.verdictComparison}>
                    <View style={s.verdictSide}>
                      <Text style={s.verdictSideLabel}>Predicted</Text>
                      <Text style={[s.verdictSideValue, {
                        color: acc.predicted_direction === 'bullish' ? colors.bullish : colors.bearish,
                      }]}>{directionLabel(acc.predicted_direction)}</Text>
                    </View>
                    <Text style={s.verdictArrow}>{'\u2192'}</Text>
                    <View style={s.verdictSide}>
                      <Text style={s.verdictSideLabel}>Actual</Text>
                      <Text style={[s.verdictSideValue, {
                        color: acc.actual_direction === 'up' ? colors.bullish : colors.bearish,
                      }]}>{actualDirLabel(acc.actual_direction)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 2. Signal at Date */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>SIGNAL ON {result.date}</Text>
              <View style={s.signalCard}>
                <View style={s.signalTopRow}>
                  <View>
                    <Text style={s.signalPrice}>${result.price_at_date.toFixed(2)}</Text>
                    <Text style={s.signalOcc}>
                      {result.signal.occurrences} similar patterns found
                    </Text>
                  </View>
                  <View style={[s.dirBadge, {
                    backgroundColor: sig?.direction === 'bullish' ? `${colors.bullish}20`
                      : sig?.direction === 'bearish' ? `${colors.bearish}20` : `${colors.neutral}20`,
                  }]}>
                    <Text style={[s.dirBadgeText, {
                      color: sig?.direction === 'bullish' ? colors.bullish
                        : sig?.direction === 'bearish' ? colors.bearish : colors.neutral,
                    }]}>{directionLabel(sig?.direction ?? 'neutral')}</Text>
                  </View>
                </View>

                {/* Win Rate Pills */}
                {sig?.win_rates && Object.keys(sig.win_rates).length > 0 && (
                  <View style={s.winRatePills}>
                    {Object.entries(WIN_RATE_PERIOD_LABELS).map(([period, label]) => {
                      const wr = sig.win_rates?.[period];
                      if (wr == null) return null;
                      const isBullish = wr >= 55;
                      const isBearish = wr <= 45;
                      const pillColor = isBullish ? colors.bullish : isBearish ? colors.bearish : colors.neutral;
                      return (
                        <View key={period} style={[s.winRatePill, { borderColor: `${pillColor}40` }]}>
                          <Text style={s.winRatePillLabel}>{label}</Text>
                          <Text style={[s.winRatePillValue, { color: pillColor }]}>
                            {wr.toFixed(0)}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Fallback: show only 20d win rate if no multi-period data */}
                {(!sig?.win_rates || Object.keys(sig.win_rates).length === 0) && sig?.win_rate_20d != null && (
                  <Text style={s.signalWinRateFallback}>
                    1M Win Rate: {sig.win_rate_20d.toFixed(0)}%
                  </Text>
                )}
              </View>
            </View>

            {/* 3. Actual Returns Grid */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>WHAT ACTUALLY HAPPENED</Text>
              <View style={s.returnsGrid}>
                {Object.entries(result.actual).map(([days, data]) => {
                  const matched = sig?.direction === 'bullish' ? data.went_up
                    : sig?.direction === 'bearish' ? !data.went_up : null;
                  return (
                    <View key={days} style={[s.returnCard, {
                      borderColor: data.went_up ? `${colors.bullish}30` : `${colors.bearish}30`,
                    }]}>
                      {matched != null && (
                        <View style={[s.matchDot, {
                          backgroundColor: matched ? colors.bullish : colors.bearish,
                        }]}>
                          <Text style={s.matchDotText}>{matched ? '\u2713' : '\u2717'}</Text>
                        </View>
                      )}
                      <Text style={s.returnPeriod}>{FORWARD_LABELS[days] || `${days}D`}</Text>
                      <Text style={[s.returnPct, {
                        color: data.went_up ? colors.bullish : colors.bearish,
                      }]}>
                        {data.return_pct >= 0 ? '+' : ''}{data.return_pct.toFixed(1)}%
                      </Text>
                      <Text style={s.returnEndPrice}>${data.end_price.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 4. Per-Period Accuracy */}
            {sig?.win_rates && Object.keys(sig.win_rates).length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>PREDICTION vs REALITY</Text>
                <View style={s.predictionCard}>
                  {Object.entries(WIN_RATE_PERIOD_LABELS).map(([period, label]) => {
                    const wr = sig.win_rates?.[period];
                    if (wr == null) return null;
                    const actualData = result.actual[period];
                    if (!actualData) return null;
                    const predicted = wr >= 55 ? 'Bullish' : wr <= 45 ? 'Bearish' : 'Neutral';
                    const matched = predicted === 'Bullish' ? actualData.went_up
                      : predicted === 'Bearish' ? !actualData.went_up : null;
                    return (
                      <View key={period} style={s.predRow}>
                        <Text style={s.predPeriod}>{label}</Text>
                        <View style={s.predDetail}>
                          <Text style={[s.predSignal, {
                            color: wr >= 55 ? colors.bullish : wr <= 45 ? colors.bearish : colors.neutral,
                          }]}>
                            {predicted === 'Bullish' ? '\u25B2' : predicted === 'Bearish' ? '\u25BC' : '\u25CF'}{' '}
                            {wr.toFixed(0)}% win rate
                          </Text>
                          <Text style={s.predArrow}>{'\u2192'}</Text>
                          <Text style={[s.predActual, {
                            color: actualData.went_up ? colors.bullish : colors.bearish,
                          }]}>
                            {actualData.return_pct >= 0 ? '+' : ''}{actualData.return_pct.toFixed(1)}%
                          </Text>
                          {matched != null && (
                            <Text style={[s.predResult, {
                              color: matched ? colors.bullish : colors.bearish,
                            }]}>{matched ? '\u2713' : '\u2717'}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 5. Key Indicators */}
            {result.highlights.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>KEY INDICATORS</Text>
                <View style={s.indicatorsGrid}>
                  {result.highlights.map((h, i) => {
                    const isBullish = h.type === 'bullish';
                    const isBearish = h.type === 'bearish';
                    const chipColor = isBullish ? colors.bullish : isBearish ? colors.bearish : colors.neutral;
                    return (
                      <View key={i} style={[s.indicatorChip, {
                        backgroundColor: `${chipColor}10`,
                        borderColor: `${chipColor}25`,
                      }]}>
                        <View style={[s.indicatorDot, { backgroundColor: chipColor }]} />
                        <Text style={[s.indicatorText, { color: colors.textPrimary }]} numberOfLines={2}>
                          {h.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 6. Current Comparison */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>THEN vs NOW</Text>
              <View style={s.compareCard}>
                <View style={s.compareRow}>
                  <View style={s.compareCol}>
                    <Text style={s.compareDateLabel}>{result.date}</Text>
                    <Text style={s.comparePrice}>${result.price_at_date.toFixed(2)}</Text>
                  </View>
                  <View style={s.compareArrowBox}>
                    <Text style={s.compareArrow}>{'\u2192'}</Text>
                    <Text style={[s.compareReturn, {
                      color: getDirectionColor(result.current_price - result.price_at_date, colors),
                    }]}>
                      {((result.current_price - result.price_at_date) / result.price_at_date * 100) >= 0 ? '+' : ''}
                      {((result.current_price - result.price_at_date) / result.price_at_date * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={s.compareCol}>
                    <Text style={s.compareDateLabel}>Today</Text>
                    <Text style={s.comparePrice}>${result.current_price.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Disclaimer */}
            <View style={s.disclaimerBox}>
              <Text style={s.disclaimerText}>
                This analysis is based on historical data and statistical patterns. It is not investment advice.
                Past performance does not guarantee future results.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: c.bgCard,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: c.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle: {
    color: c.textPrimary,
    ...typography.h2,
  },
  tickerBadge: {
    color: c.accent,
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: `${c.accent}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  shareBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: c.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  copiedToast: {
    color: c.bullish, fontSize: 11, fontWeight: '600',
    textAlign: 'center', marginTop: 4,
  },

  /* Section */
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionLabel: {
    color: c.textTertiary, fontSize: 11, fontWeight: '800',
    letterSpacing: 1, marginBottom: spacing.sm,
  },

  /* Presets */
  presetGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  presetBtn: {
    width: '48%' as any, flexGrow: 0, flexShrink: 0,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.md, backgroundColor: c.bgCard,
    borderWidth: 1, borderColor: c.border,
  },
  presetBtnActive: {
    borderColor: c.accent, backgroundColor: `${c.accent}12`,
  },
  presetLabel: {
    color: c.textPrimary, fontSize: 12, fontWeight: '700',
  },
  presetLabelActive: { color: c.accent },
  presetSub: {
    color: c.textMuted, fontSize: 10, marginTop: 1,
  },
  presetSubActive: { color: `${c.accent}90` },

  /* Controls row */
  controlsRow: {
    flexDirection: 'row', gap: 8, marginTop: spacing.md, alignItems: 'center',
    flexWrap: 'wrap',
  },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodPill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: c.bgCard,
    borderWidth: 1, borderColor: c.border,
  },
  periodPillActive: {
    borderColor: c.accent, backgroundColor: `${c.accent}15`,
  },
  periodPillText: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
  periodPillTextActive: { color: c.accent },
  analyzeBtn: {
    backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: radius.md,
  },
  analyzeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Empty state */
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.md, color: c.textMuted },
  emptyTitle: { color: c.textSecondary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { color: c.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  /* Loading */
  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { color: c.textMuted, fontSize: 13, marginTop: spacing.sm },

  /* Error */
  errorBox: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    padding: spacing.md, backgroundColor: `${c.bearish}10`,
    borderRadius: radius.md, borderWidth: 1, borderColor: `${c.bearish}30`,
  },
  errorText: { color: c.bearish, fontSize: 13 },

  /* Verdict */
  verdictCard: {
    borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, alignItems: 'center',
  },
  verdictIcon: { fontSize: 40, fontWeight: '900', marginBottom: 4 },
  verdictTitle: { fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  verdictComparison: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
  },
  verdictSide: { alignItems: 'center' },
  verdictSideLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  verdictSideValue: { fontSize: 15, fontWeight: '800' },
  verdictArrow: { color: c.textMuted, fontSize: 18 },

  /* Signal Card */
  signalCard: {
    backgroundColor: c.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
  },
  signalTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  signalPrice: {
    color: c.textPrimary, ...typography.numberLg,
  },
  signalOcc: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  dirBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full,
  },
  dirBadgeText: { fontSize: 12, fontWeight: '800' },
  winRatePills: {
    flexDirection: 'row', gap: 8, marginTop: spacing.md, flexWrap: 'wrap',
  },
  winRatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1,
    backgroundColor: c.bgElevated,
  },
  winRatePillLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
  winRatePillValue: { fontSize: 13, fontWeight: '800' },
  signalWinRateFallback: {
    color: c.textSecondary, fontSize: 14, fontWeight: '600', marginTop: spacing.sm,
  },

  /* Returns Grid */
  returnsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  returnCard: {
    flex: 1, minWidth: '17%' as any, minHeight: 88,
    backgroundColor: c.bgCard, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative' as const,
  },
  matchDot: {
    position: 'absolute' as const, top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  matchDotText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  returnPeriod: { color: c.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  returnPct: { fontSize: 17, fontWeight: '800' },
  returnEndPrice: { color: c.textMuted, fontSize: 10, marginTop: 2 },

  /* Prediction vs Reality */
  predictionCard: {
    backgroundColor: c.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.border, overflow: 'hidden',
  },
  predRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  predPeriod: {
    color: c.textMuted, fontSize: 12, fontWeight: '700', width: 32,
  },
  predDetail: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  predSignal: { fontSize: 12, fontWeight: '600' },
  predArrow: { color: c.textMuted, fontSize: 12 },
  predActual: { fontSize: 13, fontWeight: '800' },
  predResult: { fontSize: 14, fontWeight: '900', marginLeft: 4 },

  /* Indicators */
  indicatorsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  indicatorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1,
    maxWidth: '100%',
  },
  indicatorDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  indicatorText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },

  /* Compare */
  compareCard: {
    backgroundColor: c.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
  },
  compareRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  compareCol: { alignItems: 'center', flex: 1 },
  compareDateLabel: { color: c.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  comparePrice: { color: c.textPrimary, fontSize: 17, fontWeight: '700' },
  compareArrowBox: { alignItems: 'center', paddingHorizontal: spacing.sm },
  compareArrow: { color: c.textMuted, fontSize: 20 },
  compareReturn: { fontSize: 15, fontWeight: '800', marginTop: 2 },

  /* Disclaimer */
  disclaimerBox: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, marginTop: spacing.md },
  disclaimerText: {
    color: c.textMuted, fontSize: 10, textAlign: 'center' as const, lineHeight: 16,
  },
});

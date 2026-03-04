import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import api from '../../src/api/client';
import type { AnalysisResponse } from '../../src/types/analysis';
import IndicatorCard from '../../src/components/IndicatorCard';
import CombinedTab from '../../src/components/CombinedTab';
import SmartCombinedView from '../../src/components/SmartCombinedView';
import Week52Gauge from '../../src/components/Week52Gauge';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '../../src/store/watchlist';
import { useTheme } from '../../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../../src/theme';

const INDICATOR_META: Record<string, { label: string; short: string }> = {
  RSI: { label: 'RSI', short: 'Momentum' },
  MACD: { label: 'MACD', short: 'Trend' },
  MA: { label: 'MA', short: 'Moving Avg' },
  BB: { label: 'BB', short: 'Bollinger' },
  Vol: { label: 'Volume', short: 'Volume' },
  Stoch: { label: 'Stoch', short: 'Stochastic' },
  Drawdown: { label: 'DD', short: 'Drawdown' },
  ADX: { label: 'ADX', short: 'Trend Str' },
  MADist: { label: 'MA Dist', short: 'MA Gap' },
  Consec: { label: 'Consec', short: 'Streak' },
  W52: { label: '52W', short: '52-Week' },
  ATR: { label: 'ATR', short: 'Volatility' },
};

const ALL_INDICATORS = Object.keys(INDICATOR_META);

function getIndicatorPreview(key: string, data: AnalysisResponse): { value: string; winRate: number | null } {
  const ind = data.indicators;
  switch (key) {
    case 'RSI':
      return { value: ind.rsi.value?.toFixed(1) ?? '-', winRate: ind.rsi.probability?.periods?.['20']?.win_rate ?? null };
    case 'MACD':
      return { value: ind.macd.event ?? 'Neutral', winRate: ind.macd.probability?.periods?.['20']?.win_rate ?? null };
    case 'MA':
      return { value: ind.ma.alignment ?? '-', winRate: ind.ma.probability?.periods?.['20']?.win_rate ?? null };
    case 'BB':
      return { value: ind.bb.zone ?? '-', winRate: ind.bb.probability?.periods?.['20']?.win_rate ?? null };
    case 'Vol':
      return { value: (ind.volume.ratio?.toFixed(1) ?? '-') + 'x', winRate: ind.volume.probability?.periods?.['20']?.win_rate ?? null };
    case 'Stoch':
      return { value: ind.stochastic.k?.toFixed(0) ?? '-', winRate: ind.stochastic.probability?.periods?.['20']?.win_rate ?? null };
    case 'Drawdown':
      return { value: (ind.drawdown.from_60d_high?.toFixed(1) ?? '-') + '%', winRate: ind.drawdown.probability?.periods?.['20']?.win_rate ?? null };
    case 'ADX':
      return { value: ind.adx.adx?.toFixed(0) ?? '-', winRate: ind.adx.probability?.periods?.['20']?.win_rate ?? null };
    case 'MADist':
      return { value: (ind.ma_distance.from_sma20?.toFixed(1) ?? '-') + '%', winRate: ind.ma_distance.probability?.periods?.['20']?.win_rate ?? null };
    case 'Consec':
      return { value: (ind.consecutive.days > 0 ? '+' : '') + ind.consecutive.days + 'd', winRate: ind.consecutive.probability?.periods?.['20']?.win_rate ?? null };
    case 'W52':
      return { value: (ind.week52.position_pct?.toFixed(0) ?? '-') + '%', winRate: ind.week52.probability?.periods?.['20']?.win_rate ?? null };
    case 'ATR':
      return { value: (ind.atr.atr_pct?.toFixed(1) ?? '-') + '%', winRate: null };
    default:
      return { value: '-', winRate: null };
  }
}

export default function AnalyzeScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(isInWatchlist(ticker ?? ''));
  const [period, setPeriod] = useState<string>('2y');

  useEffect(() => {
    navigation.setOptions({ title: ticker?.toUpperCase() ?? 'Analysis' });
    loadData();
    const interval = setInterval(() => refreshData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [ticker, period]);

  const loadData = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try { setData(await api.analyze(ticker, period)); } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Analysis failed');
    }
    setLoading(false);
  };

  const refreshData = async () => {
    if (!ticker) return;
    try { setData(await api.analyze(ticker, period)); } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [ticker, period]);

  const toggleExpand = (key: string) => {
    setExpandedIndicator(prev => prev === key ? null : key);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.loadingText}>Analyzing {ticker?.toUpperCase()}</Text>
        <Text style={s.loadingSub}>Computing indicators...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error ?? 'Unknown error'}</Text>
        <Pressable style={s.retryBtn} onPress={loadData}>
          <Text style={s.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const { ticker_info, price, indicators } = data;

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.bgCard}
          />
        }
      >
        {/* HEADER + COMBINED ANALYSIS (same background) */}
        <View style={s.headerBlock}>
          {/* Price info */}
          <View style={s.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.tickerLabel}>{ticker_info.ticker}</Text>
              <Text style={s.tickerName} numberOfLines={1}>{ticker_info.name}</Text>
            </View>
            <Pressable
              style={[s.saveBtn, inWatchlist && s.saveBtnActive]}
              onPress={() => { if (inWatchlist) removeFromWatchlist(ticker!); else addToWatchlist(ticker!); setInWatchlist(!inWatchlist); }}
            >
              <Text style={[s.saveBtnText, inWatchlist && s.saveBtnTextActive]}>
                {inWatchlist ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceValue}>${price.current.toFixed(2)}</Text>
            <View style={[s.changeBadge, { backgroundColor: price.change >= 0 ? colors.bullishBg : colors.bearishBg }]}>
              <Text style={[s.changeValue, { color: getDirectionColor(price.change, colors) }]}>
                {price.change >= 0 ? '+' : ''}{price.change.toFixed(2)} ({price.change_pct >= 0 ? '+' : ''}{price.change_pct.toFixed(2)}%)
              </Text>
            </View>
          </View>

          <View style={s.metricsRow}>
            {indicators.volume.ratio !== null && (
              <Text style={s.metricText}>Vol {indicators.volume.ratio.toFixed(1)}x</Text>
            )}
            {indicators.atr.atr_pct !== null && (
              <Text style={s.metricText}>ATR {indicators.atr.atr_pct.toFixed(1)}%</Text>
            )}
            {ticker_info.sector ? <Text style={s.metricText}>{ticker_info.sector}</Text> : null}
          </View>

          {price.high_52w && price.low_52w && (
            <Week52Gauge current={price.current} low={price.low_52w} high={price.high_52w} />
          )}

          <View style={s.periodRow}>
            <Text style={s.periodLabel}>Backtest</Text>
            {['3m', '6m', '1y', '2y', '5y', '10y'].map((p) => (
              <Pressable key={p} style={[s.periodPill, period === p && s.periodPillActive]} onPress={() => setPeriod(p)}>
                <Text style={[s.periodPillText, period === p && s.periodPillTextActive]}>{p.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          {/* COMBINED ANALYSIS - always visible, same background */}
          <View style={s.combinedSection}>
            <Text style={s.sectionTitle}>COMBINED ANALYSIS</Text>
            <SmartCombinedView ticker={ticker!} selectedIndicators={ALL_INDICATORS} />
            <View style={{ marginTop: spacing.md }}>
              <CombinedTab data={data} />
            </View>
          </View>
        </View>

        {/* INDICATORS - separate section with different background */}
        <View style={s.indicatorsSection}>
          <Text style={s.sectionTitle}>INDICATORS</Text>
          <Text style={s.hintText}>Tap any indicator for detailed analysis</Text>

          <View style={s.cardGrid}>
            {ALL_INDICATORS.map(key => {
              const { value, winRate } = getIndicatorPreview(key, data);
              const meta = INDICATOR_META[key];
              const isExpanded = expandedIndicator === key;

              return (
                <View key={key} style={{ width: '32%', marginBottom: 6 }}>
                  <Pressable
                    style={[s.indicatorCard, isExpanded && s.indicatorCardExpanded]}
                    onPress={() => toggleExpand(key)}
                  >
                    <Text style={[s.cardLabel, isExpanded && s.cardLabelExpanded]}>{meta.label}</Text>
                    <Text style={s.cardValue}>{value}</Text>
                    {winRate !== null && (
                      <Text style={[s.cardWinRate, { color: winRate >= 50 ? colors.bullish : colors.bearish }]}>
                        {winRate.toFixed(0)}% win
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* EXPANDED INDICATOR DETAIL */}
        {expandedIndicator && (
          <View style={s.detailSection}>
            <View style={s.expandedHeader}>
              <Text style={s.sectionTitle}>{INDICATOR_META[expandedIndicator]?.label} DETAIL</Text>
              <Pressable onPress={() => setExpandedIndicator(null)}>
                <Text style={s.closeBtn}>Close</Text>
              </Pressable>
            </View>
            <IndicatorCard type={expandedIndicator} data={data} />
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>{data.data_range}</Text>
          <Text style={s.footerText}>Updated: {data.analysis_date}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.bg, padding: spacing.xl,
  },
  loadingText: { color: c.textPrimary, ...typography.h3, marginTop: spacing.lg },
  loadingSub: { color: c.textTertiary, ...typography.bodySm, marginTop: spacing.xs },
  errorText: { color: c.bearish, ...typography.bodySm, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: c.bgCard, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderLight,
  },
  retryBtnText: { color: c.accent, ...typography.bodyBold },

  // Header + Combined = one block with bgCard
  headerBlock: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  tickerLabel: { color: c.accent, ...typography.label, letterSpacing: 1 },
  tickerName: { color: c.textTertiary, ...typography.labelSm, marginTop: 1, maxWidth: 250 },
  saveBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.sm,
    borderWidth: 1, borderColor: c.borderLight, backgroundColor: c.bgElevated,
  },
  saveBtnActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  saveBtnText: { color: c.textTertiary, ...typography.labelSm },
  saveBtnTextActive: { color: c.accent },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  priceValue: { color: c.textPrimary, ...typography.numberLg },
  changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  changeValue: { ...typography.numberSm },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  metricText: {
    color: c.textMuted, fontSize: 11, backgroundColor: c.bgElevated,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },

  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, marginBottom: spacing.md },
  periodLabel: { color: c.textMuted, fontSize: 10, marginRight: 2 },
  periodPill: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: 'transparent',
  },
  periodPillActive: { borderColor: c.accent, backgroundColor: c.accentDim },
  periodPillText: { color: c.textMuted, fontSize: 10, fontWeight: '600' },
  periodPillTextActive: { color: c.accent },

  // Combined section inside headerBlock
  combinedSection: {
    marginTop: spacing.sm, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: c.border,
  },

  sectionTitle: { color: c.textTertiary, ...typography.label, marginBottom: spacing.sm },
  hintText: { color: c.textMuted, fontSize: 11, marginBottom: spacing.sm },

  // Indicators - separate section on bg (not bgCard)
  indicatorsSection: {
    padding: spacing.lg, paddingTop: spacing.lg,
  },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  indicatorCard: {
    backgroundColor: c.bgCard, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: c.border, alignItems: 'center',
    minHeight: 72, justifyContent: 'center',
  },
  indicatorCardExpanded: { borderColor: c.accent, backgroundColor: c.accentDim },
  cardLabel: { color: c.textTertiary, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  cardLabelExpanded: { color: c.accent },
  cardValue: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
  cardWinRate: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Detail section
  detailSection: { padding: spacing.lg, paddingTop: spacing.sm },
  expandedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  closeBtn: { color: c.accent, fontSize: 12, fontWeight: '600' },

  footer: { alignItems: 'center', paddingVertical: 20, paddingBottom: 40, gap: 2 },
  footerText: { color: c.textMuted, fontSize: 10 },
});

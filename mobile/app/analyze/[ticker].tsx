import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';
import type { AnalysisResponse } from '../../src/types/analysis';
import IndicatorCard from '../../src/components/IndicatorCard';
import SmartCombinedView from '../../src/components/SmartCombinedView';
import Week52Gauge from '../../src/components/Week52Gauge';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '../../src/store/watchlist';
import { useTheme } from '../../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../../src/theme';
import { SunIcon, MoonIcon, MonitorIcon, ChevronLeftIcon, StarIcon } from '../../src/components/ThemeIcons';

const { height: SCREEN_H } = Dimensions.get('window');

const INDICATOR_META: Record<string, { label: string }> = {
  RSI: { label: 'RSI' },
  MACD: { label: 'MACD' },
  MA: { label: 'MA' },
  BB: { label: 'BB' },
  Vol: { label: 'Vol' },
  Stoch: { label: 'Stoch' },
  Drawdown: { label: 'DD' },
  ADX: { label: 'ADX' },
  MADist: { label: 'MADist' },
  Consec: { label: 'Streak' },
  W52: { label: '52W' },
  ATR: { label: 'ATR' },
};

const ALL_INDICATORS = Object.keys(INDICATOR_META);

const WINDOW_KEY_MAP: Record<string, string> = { '5d': '5', '20d': '20', '60d': '60', '120d': '120', '252d': '252' };
const WINDOW_LABELS: Record<string, string> = { '5d': '1W', '20d': '1M', '60d': '3M', '120d': '6M', '252d': '1Y' };

function getIndicatorPreview(key: string, data: AnalysisResponse, windowPeriod = '20d'): { value: string; winRate: number | null } {
  const ind = data.indicators;
  const wp = WINDOW_KEY_MAP[windowPeriod] || '20';
  switch (key) {
    case 'RSI':
      return { value: ind.rsi.value?.toFixed(1) ?? '-', winRate: ind.rsi.probability?.periods?.[wp]?.win_rate ?? null };
    case 'MACD':
      return { value: ind.macd.event ?? 'Neutral', winRate: ind.macd.probability?.periods?.[wp]?.win_rate ?? null };
    case 'MA':
      return { value: ind.ma.alignment ?? '-', winRate: ind.ma.probability?.periods?.[wp]?.win_rate ?? null };
    case 'BB':
      return { value: ind.bb.zone ?? '-', winRate: ind.bb.probability?.periods?.[wp]?.win_rate ?? null };
    case 'Vol':
      return { value: (ind.volume.ratio?.toFixed(1) ?? '-') + 'x', winRate: ind.volume.probability?.periods?.[wp]?.win_rate ?? null };
    case 'Stoch':
      return { value: ind.stochastic.k?.toFixed(0) ?? '-', winRate: ind.stochastic.probability?.periods?.[wp]?.win_rate ?? null };
    case 'Drawdown':
      return { value: (ind.drawdown.from_60d_high?.toFixed(1) ?? '-') + '%', winRate: ind.drawdown.probability?.periods?.[wp]?.win_rate ?? null };
    case 'ADX':
      return { value: ind.adx.adx?.toFixed(0) ?? '-', winRate: ind.adx.probability?.periods?.[wp]?.win_rate ?? null };
    case 'MADist':
      return { value: (ind.ma_distance.from_sma20?.toFixed(1) ?? '-') + '%', winRate: ind.ma_distance.probability?.periods?.[wp]?.win_rate ?? null };
    case 'Consec':
      return { value: (ind.consecutive.days > 0 ? '+' : '') + ind.consecutive.days + 'd', winRate: ind.consecutive.probability?.periods?.[wp]?.win_rate ?? null };
    case 'W52':
      return { value: (ind.week52.position_pct?.toFixed(0) ?? '-') + '%', winRate: ind.week52.probability?.periods?.[wp]?.win_rate ?? null };
    case 'ATR':
      return { value: (ind.atr.atr_pct?.toFixed(1) ?? '-') + '%', winRate: null };
    default:
      return { value: '-', winRate: null };
  }
}

type IndicatorHighlight = { text: string; type: 'bullish' | 'bearish' };

function getIndicatorHighlights(data: AnalysisResponse): IndicatorHighlight[] {
  const highlights: IndicatorHighlight[] = [];
  const ind = data.indicators;

  // RSI
  if (ind.rsi.value !== null && ind.rsi.value !== undefined) {
    if (ind.rsi.value > 70) highlights.push({ text: `Overbought (RSI ${ind.rsi.value.toFixed(0)})`, type: 'bearish' });
    else if (ind.rsi.value < 30) highlights.push({ text: `Oversold (RSI ${ind.rsi.value.toFixed(0)})`, type: 'bullish' });
  }

  // MACD
  if (ind.macd.event === 'golden_cross') highlights.push({ text: 'MACD Golden Cross', type: 'bullish' });
  else if (ind.macd.event === 'dead_cross') highlights.push({ text: 'MACD Dead Cross', type: 'bearish' });

  // MA alignment
  if (ind.ma.alignment === 'bullish') highlights.push({ text: 'Uptrend (MA aligned)', type: 'bullish' });
  else if (ind.ma.alignment === 'bearish') highlights.push({ text: 'Downtrend (MA aligned)', type: 'bearish' });

  // Volume spike
  if (ind.volume.ratio !== null && ind.volume.ratio !== undefined && ind.volume.ratio > 2.0) {
    highlights.push({ text: `Volume Spike (${ind.volume.ratio.toFixed(1)}x)`, type: 'bullish' });
  }

  // Drawdown
  if (ind.drawdown.from_60d_high !== null && ind.drawdown.from_60d_high !== undefined && ind.drawdown.from_60d_high < -20) {
    highlights.push({ text: `Deep Pullback (${ind.drawdown.from_60d_high.toFixed(0)}%)`, type: 'bearish' });
  }

  // Consecutive days
  if (ind.consecutive.days >= 5) highlights.push({ text: `${ind.consecutive.days}-day winning streak`, type: 'bullish' });
  else if (ind.consecutive.days <= -5) highlights.push({ text: `${Math.abs(ind.consecutive.days)}-day losing streak`, type: 'bearish' });

  // ADX
  if (ind.adx.adx !== null && ind.adx.adx !== undefined && ind.adx.adx > 40) {
    highlights.push({ text: 'Very Strong Trend', type: 'bullish' });
  }

  // Stochastic
  if (ind.stochastic.k !== null && ind.stochastic.k !== undefined) {
    if (ind.stochastic.k < 20) highlights.push({ text: 'Stoch Oversold', type: 'bullish' });
    else if (ind.stochastic.k > 80) highlights.push({ text: 'Stoch Overbought', type: 'bearish' });
  }

  return highlights.slice(0, 3);
}

export default function AnalyzeScreen() {
  const { colors, themeMode, cycleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedIndicators, setCombinedIndicators] = useState<Set<string>>(
    new Set(['RSI', 'MACD', 'MA', 'BB', 'Vol']),
  );
  const [modalIndicator, setModalIndicator] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(isInWatchlist(ticker ?? ''));
  const [period, setPeriod] = useState<string>('3y');
  const [windowPeriod, setWindowPeriod] = useState<string>('20d');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load global settings
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('data_period'),
      AsyncStorage.getItem('window_period'),
    ]).then(([dp, wp]) => {
      if (dp && ['1y', '3y', '5y', '10y'].includes(dp)) setPeriod(dp);
      if (wp && ['5d', '20d', '60d', '120d', '252d'].includes(wp)) setWindowPeriod(wp);
    }).catch(() => {});
  }, []);

  useEffect(() => {
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
    setRefreshKey(k => k + 1);
    setRefreshing(false);
  }, [ticker, period]);

  const handleShare = async () => {
    if (!data) return;
    const { ticker_info, price, indicators } = data;
    const dir = price.change_pct >= 0 ? '+' : '';
    const wp = WINDOW_KEY_MAP[windowPeriod] || '20';
    const lines = [
      `${ticker_info.ticker} - ${ticker_info.name}`,
      `$${price.current.toFixed(2)} (${dir}${price.change_pct.toFixed(2)}%)`,
      `Sector: ${ticker_info.sector}`,
      '',
      `Indicators (${WINDOW_LABELS[windowPeriod]} window):`,
    ];
    for (const key of ALL_INDICATORS) {
      const preview = getIndicatorPreview(key, data, windowPeriod);
      if (preview.winRate !== null) {
        lines.push(`  ${INDICATOR_META[key]?.label ?? key}: ${preview.value} → ${preview.winRate.toFixed(0)}% win`);
      }
    }
    if (data.combined) {
      const cp = data.combined.probability.periods?.[wp];
      if (cp) lines.push('', `Combined: ${cp.win_rate.toFixed(0)}% win (${data.combined.probability.occurrences} cases)`);
    }
    lines.push('', `Data: ${period.toUpperCase()} | via Stock Scanner`);
    const text = lines.join('\n');
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        await Share.share({ message: text });
      }
    } catch {}
  };

  const toggleCombinedIndicator = (key: string) => {
    setCombinedIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openModal = (key: string) => {
    setModalIndicator(key);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => setModalIndicator(null));
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
  const activeForCombined = ALL_INDICATORS.filter(k => combinedIndicators.has(k) && k !== 'ATR');

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
        {/* HEADER + COMBINED */}
        <View style={[s.headerBlock, { paddingTop: insets.top + 4 }]}>
          <View style={s.navRow}>
            <Pressable style={s.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronLeftIcon size={14} color={colors.accent} />
                <Text style={s.backBtnText}>Home</Text>
              </View>
            </Pressable>
            <View style={s.navRight}>
              <Text style={s.miniLabel}>BT</Text>
              <View style={s.miniPillGroup}>
                {(['1y', '3y', '5y', '10y'] as const).map(p => (
                  <Pressable key={p} style={[s.miniPill, period === p && s.miniPillActiveBlue]} onPress={() => { setPeriod(p); AsyncStorage.setItem('data_period', p).catch(() => {}); }}>
                    <Text style={[s.miniPillText, period === p && s.miniPillTextActive]}>{p.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.miniDivider} />
              <Text style={s.miniLabel}>W</Text>
              <View style={s.miniPillGroup}>
                {(['5d', '20d', '60d', '120d', '252d'] as const).map(wp => (
                  <Pressable key={wp} style={[s.miniPill, windowPeriod === wp && s.miniPillActiveOrange]} onPress={() => { setWindowPeriod(wp); AsyncStorage.setItem('window_period', wp).catch(() => {}); }}>
                    <Text style={[s.miniPillText, windowPeriod === wp && s.miniPillTextActive]}>{WINDOW_LABELS[wp]}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={cycleTheme} style={({ pressed }) => [s.themeBtn, pressed && s.themeBtnPressed]}>
                {themeMode === 'light' ? (
                  <SunIcon size={14} color={colors.textSecondary} />
                ) : themeMode === 'dark' ? (
                  <MoonIcon size={14} color={colors.textSecondary} />
                ) : (
                  <MonitorIcon size={14} color={colors.textSecondary} />
                )}
              </Pressable>
              <Pressable
                style={s.shareBtn}
                onPress={handleShare}
              >
                <Text style={s.shareBtnText}>Share</Text>
              </Pressable>
              <Pressable
                style={[s.saveBtn, inWatchlist && s.saveBtnActive]}
                onPress={() => { if (inWatchlist) removeFromWatchlist(ticker!); else addToWatchlist(ticker!); setInWatchlist(!inWatchlist); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <StarIcon size={13} color={inWatchlist ? colors.accent : colors.textTertiary} filled={inWatchlist} />
                  <Text style={[s.saveBtnText, inWatchlist && s.saveBtnTextActive]}>
                    {inWatchlist ? 'Saved' : 'Save'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          <Text style={s.tickerLabel}>{ticker_info.ticker}</Text>
          <Text style={s.tickerName} numberOfLines={1}>{ticker_info.name}</Text>

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
            <Week52Gauge current={price.current} low={price.low_52w} high={price.high_52w} distribution={indicators.week52?.price_distribution} />
          )}

          {/* COMBINED ANALYSIS */}
          <View style={s.combinedSection}>
            <Text style={s.sectionTitle}>COMBINED ANALYSIS</Text>

            <View style={s.toggleRow}>
              {ALL_INDICATORS.filter(k => k !== 'ATR').map(key => {
                const active = combinedIndicators.has(key);
                return (
                  <Pressable
                    key={key}
                    style={[s.toggleChip, active && s.toggleChipActive]}
                    onPress={() => toggleCombinedIndicator(key)}
                  >
                    <Text style={[s.toggleChipText, active && s.toggleChipTextActive]}>
                      {INDICATOR_META[key].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {activeForCombined.length >= 2 ? (
              <SmartCombinedView
                key={refreshKey}
                ticker={ticker!}
                selectedIndicators={activeForCombined}
              />
            ) : (
              <Text style={s.hintText}>Enable at least 2 indicators for combined analysis</Text>
            )}
          </View>
        </View>

        {/* INDICATORS - tap to open modal */}
        <View style={s.indicatorsSection}>
          <Text style={s.sectionTitle}>INDICATORS</Text>
          <Text style={s.hintText}>Tap any indicator for details</Text>

          {/* Indicator highlight pills */}
          {(() => {
            const highlights = getIndicatorHighlights(data);
            if (highlights.length === 0) return null;
            return (
              <View style={s.highlightRow}>
                {highlights.map((h, i) => (
                  <View key={i} style={[s.highlightPill, { backgroundColor: h.type === 'bullish' ? `${colors.bullish}18` : `${colors.bearish}18` }]}>
                    <Text style={[s.highlightPillText, { color: h.type === 'bullish' ? colors.bullish : colors.bearish }]}>
                      {h.text}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })()}

          <View style={s.cardGrid}>
            {ALL_INDICATORS.map(key => {
              const { value, winRate } = getIndicatorPreview(key, data, windowPeriod);
              const meta = INDICATOR_META[key];

              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [
                    s.indicatorCard,
                    pressed && s.indicatorCardPressed,
                  ]}
                  onPress={() => openModal(key)}
                >
                  <Text style={s.cardLabel}>{meta.label}</Text>
                  <Text style={s.cardValue}>{value}</Text>
                  {winRate !== null && (
                    <View style={[s.winBadge, { backgroundColor: winRate >= 50 ? `${colors.bullish}18` : `${colors.bearish}18` }]}>
                      <Text style={[s.cardWinRate, { color: winRate >= 50 ? colors.bullish : colors.bearish }]}>
                        {winRate.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[s.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={s.footerText}>Updated: {data.analysis_date}</Text>
        </View>
      </ScrollView>

      {/* CENTERED POPUP MODAL */}
      <Modal
        visible={modalIndicator !== null}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={closeModal} />
          <Animated.View
            style={[
              s.modalSheet,
              { paddingBottom: insets.bottom + 16 },
              { transform: [{ scale: scaleAnim }], opacity: scaleAnim },
            ]}
          >
            {/* Modal header */}
            <View style={s.modalHeader}>
              <View style={s.modalTitleRow}>
                <Text style={s.modalTitle}>
                  {modalIndicator ? INDICATOR_META[modalIndicator]?.label : ''} Detail
                </Text>
              </View>
              <Pressable style={s.modalCloseBtn} onPress={closeModal}>
                <Text style={s.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* Modal content */}
            <ScrollView
              style={s.modalScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {modalIndicator && data && (
                <IndicatorCard type={modalIndicator} data={data} />
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
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

  // Header block
  headerBlock: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { color: c.accent, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.sm,
    borderWidth: 1, borderColor: c.borderLight, backgroundColor: c.bgElevated,
  },
  saveBtnActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  saveBtnText: { color: c.textTertiary, ...typography.labelSm },
  saveBtnTextActive: { color: c.accent },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniLabel: { color: c.textMuted, fontSize: 7, fontWeight: '800', letterSpacing: 0.3 },
  miniPillGroup: { flexDirection: 'row', gap: 1 },
  miniPill: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  miniPillActiveBlue: { backgroundColor: c.accent },
  miniPillActiveOrange: { backgroundColor: c.warning },
  miniPillText: { color: c.textMuted, fontSize: 8, fontWeight: '600' },
  miniPillTextActive: { color: '#fff', fontWeight: '800' },
  miniDivider: { width: 1, height: 12, backgroundColor: c.border },
  shareBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border,
  },
  shareBtnText: { color: c.textSecondary, fontSize: 10, fontWeight: '600' },
  themeBtn: {
    paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6,
  },
  themeBtnPressed: { backgroundColor: c.bgElevated },

  tickerLabel: { color: c.accent, ...typography.label, letterSpacing: 1 },
  tickerName: { color: c.textTertiary, ...typography.labelSm, marginTop: 1, maxWidth: 280, marginBottom: spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  priceValue: { color: c.textPrimary, ...typography.numberLg },
  changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  changeValue: { ...typography.numberSm },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  metricText: {
    color: c.textMuted, fontSize: 11, backgroundColor: c.bgElevated,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },

  // Combined section
  combinedSection: {
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border,
  },
  sectionTitle: { color: c.textTertiary, ...typography.label, marginBottom: spacing.xs },
  hintText: { color: c.textMuted, fontSize: 11, marginBottom: spacing.sm },

  // Toggle chips
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: spacing.md },
  toggleChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border,
  },
  toggleChipActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  toggleChipText: { color: c.textMuted, fontSize: 11, fontWeight: '500' },
  toggleChipTextActive: { color: c.accent, fontWeight: '600' },

  // Indicators section
  indicatorsSection: { padding: spacing.lg, paddingTop: spacing.lg },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  indicatorCard: {
    width: '31%' as any,
    backgroundColor: c.bgCard, borderRadius: radius.lg, padding: spacing.sm,
    borderWidth: 1, borderColor: c.border, alignItems: 'center',
    minHeight: 90, justifyContent: 'center',
  },
  indicatorCardPressed: { transform: [{ scale: 0.95 }], backgroundColor: c.bgElevated },
  cardLabel: { color: c.textTertiary, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  cardValue: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  winBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  cardWinRate: { fontSize: 10, fontWeight: '700' },

  // Highlight pills
  highlightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  highlightPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  highlightPillText: { fontSize: 11, fontWeight: '600' },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 20, gap: 2 },
  footerText: { color: c.textMuted, fontSize: 10 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: c.bg, borderRadius: 16, width: '100%',
    maxHeight: SCREEN_H * 0.75, overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '700' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.bgElevated, justifyContent: 'center', alignItems: 'center',
  },
  modalCloseBtnText: { color: c.textMuted, fontSize: 16 },
  modalScroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});

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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';
import type { AnalysisResponse, EarningsHistoryResponse } from '../../src/types/analysis';
import IndicatorCard from '../../src/components/IndicatorCard';
import SmartCombinedView from '../../src/components/SmartCombinedView';
import Week52Gauge from '../../src/components/Week52Gauge';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '../../src/store/watchlist';
import { useTheme } from '../../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../../src/theme';
import { SunIcon, MoonIcon, MonitorIcon, ChevronLeftIcon, StarIcon } from '../../src/components/ThemeIcons';
import TopLoadingBar from '../../src/components/TopLoadingBar';
import { PERIOD_LABELS } from '../../src/constants/ui';
import { doShare } from '../../src/utils/share';
import { usePremium } from '../../src/contexts/PremiumContext';
import UpgradeOverlay from '../../src/components/UpgradeOverlay';

const INDICATOR_META: Record<string, { label: string; labelKo: string }> = {
  RSI: { label: 'RSI', labelKo: '과매수/과매도' },
  MACD: { label: 'MACD', labelKo: '모멘텀' },
  MA: { label: 'MA', labelKo: '추세' },
  BB: { label: 'BB', labelKo: '변동폭' },
  Vol: { label: 'Vol', labelKo: '거래량' },
  Stoch: { label: 'Stoch', labelKo: '스토캐스틱' },
  Drawdown: { label: 'DD', labelKo: '고점대비' },
  ADX: { label: 'ADX', labelKo: '추세강도' },
  MADist: { label: 'MADist', labelKo: '이격도' },
  Consec: { label: 'Streak', labelKo: '연속일' },
  W52: { label: '52W', labelKo: '52주 위치' },
  ATR: { label: 'ATR', labelKo: '변동성' },
};

const ALL_INDICATORS = Object.keys(INDICATOR_META);

const WINDOW_KEY_MAP: Record<string, string> = { '5d': '5', '20d': '20', '60d': '60', '120d': '120', '252d': '252' };

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
    if (ind.rsi.value > 70) highlights.push({ text: `과매수 (RSI ${ind.rsi.value.toFixed(0)})`, type: 'bearish' });
    else if (ind.rsi.value < 30) highlights.push({ text: `과매도 (RSI ${ind.rsi.value.toFixed(0)})`, type: 'bullish' });
  }

  // MACD
  if (ind.macd.event === 'golden_cross') highlights.push({ text: '모멘텀 상승 전환', type: 'bullish' });
  else if (ind.macd.event === 'dead_cross') highlights.push({ text: '모멘텀 하락 전환', type: 'bearish' });

  // MA alignment
  if (ind.ma.alignment === 'bullish') highlights.push({ text: '상승 추세 (이평선 정배열)', type: 'bullish' });
  else if (ind.ma.alignment === 'bearish') highlights.push({ text: '하락 추세 (이평선 역배열)', type: 'bearish' });

  // Volume spike
  if (ind.volume.ratio !== null && ind.volume.ratio !== undefined && ind.volume.ratio > 2.0) {
    highlights.push({ text: `거래량 급증 (${ind.volume.ratio.toFixed(1)}x)`, type: 'bullish' });
  }

  // Drawdown
  if (ind.drawdown.from_60d_high !== null && ind.drawdown.from_60d_high !== undefined && ind.drawdown.from_60d_high < -20) {
    highlights.push({ text: `고점 대비 급락 (${ind.drawdown.from_60d_high.toFixed(0)}%)`, type: 'bearish' });
  }

  // Consecutive days
  if (ind.consecutive.days >= 5) highlights.push({ text: `${ind.consecutive.days}일 연속 상승`, type: 'bullish' });
  else if (ind.consecutive.days <= -5) highlights.push({ text: `${Math.abs(ind.consecutive.days)}일 연속 하락`, type: 'bearish' });

  // ADX
  if (ind.adx.adx !== null && ind.adx.adx !== undefined && ind.adx.adx > 40) {
    highlights.push({ text: '매우 강한 추세', type: 'bullish' });
  }

  // Stochastic
  if (ind.stochastic.k !== null && ind.stochastic.k !== undefined) {
    if (ind.stochastic.k < 20) highlights.push({ text: '스토캐스틱 과매도', type: 'bullish' });
    else if (ind.stochastic.k > 80) highlights.push({ text: '스토캐스틱 과매수', type: 'bearish' });
  }

  return highlights.slice(0, 3);
}

export default function AnalyzeScreen() {
  const { colors, themeMode, cycleTheme } = useTheme();
  const { isPro, showPaywall } = usePremium();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const s = useMemo(() => makeStyles(colors, screenH), [colors, screenH]);
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    return () => {
      scaleAnim.stopAnimation();
    };
  }, []);

  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
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
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [earningsData, setEarningsData] = useState<EarningsHistoryResponse | null>(null);
  const [showAllEarnings, setShowAllEarnings] = useState(false);

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

  const hasDataRef = useRef(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!ticker) return;
    const isInitial = !hasDataRef.current || forceRefresh;
    if (isInitial) setLoading(true);
    setPeriodLoading(true);
    setError(null);
    try {
      const result = await api.analyze(ticker, period);
      setData(result);
      hasDataRef.current = true;
    } catch (e: any) {
      if (isInitial) {
        setError(e.response?.data?.detail ?? e.message ?? '분석 실패');
      }
    }
    setLoading(false);
    setPeriodLoading(false);
  }, [ticker, period]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const refreshData = useCallback(async () => {
    if (!ticker) return;
    try {
      setData(await api.analyze(ticker, period, true));
    } catch {
      // Only show error if we don't have existing data
      if (!dataRef.current) setError('데이터 새로고침 실패');
    }
  }, [ticker, period]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => refreshData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData, refreshData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshKey(k => k + 1);
    setRefreshing(false);
  };

  // Load earnings history (non-blocking, after main data loads)
  useEffect(() => {
    if (ticker && data) {
      api.earningsHistory(ticker).then(setEarningsData).catch(() => {});
    }
  }, [ticker, data]);

  const [shareMsg, setShareMsg] = useState('');

  const buildShareText = () => {
    if (!data) return '';
    const { ticker_info, price } = data;
    const dir = price.change_pct >= 0 ? '+' : '';
    const wp = WINDOW_KEY_MAP[windowPeriod] || '20';
    const lines = [
      `${ticker_info.ticker} - ${ticker_info.name}`,
      `$${price.current.toFixed(2)} (${dir}${price.change_pct.toFixed(2)}%)`,
      `섹터: ${ticker_info.sector}`,
      '',
      `지표 (${PERIOD_LABELS[windowPeriod]} 윈도우):`,
    ];
    for (const key of ALL_INDICATORS) {
      const preview = getIndicatorPreview(key, data, windowPeriod);
      if (preview.winRate !== null) {
        lines.push(`  ${INDICATOR_META[key]?.label ?? key}: ${preview.value} → 승률 ${preview.winRate.toFixed(0)}%`);
      }
    }
    if (data.combined) {
      const cp = data.combined.probability.periods?.[wp];
      if (cp) lines.push('', `종합: 승률 ${cp.win_rate.toFixed(0)}% (${data.combined.probability.occurrences}건)`);
    }
    lines.push('', `데이터: ${period.toUpperCase()} 백테스트 | Stock Scanner`);
    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = buildShareText();
    if (!text) return;
    const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `${window.location.origin}/share/${ticker}`
      : undefined;
    await doShare(text, (msg) => { setShareMsg(msg); setTimeout(() => setShareMsg(''), 2000); }, shareUrl);
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
        <Text style={s.loadingText}>{ticker?.toUpperCase()} 분석 중</Text>
        <Text style={s.loadingSub}>지표 계산 중...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.center}>
        <View style={s.errorIconCircle}>
          <Text style={s.errorIconText}>!</Text>
        </View>
        <Text style={s.errorTitle}>분석 실패</Text>
        <Text style={s.errorText}>{error ?? '알 수 없는 오류'}</Text>
        <Pressable style={s.retryBtn} onPress={() => loadData()} accessibilityRole="button" accessibilityLabel="분석 다시 시도">
          <Text style={s.retryBtnText}>다시 시도</Text>
        </Pressable>
        <Pressable style={s.backLink} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} accessibilityRole="button" accessibilityLabel="홈으로 돌아가기">
          <Text style={s.backLinkText}>홈으로</Text>
        </Pressable>
      </View>
    );
  }

  const { ticker_info, price, indicators } = data;
  const activeForCombined = ALL_INDICATORS.filter(k => combinedIndicators.has(k) && k !== 'ATR');
  const highlights = getIndicatorHighlights(data);

  return (
    <View style={s.container}>
      {periodLoading && <TopLoadingBar color={colors.accent} bgColor={`${colors.textMuted}15`} />}
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
            <Pressable style={s.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} accessibilityRole="button" accessibilityLabel="뒤로 가기">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronLeftIcon size={14} color={colors.accent} />
                <Text style={s.backBtnText}>홈</Text>
              </View>
            </Pressable>
            <View style={s.navRight}>
              <Text style={s.miniLabel}>백테스트</Text>
              <View style={s.miniPillGroup}>
                {(['1y', '3y', '5y', '10y'] as const).map(p => (
                  <Pressable key={p} style={[s.miniPill, period === p && s.miniPillActiveBlue]} onPress={() => { setPeriod(p); AsyncStorage.setItem('data_period', p).catch(() => {}); }} accessibilityRole="button" accessibilityLabel={`백테스트 기간 ${p.toUpperCase()}`}>
                    <Text style={[s.miniPillText, period === p && s.miniPillTextActive]}>{p.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.miniDivider} />
              <Text style={s.miniLabel}>윈도우</Text>
              <View style={s.miniPillGroup}>
                {(['5d', '20d', '60d', '120d', '252d'] as const).map(wp => (
                  <Pressable key={wp} style={[s.miniPill, windowPeriod === wp && s.miniPillActiveOrange]} onPress={() => { setWindowPeriod(wp); AsyncStorage.setItem('window_period', wp).catch(() => {}); }} accessibilityRole="button" accessibilityLabel={`윈도우 기간 ${PERIOD_LABELS[wp]}`}>
                    <Text style={[s.miniPillText, windowPeriod === wp && s.miniPillTextActive]}>{PERIOD_LABELS[wp]}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={cycleTheme} style={({ pressed }) => [s.themeBtn, pressed && s.themeBtnPressed]} accessibilityRole="button" accessibilityLabel="테마 변경">
                {themeMode === 'light' ? (
                  <SunIcon size={14} color={colors.textSecondary} />
                ) : themeMode === 'dark' ? (
                  <MoonIcon size={14} color={colors.textSecondary} />
                ) : (
                  <MonitorIcon size={14} color={colors.textSecondary} />
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.7 }]}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="분석 공유"
              >
                <Text style={s.shareBtnText}>{shareMsg || '공유'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={s.tickerRow}>
            <Text style={s.tickerLabel}>{ticker_info.ticker}</Text>
            <Pressable
              style={[s.saveBtn, inWatchlist && s.saveBtnActive]}
              onPress={() => { if (inWatchlist) removeFromWatchlist(ticker!); else addToWatchlist(ticker!); setInWatchlist(!inWatchlist); }}
              accessibilityRole="button"
              accessibilityLabel={inWatchlist ? '관심종목에서 제거' : '관심종목에 추가'}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <StarIcon size={13} color={inWatchlist ? colors.accent : colors.textTertiary} filled={inWatchlist} />
                <Text style={[s.saveBtnText, inWatchlist && s.saveBtnTextActive]}>
                  {inWatchlist ? '저장됨' : '저장'}
                </Text>
              </View>
            </Pressable>
          </View>
          <Text style={s.tickerName} numberOfLines={1}>{ticker_info.name}</Text>

          <View style={s.priceRow}>
            <Text style={s.priceValue}>${price.current.toFixed(2)}</Text>
            <View style={[s.changeBadge, { backgroundColor: price.change >= 0 ? colors.bullishBg : colors.bearishBg }]}>
              <Text style={[s.changeValue, { color: getDirectionColor(price.change, colors) }]}>
                {price.change >= 0 ? '+' : ''}{price.change.toFixed(2)} ({price.change_pct >= 0 ? '+' : ''}{price.change_pct.toFixed(2)}%)
              </Text>
            </View>
            {data.combined && data.combined.probability?.periods?.[WINDOW_KEY_MAP[windowPeriod]] && (
              <Pressable style={s.summaryBtn} onPress={() => setSummaryVisible(true)} accessibilityRole="button" accessibilityLabel="분석 요약 보기">
                <Text style={s.summaryBtnText}>?</Text>
              </Pressable>
            )}
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

        </View>

        {/* 52 Week Position - most intuitive at-a-glance view */}
        {price.high_52w && price.low_52w && (
          <View style={s.week52Section}>
            <Week52Gauge current={price.current} low={price.low_52w} high={price.high_52w} distribution={indicators.week52?.price_distribution} />
          </View>
        )}

        {/* EARNINGS HISTORY */}
        {earningsData && earningsData.earnings.length > 0 && (
          <View style={s.earningsSection}>
            <Text style={s.sectionTitle}>어닝 히스토리</Text>

            {/* Summary stats bar */}
            <View style={s.earningsStatsRow}>
              {earningsData.stats.beat_rate !== null && (
                <View style={s.earningsStat}>
                  <Text style={[s.earningsStatValue, { color: earningsData.stats.beat_rate >= 50 ? colors.bullish : colors.bearish }]}>
                    {earningsData.stats.beat_rate}%
                  </Text>
                  <Text style={s.earningsStatLabel}>적중률</Text>
                </View>
              )}
              {earningsData.stats.avg_return_1w !== null && (
                <View style={s.earningsStat}>
                  <Text style={[s.earningsStatValue, { color: earningsData.stats.avg_return_1w >= 0 ? colors.bullish : colors.bearish }]}>
                    {earningsData.stats.avg_return_1w >= 0 ? '+' : ''}{earningsData.stats.avg_return_1w}%
                  </Text>
                  <Text style={s.earningsStatLabel}>1주 평균</Text>
                </View>
              )}
              {earningsData.stats.avg_return_1m !== null && (
                <View style={s.earningsStat}>
                  <Text style={[s.earningsStatValue, { color: earningsData.stats.avg_return_1m >= 0 ? colors.bullish : colors.bearish }]}>
                    {earningsData.stats.avg_return_1m >= 0 ? '+' : ''}{earningsData.stats.avg_return_1m}%
                  </Text>
                  <Text style={s.earningsStatLabel}>1개월 평균</Text>
                </View>
              )}
              {earningsData.stats.positive_after_1w_pct !== null && (
                <View style={s.earningsStat}>
                  <Text style={[s.earningsStatValue, { color: earningsData.stats.positive_after_1w_pct >= 50 ? colors.bullish : colors.bearish }]}>
                    {earningsData.stats.positive_after_1w_pct}%
                  </Text>
                  <Text style={s.earningsStatLabel}>1주 상승률</Text>
                </View>
              )}
            </View>

            {/* Column headers */}
            <View style={s.earningsHeaderRow}>
              <Text style={[s.earningsDate, s.earningsHeaderText]}>날짜</Text>
              <View style={s.earningsEps}>
                <Text style={s.earningsHeaderText}>EPS</Text>
              </View>
              <View style={s.earningsSurpriseCol}>
                <Text style={s.earningsHeaderText}>서프라이즈</Text>
              </View>
              <Text style={[s.earningsReturn, s.earningsHeaderText]}>1W</Text>
              <Text style={[s.earningsReturn, s.earningsHeaderText]}>1M</Text>
            </View>

            {/* Earnings rows */}
            {(showAllEarnings ? earningsData.earnings : earningsData.earnings.slice(0, 1)).map((e, i) => (
              <View key={i} style={s.earningsRow}>
                <Text style={s.earningsDate}>{e.date.slice(5)}</Text>
                <View style={s.earningsEps}>
                  <Text style={s.earningsEpsText}>
                    {e.eps_estimate !== null ? e.eps_estimate.toFixed(2) : '?'} → {e.reported_eps !== null ? e.reported_eps.toFixed(2) : '?'}
                  </Text>
                </View>
                <View style={s.earningsSurpriseCol}>
                  {e.surprise_pct !== null ? (
                    <View style={[s.earningsSurpriseBadge, { backgroundColor: e.surprise_pct >= 0 ? `${colors.bullish}15` : `${colors.bearish}15` }]}>
                      <Text style={[s.earningsSurpriseText, { color: e.surprise_pct >= 0 ? colors.bullish : colors.bearish }]}>
                        {e.surprise_pct >= 0 ? '+' : ''}{e.surprise_pct.toFixed(1)}%
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.earningsReturnDash}>--</Text>
                  )}
                </View>
                <Text style={[s.earningsReturn, { color: (e.return_1w ?? 0) >= 0 ? colors.bullish : colors.bearish }]}>
                  {e.return_1w !== null ? `${e.return_1w >= 0 ? '+' : ''}${e.return_1w.toFixed(1)}%` : '--'}
                </Text>
                <Text style={[s.earningsReturn, { color: (e.return_1m ?? 0) >= 0 ? colors.bullish : colors.bearish }]}>
                  {e.return_1m !== null ? `${e.return_1m >= 0 ? '+' : ''}${e.return_1m.toFixed(1)}%` : '--'}
                </Text>
              </View>
            ))}

            {earningsData.earnings.length > 1 && (
              <Pressable onPress={() => setShowAllEarnings(!showAllEarnings)} style={s.showMoreBtn}>
                <Text style={s.showMoreText}>{showAllEarnings ? '접기' : `전체 ${earningsData.earnings.length}개 보기`}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* COMBINED ANALYSIS */}
        <View style={s.headerBlock}>
          <View style={[s.combinedSection, { position: 'relative' }]}>
            <Text style={s.sectionTitle}>종합 분석</Text>

            <View style={s.toggleRow}>
              {ALL_INDICATORS.filter(k => k !== 'ATR').map(key => {
                const active = combinedIndicators.has(key);
                return (
                  <Pressable
                    key={key}
                    style={[s.toggleChip, active && s.toggleChipActive]}
                    onPress={() => toggleCombinedIndicator(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`종합 분석에서 ${INDICATOR_META[key].labelKo} ${active ? '해제' : '활성화'}`}
                  >
                    <Text style={[s.toggleChipText, active && s.toggleChipTextActive]}>
                      {INDICATOR_META[key].labelKo}
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
              <Text style={s.hintText}>종합 분석을 위해 2개 이상 지표를 선택하세요</Text>
            )}

            {/* Premium gate overlay for the combined section */}
            {!isPro && activeForCombined.length >= 2 && (
              <UpgradeOverlay message="Upgrade to Pro for Smart Combined Probability" />
            )}
          </View>
        </View>

        {/* Time Machine CTA */}
        <Pressable
          style={({ pressed }) => [s.timeMachineBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push(`/time-machine/${ticker}`)}
          accessibilityRole="button"
          accessibilityLabel="타임머신 열기"
        >
          <Text style={s.timeMachineBtnIcon}>TM</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.timeMachineBtnTitle}>타임머신</Text>
            <Text style={s.timeMachineBtnSub}>과거 날짜의 시그널과 실제 결과 비교</Text>
          </View>
          <Text style={{ color: colors.accent, fontSize: 16 }}>›</Text>
        </Pressable>

        {/* INDICATORS - detailed breakdown, tap for modal */}
        <View style={s.indicatorsSection}>
          <Text style={s.sectionTitle}>지표</Text>
          <Text style={s.hintText}>탭하여 상세 정보 확인</Text>

          {/* Indicator highlight pills */}
          {highlights.length > 0 && (
            <View style={s.highlightRow}>
              {highlights.map((h, i) => (
                <View key={i} style={[s.highlightPill, { backgroundColor: h.type === 'bullish' ? `${colors.bullish}18` : `${colors.bearish}18` }]}>
                  <Text style={[s.highlightPillText, { color: h.type === 'bullish' ? colors.bullish : colors.bearish }]}>
                    {h.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

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
                  accessibilityRole="button"
                  accessibilityLabel={`${meta.labelKo} 지표, 값 ${value}${winRate !== null ? `, 승률 ${winRate.toFixed(0)}%` : ''}`}
                >
                  <Text style={s.cardLabel}>{meta.labelKo}</Text>
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
          <Text style={s.footerText}>업데이트: {data.analysis_date}</Text>
        </View>

        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            본 분석은 과거 데이터 기반 통계이며 투자 조언이 아닙니다.
          </Text>
          <Text style={s.disclaimerText}>
            투자 결정은 본인 판단하에 이루어져야 합니다.
          </Text>
        </View>
      </ScrollView>

      {/* SUMMARY TOOLTIP MODAL */}
      <Modal
        visible={summaryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSummaryVisible(false)}
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setSummaryVisible(false)} accessibilityRole="button" accessibilityLabel="요약 닫기" />
          <View style={s.summaryModal}>
            <View style={s.summaryModalHeader}>
              <Text style={s.summaryModalTitle}>{ticker_info.ticker} 요약</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setSummaryVisible(false)} accessibilityRole="button" accessibilityLabel="요약 닫기">
                <Text style={s.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            {data.combined && data.combined.probability?.periods?.[WINDOW_KEY_MAP[windowPeriod]] && (
              <View style={s.summaryModalBody}>
                <Text style={s.summaryModalText}>
                  {(() => {
                    const wp = WINDOW_KEY_MAP[windowPeriod];
                    const p = data.combined!.probability.periods[wp];
                    if (!p) return '';
                    const occ = data.combined!.probability.occurrences;
                    const wins = Math.round(occ * p.win_rate / 100);
                    const periodLabel = PERIOD_LABELS[windowPeriod] || windowPeriod;
                    const direction = p.win_rate >= 50 ? '상승' : '하락';
                    const dirEn = p.win_rate >= 50 ? 'up' : 'down';
                    return `과거 ${data.combined!.probability.data_period || '10년'}간 유사한 조건이 ${occ}번 발생했습니다. 이 중 ${wins}번(${p.win_rate.toFixed(0)}%)이 ${periodLabel} 후 ${direction}했습니다.\n\nIn ${occ} similar cases, ${wins} (${p.win_rate.toFixed(0)}%) moved ${dirEn} after ${periodLabel}.`;
                  })()}
                </Text>
                {highlights.length > 0 && (
                  <View style={s.summaryModalHighlights}>
                    {highlights.slice(0, 3).map((h, i) => (
                      <View key={i} style={[s.ahaBadge, { backgroundColor: h.type === 'bullish' ? `${colors.bullish}20` : `${colors.bearish}20` }]}>
                        <Text style={[s.ahaBadgeText, { color: h.type === 'bullish' ? colors.bullish : colors.bearish }]}>{h.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* CENTERED POPUP MODAL */}
      <Modal
        visible={modalIndicator !== null}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={closeModal} accessibilityRole="button" accessibilityLabel="지표 상세 닫기" />
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
                  {modalIndicator ? `${INDICATOR_META[modalIndicator]?.labelKo} (${INDICATOR_META[modalIndicator]?.label})` : ''}
                </Text>
              </View>
              <Pressable style={s.modalCloseBtn} onPress={closeModal} accessibilityRole="button" accessibilityLabel="지표 상세 닫기">
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

const makeStyles = (c: ThemeColors, screenH: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, maxWidth: 600, alignSelf: 'center' as const, width: '100%' as any },
  scroll: { flex: 1 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.bg, padding: spacing.xl,
  },
  loadingText: { color: c.textPrimary, ...typography.h3, marginTop: spacing.lg },
  loadingSub: { color: c.textTertiary, ...typography.bodySm, marginTop: spacing.xs },
  errorIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: `${c.bearish}15`, alignItems: 'center' as const,
    justifyContent: 'center' as const, marginBottom: spacing.md,
  },
  errorIconText: { color: c.bearish, fontSize: 28, fontWeight: '800' as const },
  errorTitle: {
    color: c.textPrimary, ...typography.h3, marginBottom: spacing.xs,
  },
  errorText: { color: c.textSecondary, ...typography.bodySm, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: c.accent, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: radius.md,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  backLink: { marginTop: spacing.md, paddingVertical: spacing.sm },
  backLinkText: { color: c.textMuted, ...typography.bodySm, textDecorationLine: 'underline' as const },

  // Header block
  headerBlock: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backBtn: { paddingVertical: 12, paddingRight: 16 },
  backBtnText: { color: c.accent, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.sm,
    borderWidth: 1, borderColor: c.borderLight, backgroundColor: c.bgElevated,
  },
  saveBtnActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  saveBtnText: { color: c.textTertiary, ...typography.labelSm },
  saveBtnTextActive: { color: c.accent },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniLabel: { color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  miniPillGroup: { flexDirection: 'row', gap: 1 },
  miniPill: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 3 },
  miniPillActiveBlue: { backgroundColor: c.accent },
  miniPillActiveOrange: { backgroundColor: c.warning },
  miniPillText: { color: c.textMuted, fontSize: 10, fontWeight: '600' },
  miniPillTextActive: { color: '#fff', fontWeight: '800' },
  miniDivider: { width: 1, height: 12, backgroundColor: c.border },
  shareBtn: {
    paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.sm,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border,
  },
  shareBtnText: { color: c.textSecondary, fontSize: 10, fontWeight: '600' },
  themeBtn: {
    padding: 12, borderRadius: 6,
  },
  themeBtnPressed: { backgroundColor: c.bgElevated },

  tickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    paddingHorizontal: 8, paddingVertical: 10, borderRadius: radius.full,
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
  cardLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  cardValue: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  winBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  cardWinRate: { fontSize: 11, fontWeight: '700' },

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
    maxHeight: screenH * 0.75, overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '700' },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.bgElevated, justifyContent: 'center', alignItems: 'center',
  },
  modalCloseBtnText: { color: c.textMuted, fontSize: 16 },
  modalScroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Summary tooltip button
  summaryBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  summaryBtnText: {
    color: c.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Summary modal
  summaryModal: {
    backgroundColor: c.bg,
    borderRadius: 16,
    width: '100%' as any,
    overflow: 'hidden' as const,
  },
  summaryModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  summaryModalTitle: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryModalBody: {
    padding: spacing.lg,
  },
  summaryModalText: {
    color: c.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  summaryModalHighlights: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: spacing.xs,
  },

  // Aha badge (used in summary modal)
  ahaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ahaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 52 Week section
  week52Section: {
    backgroundColor: c.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // Earnings History section
  earningsSection: {
    backgroundColor: c.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: 1,
  },
  earningsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: c.bgElevated,
    borderRadius: radius.md,
  },
  earningsStat: {
    alignItems: 'center',
  },
  earningsStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  earningsStatLabel: {
    color: c.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  earningsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginBottom: 2,
  },
  earningsHeaderText: {
    color: c.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  earningsDate: {
    width: 46,
    color: c.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  earningsEps: {
    flex: 1,
    paddingHorizontal: 2,
  },
  earningsEpsText: {
    color: c.textPrimary,
    fontSize: 11,
    fontWeight: '500',
  },
  earningsSurpriseCol: {
    width: 58,
    alignItems: 'center',
  },
  earningsSurpriseBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  earningsSurpriseText: {
    fontSize: 11,
    fontWeight: '600',
  },
  earningsReturn: {
    width: 48,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
  },
  earningsReturnDash: {
    color: c.textMuted,
    fontSize: 11,
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  showMoreText: {
    color: c.accent,
    fontSize: 12,
    fontWeight: '600',
  },

  // Time Machine CTA
  timeMachineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: `${c.accent}12`,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${c.accent}30`,
    gap: spacing.sm,
  } as any,
  timeMachineBtnIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: c.accent,
  },
  timeMachineBtnTitle: {
    color: c.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  timeMachineBtnSub: {
    color: c.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  // Disclaimer
  disclaimer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  disclaimerText: {
    color: c.textMuted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
});

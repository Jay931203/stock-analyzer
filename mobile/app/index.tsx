import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  ScrollView,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { initServerUrl } from '../src/api/client';
import type { CalendarEvent, FlipItem, SearchResult, SignalItem } from '../src/types/analysis';
import { getWatchlist, removeFromWatchlist, subscribe, initWatchlist } from '../src/store/watchlist';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../src/theme';
import { SunIcon, MoonIcon, MonitorIcon, SearchIcon } from '../src/components/ThemeIcons';

const PERIOD_LABELS: Record<string, string> = { '5d': '1W', '20d': '1M', '60d': '3M', '120d': '6M', '252d': '1Y' };

function TopLoadingBar({ color, bgColor }: { color: string; bgColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const left = anim.interpolate({ inputRange: [0, 1], outputRange: ['-40%' as any, '100%' as any] });
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: bgColor, zIndex: 100, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', width: '40%', height: '100%', backgroundColor: color, borderRadius: 2, left }} />
    </View>
  );
}

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

function SignalCard({ sig, colors, bullishColor, onPress, onLongPress, period = '20d' }: {
  sig: SignalItem;
  colors: ThemeColors;
  bullishColor: string;
  onPress: () => void;
  onLongPress?: () => void;
  period?: string;
}) {
  const winRate = getWinRateForPeriod(sig, period);
  const avgReturn = getAvgReturnForPeriod(sig, period);
  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles(colors).card,
        { borderLeftColor: bullishColor },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={cardStyles(colors).topRow}>
        <Text style={cardStyles(colors).ticker}>{sig.ticker}</Text>
        <Text style={[cardStyles(colors).change, { color: getDirectionColor(sig.change_pct, colors) }]}>
          {sig.change_pct >= 0 ? '+' : ''}{sig.change_pct.toFixed(1)}%
        </Text>
      </View>
      {sig.name && <Text style={cardStyles(colors).companyName} numberOfLines={1}>{sig.name}</Text>}
      <View style={cardStyles(colors).priceRow}>
        <Text style={cardStyles(colors).price}>${sig.price.toFixed(2)}</Text>
        {sig.market_cap_b ? (
          <Text style={cardStyles(colors).mcap}>
            {sig.market_cap_b >= 1000 ? `${(sig.market_cap_b / 1000).toFixed(1)}T` : `${sig.market_cap_b}B`}
          </Text>
        ) : null}
      </View>
      <View style={cardStyles(colors).divider} />
      {sig.occurrences === 0 ? (
        <>
          <Text style={[cardStyles(colors).winRate, { color: colors.textMuted, fontSize: 18 }]}>N/A</Text>
          <Text style={cardStyles(colors).probLabel}>Insufficient Data</Text>
        </>
      ) : (
        <>
          <Text style={[cardStyles(colors).winRate, { color: bullishColor }]}>
            {winRate.toFixed(0)}%
          </Text>
          <Text style={cardStyles(colors).probLabel}>
            Win Rate{sig.occurrences < 5 ? ' *' : ''}
          </Text>
        </>
      )}
      {avgReturn !== undefined && avgReturn !== 0 && sig.occurrences > 0 && (
        <View style={[cardStyles(colors).avgBadge, {
          backgroundColor: avgReturn >= 0 ? `${colors.bullish}15` : `${colors.bearish}15`,
        }]}>
          <Text style={[cardStyles(colors).avgText, {
            color: avgReturn >= 0 ? colors.bullish : colors.bearish,
          }]}>
            Avg {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
          </Text>
        </View>
      )}
      <Text style={cardStyles(colors).cases}>
        {sig.occurrences === 0 ? 'No match' : `${sig.occurrences} cases`}
      </Text>
    </Pressable>
  );
}

const _cardStylesCache = new WeakMap<ThemeColors, ReturnType<typeof _makeCardStyles>>();
function cardStyles(c: ThemeColors) {
  let s = _cardStylesCache.get(c);
  if (!s) { s = _makeCardStyles(c); _cardStylesCache.set(c, s); }
  return s;
}
function _makeCardStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 144, backgroundColor: c.bgCard, borderRadius: radius.lg,
      padding: spacing.md, marginRight: 10, borderWidth: 1, borderColor: c.border,
      borderLeftWidth: 3,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    ticker: { color: c.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    change: { fontSize: 11, fontWeight: '600' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    price: { color: c.textTertiary, fontSize: 12, fontWeight: '500' },
    mcap: { color: c.textMuted, fontSize: 10, fontWeight: '500' },
    divider: { height: 1, backgroundColor: c.border, marginBottom: 8 },
    winRate: { fontSize: 30, fontWeight: '800', alignSelf: 'center' as const, letterSpacing: -1 },
    probLabel: { color: c.textMuted, fontSize: 10, fontWeight: '600', alignSelf: 'center' as const, marginTop: 2, letterSpacing: 0.3 },
    avgBadge: {
      alignSelf: 'center' as const, marginTop: 6,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
    },
    avgText: { fontSize: 11, fontWeight: '700' },
    companyName: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginTop: -1, marginBottom: 2 },
    cases: { color: c.textMuted, fontSize: 10, marginTop: 6, alignSelf: 'center' as const },
  });
}

export default function HomeScreen() {
  const { colors, isDark, themeMode, cycleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsUpdated, setSignalsUpdated] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [marketState, setMarketState] = useState('');
  const [activeSector, setActiveSector] = useState<string | null>('All');
  const [sortBy, setSortBy] = useState<'win_rate' | 'avg_return' | 'change'>('win_rate');
  const [period, setPeriod] = useState<string>('20d'); // forward return window (global)
  const [dataPeriod, setDataPeriod] = useState<string>('3y'); // backtest data range (global)
  const [marketIndices, setMarketIndices] = useState<Record<string, { price: number; change_pct: number }>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [dismissedSearches, setDismissedSearches] = useState<Set<string>>(new Set());
  // earnings data comes from calendar API, no separate state needed
  const [flips, setFlips] = useState<FlipItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    async function init() {
      await initServerUrl();
      await initWatchlist();
      setWatchlist(getWatchlist());

      // Load saved settings
      try {
        const [savedDp, savedWp] = await Promise.all([
          AsyncStorage.getItem('data_period'),
          AsyncStorage.getItem('window_period'),
        ]);
        if (savedDp && ['1y', '3y', '5y', '10y'].includes(savedDp)) setDataPeriod(savedDp);
        if (savedWp && ['5d', '20d', '60d', '120d', '252d'].includes(savedWp)) setPeriod(savedWp);
      } catch {}

      // Try health check, but load data regardless (with retry)
      let ok = false;
      try {
        ok = await api.health();
      } catch {}
      setServerOk(ok);

      // signals includes calendar + flips data bundled together
      loadSignals();
      loadMarketIndices();
      loadRecentSearches();

      // If health failed, retry once after 3s
      if (!ok) {
        setTimeout(async () => {
          try {
            const retry = await api.health();
            setServerOk(retry);
          } catch {}
        }, 3000);
      }
    }
    init();
    return subscribe(() => setWatchlist(getWatchlist()));
  }, []);

  const [shareMsg, setShareMsg] = useState('');

  const shareSignal = async (sig: SignalItem) => {
    const wr = getWinRateForPeriod(sig, period);
    const avgRet = getAvgReturnForPeriod(sig, period);
    const dir = sig.change_pct >= 0 ? '+' : '';
    const text = [
      `📊 ${sig.ticker}${sig.name ? ` - ${sig.name}` : ''}`,
      `$${sig.price.toFixed(2)} (${dir}${sig.change_pct.toFixed(1)}%)`,
      `Win Rate (${PERIOD_LABELS[period]}): ${wr.toFixed(0)}%`,
      avgRet ? `Avg Return: ${avgRet >= 0 ? '+' : ''}${avgRet.toFixed(1)}%` : '',
      `Cases: ${sig.occurrences} | ${sig.sector}`,
      `Backtest: ${dataPeriod.toUpperCase()} | via Stock Scanner`,
    ].filter(Boolean).join('\n');
    await doShare(text);
  };

  const shareMarketSummary = async () => {
    if (!marketRegime || signals.length === 0) return;
    const topBull = bullish.slice(0, 5).map(s => `  ${s.ticker}: ${getWinRateForPeriod(s, period).toFixed(0)}% win`).join('\n');
    const topBear = bearish.slice(0, 5).map(s => `  ${s.ticker}: ${getWinRateForPeriod(s, period).toFixed(0)}% win`).join('\n');
    const text = [
      `📊 Market Summary (${PERIOD_LABELS[period]} window, ${dataPeriod.toUpperCase()} backtest)`,
      `Mood: ${marketRegime.mood} (${marketRegime.bullPct}% bullish)`,
      `${marketRegime.bullCount} bullish / ${marketRegime.bearCount} bearish`,
      '',
      topBull ? `Top Bullish:\n${topBull}` : '',
      topBear ? `Top Bearish:\n${topBear}` : '',
      '',
      `Scanned ${scannedCount} stocks | via Stock Scanner`,
    ].filter(Boolean).join('\n');
    await doShare(text);
  };

  const doShare = async (text: string) => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ text });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          setShareMsg('Copied!');
          setTimeout(() => setShareMsg(''), 2000);
        } else {
          window.prompt('Copy this:', text);
        }
      } else {
        await Share.share({ message: text });
      }
    } catch {}
  };

  const changeDataPeriod = (dp: string) => {
    if (dp === dataPeriod) return;
    setDataPeriod(dp);
    AsyncStorage.setItem('data_period', dp).catch(() => {});
    loadSignals(dp, true);
  };

  const loadSignals = async (dp?: string, forceRefresh = false) => {
    const usePeriod = dp ?? dataPeriod;
    setSignalsLoading(true);
    try {
      const res = await api.signals(50, usePeriod, forceRefresh);
      let sigs = res.signals;
      const mState = res.market_state ?? '';
      setMarketState(mState);

      if ((mState === 'PRE' || mState === 'AFTER') && sigs.length > 0) {
        try {
          const tickers = sigs.map(s => s.ticker);
          const live = await api.livePrices(tickers);
          if (live.prices) {
            sigs = sigs.map(s => {
              const lp = live.prices[s.ticker];
              return lp ? { ...s, price: lp.price, change_pct: lp.change_pct } : s;
            });
          }
        } catch {}
      }

      setSignals(sigs);
      setScannedCount(res.scanned);
      setSignalsUpdated(res.updated);
      if (res.calendar) {
        setCalendarEvents(res.calendar);
        const today = new Date().getDate();
        const todayHasEvents = res.calendar.some((ev: any) => {
          const d = new Date(ev.date + 'T12:00:00');
          return d.getDate() === today && d.getMonth() === new Date().getMonth();
        });
        if (todayHasEvents) setSelectedCalDay(today);
      }
      if (res.flips) setFlips(res.flips);
    } catch (e) {
      console.log('Signals load error', e);
    }
    setSignalsLoading(false);
  };

  const loadMarketIndices = async () => {
    try {
      const res = await api.livePrices(['QQQ', 'SPY']);
      if (res.prices) setMarketIndices(res.prices);
    } catch {}
  };

  const loadRecentSearches = async () => {
    try {
      const tickers = await api.recentSearches(15);
      setRecentSearches(tickers);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSignals(), loadMarketIndices(), loadRecentSearches()]);
    setRefreshing(false);
  };

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 1) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try { setResults((await api.search(text)).slice(0, 6)); } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, []);

  const goToAnalysis = (ticker: string) => router.push(`/analyze/${ticker}`);
  const handleSubmit = () => { const t = query.trim().toUpperCase(); if (t) { setQuery(''); setResults([]); goToAnalysis(t); } };

  const LEVERAGED_TICKERS = new Set(['TQQQ', 'SOXL', 'UPRO', 'TECL', 'SQQQ', 'LABU', 'TNA', 'FNGU']);

  // Market Regime: bullish vs bearish ratio across all non-leveraged signals (period-aware)
  const marketRegime = useMemo(() => {
    const nonLev = signals.filter(s => !LEVERAGED_TICKERS.has(s.ticker) && s.ticker !== 'QQQ' && s.ticker !== 'SPY');
    if (nonLev.length === 0) return null;
    const bullCount = nonLev.filter(s => getWinRateForPeriod(s, period) >= 50).length;
    const bearCount = nonLev.length - bullCount;
    const bullPct = Math.round((bullCount / nonLev.length) * 100);
    const avgWinRate = nonLev.reduce((sum, s) => sum + getWinRateForPeriod(s, period), 0) / nonLev.length;
    const mood = bullPct >= 65 ? 'Strong Bull' : bullPct >= 55 ? 'Mild Bull' : bullPct >= 45 ? 'Neutral' : bullPct >= 35 ? 'Mild Bear' : 'Strong Bear';
    return { bullCount, bearCount, bullPct, total: nonLev.length, avgWinRate: Math.round(avgWinRate), mood };
  }, [signals, period]);
  const sectorMomentum = useMemo(() => {
    const map: Record<string, { bullish: number; bearish: number; avgWinRate: number; avgChange: number }> = {};
    const uniqueSectors = [...new Set(signals.map(s => s.sector).filter(Boolean))];
    for (const sec of uniqueSectors) {
      const sectorSignals = signals.filter(s => s.sector === sec && !LEVERAGED_TICKERS.has(s.ticker));
      const bull = sectorSignals.filter(s => getWinRateForPeriod(s, period) >= 50).length;
      const bear = sectorSignals.length - bull;
      const avgWr = sectorSignals.length > 0 ? sectorSignals.reduce((sum, s) => sum + getWinRateForPeriod(s, period), 0) / sectorSignals.length : 50;
      const avgChg = sectorSignals.length > 0 ? sectorSignals.reduce((sum, s) => sum + s.change_pct, 0) / sectorSignals.length : 0;
      map[sec] = { bullish: bull, bearish: bear, avgWinRate: avgWr, avgChange: avgChg };
    }
    return map;
  }, [signals, period]);
  // Sector heatmap data: color-coded tiles
  const sectorHeatmap = useMemo(() => {
    return Object.entries(sectorMomentum)
      .filter(([sec]) => sec !== 'ETF' && sec !== 'Leveraged')
      .map(([sec, data]) => {
        const total = data.bullish + data.bearish;
        const bullPct = total > 0 ? Math.round((data.bullish / total) * 100) : 50;
        return { sector: sec, bullPct, avgWinRate: data.avgWinRate, avgChange: data.avgChange, total };
      })
      .sort((a, b) => b.avgWinRate - a.avgWinRate);
  }, [sectorMomentum]);

  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(signals.map(s => s.sector).filter(Boolean))];
    uniqueSectors.sort((a, b) => {
      const wrA = sectorMomentum[a]?.avgWinRate ?? 50;
      const wrB = sectorMomentum[b]?.avgWinRate ?? 50;
      return wrB - wrA;
    });
    return ['All', ...uniqueSectors];
  }, [signals, sectorMomentum]);
  const filtered = useMemo(() => {
    const base = activeSector && activeSector !== 'All' ? signals.filter(s => s.sector === activeSector) : signals;
    return base.filter(s => s.ticker !== 'QQQ' && s.ticker !== 'SPY' && !LEVERAGED_TICKERS.has(s.ticker));
  }, [signals, activeSector]);
  const leveraged = useMemo(() => {
    return signals.filter(s => LEVERAGED_TICKERS.has(s.ticker)).sort((a, b) => b.win_rate_20d - a.win_rate_20d);
  }, [signals]);
  const unusualVolume = useMemo(() => {
    return signals
      .filter(s => !LEVERAGED_TICKERS.has(s.ticker) && s.ticker !== 'QQQ' && s.ticker !== 'SPY' && s.volume_ratio !== undefined && (s.volume_ratio >= 2.0 || s.volume_ratio <= 0.5))
      .sort((a, b) => (b.volume_ratio ?? 1) - (a.volume_ratio ?? 1));
  }, [signals]);

  // Build calendar grid (current month view)
  const calendarGrid = useMemo(() => {
    if (calendarEvents.length === 0) return null;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = today.getDate();
    const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];

    // Map events by day-of-month
    const eventsByDay: Record<number, CalendarEvent[]> = {};
    for (const ev of calendarEvents) {
      const d = new Date(ev.date + 'T12:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(ev);
      }
    }

    // Build weeks
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    return { year, month, monthName, todayDate, weeks, eventsByDay, daysInMonth };
  }, [calendarEvents]);

  const getWinRate = useCallback((s: SignalItem) => {
    return getWinRateForPeriod(s, period);
  }, [period]);
  const getAvgRet = useCallback((s: SignalItem) => {
    return getAvgReturnForPeriod(s, period);
  }, [period]);
  const bullish = useMemo(() => {
    const items = filtered.filter(s => getWinRate(s) >= 50);
    if (sortBy === 'avg_return') return items.sort((a, b) => getAvgRet(b) - getAvgRet(a));
    if (sortBy === 'change') return items.sort((a, b) => b.change_pct - a.change_pct);
    return items.sort((a, b) => getWinRate(b) - getWinRate(a));
  }, [filtered, sortBy, getWinRate, getAvgRet]);
  const bearish = useMemo(() => {
    const items = filtered.filter(s => getWinRate(s) < 50);
    if (sortBy === 'avg_return') return items.sort((a, b) => getAvgRet(a) - getAvgRet(b));
    if (sortBy === 'change') return items.sort((a, b) => a.change_pct - b.change_pct);
    return items.sort((a, b) => getWinRate(a) - getWinRate(b));
  }, [filtered, sortBy, getWinRate]);

  return (
    <View style={s.container}>
      {/* Top loading bar (thin, non-intrusive) */}
      {signalsLoading && <TopLoadingBar color={colors.accent} bgColor={`${colors.textMuted}15`} />}

      {/* Search dropdown overlay (above everything) */}
      {results.length > 0 && (
        <View style={[s.dropdown, { top: insets.top + 100 }]}>
          {results.map((item) => (
            <Pressable
              key={item.ticker}
              style={({ pressed }) => [s.dropdownItem, pressed && { backgroundColor: colors.bgElevated }]}
              onPress={() => { setQuery(''); setResults([]); goToAnalysis(item.ticker); }}
            >
              <View style={s.dropdownItemLeft}>
                <Text style={s.dropdownTicker}>{item.ticker}</Text>
                <Text style={s.dropdownName} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={s.dropdownExchange}>{item.exchange}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ═══ SINGLE SCROLLVIEW (header + content) ═══ */}
      <ScrollView
        style={s.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        keyboardShouldPersistTaps="handled"
      >
      <View style={[s.headerBlock, { paddingTop: insets.top + 4 }]}>
        {/* Top bar */}
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <View style={[s.statusDot, { backgroundColor: serverOk === true ? colors.success : serverOk === false ? colors.error : colors.textMuted }]} />
            <Text style={s.statusText}>
              {serverOk === true ? 'Connected' : serverOk === false ? 'Offline' : '...'}
            </Text>
            {marketState ? (
              <View style={[s.marketBadge, {
                backgroundColor: marketState === 'OPEN' ? `${colors.bullish}20` :
                                 marketState === 'PRE' || marketState === 'AFTER' ? `${colors.warning}20` :
                                 `${colors.textMuted}20`
              }]}>
                <Text style={[s.marketBadgeText, {
                  color: marketState === 'OPEN' ? colors.bullish :
                         marketState === 'PRE' || marketState === 'AFTER' ? colors.warning :
                         colors.textMuted
                }]}>
                  {marketState}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={s.topBarRight}>
            <Text style={s.miniLabel}>Backtest</Text>
            <View style={s.miniPillGroup}>
              {(['1y', '3y', '5y', '10y'] as const).map(dp => (
                <Pressable key={dp} style={[s.miniPill, dataPeriod === dp && s.miniPillActiveBlue]} onPress={() => changeDataPeriod(dp)}>
                  <Text style={[s.miniPillText, dataPeriod === dp && s.miniPillTextActive]}>{dp.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.miniDivider} />
            <Text style={s.miniLabel}>Window</Text>
            <View style={s.miniPillGroup}>
              {(['5d', '20d', '60d', '120d', '252d'] as const).map(p => (
                <Pressable key={p} style={[s.miniPill, period === p && s.miniPillActiveOrange]} onPress={() => { setPeriod(p); AsyncStorage.setItem('window_period', p).catch(() => {}); }}>
                  <Text style={[s.miniPillText, period === p && s.miniPillTextActive]}>{PERIOD_LABELS[p]}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={cycleTheme}
              style={({ pressed }) => [s.themeBtn, pressed && s.themeBtnPressed]}
              accessibilityLabel={`Theme: ${themeMode}`}
              accessibilityRole="button"
            >
              {themeMode === 'light' ? (
                <SunIcon size={16} color={colors.textSecondary} />
              ) : themeMode === 'dark' ? (
                <MoonIcon size={16} color={colors.textSecondary} />
              ) : (
                <MonitorIcon size={16} color={colors.textSecondary} />
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.shareTopBtn, pressed && { opacity: 0.7 }]}
              onPress={shareMarketSummary}
            >
              <Text style={s.shareTopBtnText}>{shareMsg || 'Share'}</Text>
            </Pressable>
          </View>
        </View>

        {/* App Name + Summary */}
        <View style={s.titleRow}>
          <Text style={s.title}>Stock Scanner</Text>
          {signals.length > 0 && (
            <View style={s.summaryRow}>
              <View style={[s.summaryBadge, { backgroundColor: `${colors.bullish}15` }]}>
                <View style={[s.summaryDot, { backgroundColor: colors.bullish }]} />
                <Text style={[s.summaryText, { color: colors.bullish }]}>{bullish.length}</Text>
              </View>
              <View style={[s.summaryBadge, { backgroundColor: `${colors.bearish}15` }]}>
                <View style={[s.summaryDot, { backgroundColor: colors.bearish }]} />
                <Text style={[s.summaryText, { color: colors.bearish }]}>{bearish.length}</Text>
              </View>
            </View>
          )}
        </View>

        {/* INDEX ETF Cards (QQQ/SPY) - always show both */}
        {(signals.length > 0 || marketIndices['QQQ'] || marketIndices['SPY']) && (
          <View style={s.indexCardsRow}>
            {['QQQ', 'SPY'].map(sym => {
              const sig = signals.find(s => s.ticker === sym);
              const live = marketIndices[sym];
              const price = live?.price ?? sig?.price;
              const changePct = live?.change_pct ?? sig?.change_pct;
              if (!price && !sig) return null;
              const wr = sig ? getWinRateForPeriod(sig, period) : null;
              const avgRet = sig ? getAvgReturnForPeriod(sig, period) : null;
              const color = wr !== null ? (wr >= 50 ? colors.bullish : colors.bearish) : colors.textMuted;
              const name = sym === 'QQQ' ? 'Invesco QQQ' : 'S&P 500 ETF';
              return (
                <Pressable
                  key={sym}
                  style={({ pressed }) => [
                    s.indexCard,
                    pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                  ]}
                  onPress={() => goToAnalysis(sym)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={s.indexCardTicker}>{sym}</Text>
                      <Text style={s.indexCardName}>{name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {price ? <Text style={s.indexCardPrice}>${price.toFixed(2)}</Text> : null}
                      {changePct !== undefined ? (
                        <Text style={[s.indexCardChange, { color: getDirectionColor(changePct, colors) }]}>
                          {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[s.indexCardDivider, { backgroundColor: `${color}30` }]} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                    <View style={{ alignItems: 'center' }}>
                      {wr !== null ? (
                        <Text style={[s.indexCardWinRate, { color }]}>{wr.toFixed(0)}%</Text>
                      ) : (
                        <Text style={[s.indexCardWinRate, { color: colors.textMuted }]}>--</Text>
                      )}
                      <Text style={s.indexCardLabel}>Win Rate</Text>
                    </View>
                    {avgRet !== null && avgRet !== 0 ? (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[s.indexCardAvg, { color: avgRet >= 0 ? colors.bullish : colors.bearish }]}>
                          {avgRet >= 0 ? '+' : ''}{avgRet.toFixed(1)}%
                        </Text>
                        <Text style={s.indexCardLabel}>Avg Return</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[s.indexCardAvg, { color: colors.textMuted }]}>--</Text>
                        <Text style={s.indexCardLabel}>Avg Return</Text>
                      </View>
                    )}
                    <View style={{ alignItems: 'center' }}>
                      <Text style={s.indexCardCases}>{sig?.occurrences ?? '--'}</Text>
                      <Text style={s.indexCardLabel}>Cases</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Market Regime Bar */}
        {marketRegime && (
          <View style={s.regimeBar}>
            <View style={s.regimeHeader}>
              <Text style={s.regimeTitle}>MARKET MOOD ({PERIOD_LABELS[period]})</Text>
              <Text style={[s.regimeMood, {
                color: marketRegime.bullPct >= 55 ? colors.bullish : marketRegime.bullPct <= 45 ? colors.bearish : colors.textSecondary
              }]}>{marketRegime.mood}</Text>
            </View>
            <View style={s.regimeTrack}>
              <View style={[s.regimeFill, {
                width: `${marketRegime.bullPct}%`,
                backgroundColor: colors.bullish,
              }]} />
            </View>
            <View style={s.regimeLabels}>
              <Text style={[s.regimeStat, { color: colors.bullish }]}>{marketRegime.bullCount} Bullish</Text>
              <Text style={s.regimePct}>{marketRegime.bullPct}%</Text>
              <Text style={[s.regimeStat, { color: colors.bearish }]}>{marketRegime.bearCount} Bearish</Text>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={{ zIndex: 10, position: 'relative', marginTop: 10 }}>
          <View style={s.searchContainer}>
            <View style={s.searchIcon}><SearchIcon size={15} color={colors.textMuted} /></View>
            <TextInput
              style={s.searchInput}
              placeholder="Search ticker or company..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={handleSearch}
              onSubmitEditing={handleSubmit}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
            />
            {loading && <ActivityIndicator size="small" color={colors.accent} />}
            {query.length > 0 && !loading && (
              <Pressable onPress={() => { setQuery(''); setResults([]); }}>
                <Text style={s.clearBtn}>{'\u2715'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

        {/* Recently Searched + Saved */}
        {(() => {
          const visible = recentSearches.filter(t => !dismissedSearches.has(t));
          const hasSearched = visible.length > 0;
          const hasSaved = watchlist.length > 0;
          if (!hasSearched && !hasSaved) return null;
          return (
            <View style={s.section}>
              {hasSearched && (
                <>
                  <View style={s.sectionHeader}>
                    <View style={[s.sectionDot, { backgroundColor: colors.warning }]} />
                    <Text style={s.sectionLabel}>SEARCHED</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {visible.slice(0, 10).map(ticker => (
                      <View key={ticker} style={s.searchedChipWrap}>
                        <Pressable
                          style={({ pressed }) => [s.searchedChip, pressed && { backgroundColor: colors.bgElevated }]}
                          onPress={() => goToAnalysis(ticker)}
                        >
                          <Text style={s.searchedChipText}>{ticker}</Text>
                        </Pressable>
                        <Pressable
                          style={s.searchedDismiss}
                          onPress={() => setDismissedSearches(prev => new Set([...prev, ticker]))}
                          hitSlop={6}
                        >
                          <Text style={s.searchedDismissText}>{'\u2715'}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
              {hasSaved && (
                <>
                  <View style={[s.sectionHeader, hasSearched && { marginTop: 8 }]}>
                    <View style={[s.sectionDot, { backgroundColor: colors.accent }]} />
                    <Text style={s.sectionLabel}>SAVED</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {watchlist.map((ticker) => (
                      <Pressable
                        key={ticker}
                        style={({ pressed }) => [s.watchlistChip, pressed && { transform: [{ scale: 0.95 }], backgroundColor: colors.bgElevated }]}
                        onPress={() => goToAnalysis(ticker)}
                        onLongPress={() => removeFromWatchlist(ticker)}
                      >
                        <Text style={s.watchlistChipText}>{ticker}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          );
        })()}

        {/* Sector Filter */}
        {signals.length > 0 && sectors.length > 1 && (
          <View style={[s.section, { marginBottom: 0 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sectors.map(sec => {
                const isActive = (activeSector ?? 'All') === sec;
                const momentum = sectorMomentum[sec];
                return (
                  <Pressable
                    key={sec}
                    style={[s.sectorChip, isActive && s.sectorChipActive]}
                    onPress={() => setActiveSector(sec)}
                  >
                    <Text style={[s.sectorChipText, isActive && s.sectorChipTextActive]}>
                      {sec === 'All' ? `All (${signals.length})` : sec}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Sort Options */}
        {signals.length > 0 && (
          <View style={s.sortRow}>
            <Text style={s.sortLabel}>Sort</Text>
            {([
              { key: 'win_rate', label: 'Win Rate' },
              { key: 'avg_return', label: 'Avg Return' },
              { key: 'change', label: 'Change %' },
            ] as const).map(opt => (
              <Pressable
                key={opt.key}
                style={[s.sortPill, sortBy === opt.key && s.sortPillActive]}
                onPress={() => setSortBy(opt.key)}
              >
                <Text style={[s.sortPillText, sortBy === opt.key && s.sortPillTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Signal Flips */}
        {flips.length > 0 && (
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
                    cardStyles(colors).card,
                    { borderLeftColor: flip.direction === 'bullish' ? colors.bullish : colors.bearish },
                    pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                  ]}
                  onPress={() => goToAnalysis(flip.ticker)}
                >
                  <View style={cardStyles(colors).topRow}>
                    <Text style={cardStyles(colors).ticker}>{flip.ticker}</Text>
                    <Text style={[cardStyles(colors).change, { color: getDirectionColor(flip.change_pct, colors) }]}>
                      {flip.change_pct >= 0 ? '+' : ''}{flip.change_pct.toFixed(1)}%
                    </Text>
                  </View>
                  {flip.name && <Text style={cardStyles(colors).companyName} numberOfLines={1}>{flip.name}</Text>}
                  <View style={cardStyles(colors).divider} />
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={s.flipArrow}>
                      <Text style={[s.flipFrom, { color: flip.direction === 'bullish' ? colors.bearish : colors.bullish }]}>
                        {flip.prev_win_rate.toFixed(0)}%
                      </Text>
                      <Text style={s.flipArrowText}>{'\u2192'}</Text>
                      <Text style={[s.flipTo, { color: flip.direction === 'bullish' ? colors.bullish : colors.bearish }]}>
                        {flip.curr_win_rate.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={[s.flipBadge, {
                      backgroundColor: flip.direction === 'bullish' ? `${colors.bullish}20` : `${colors.bearish}20`,
                    }]}>
                      <Text style={[s.flipBadgeText, {
                        color: flip.direction === 'bullish' ? colors.bullish : colors.bearish,
                      }]}>
                        {flip.direction === 'bullish' ? 'NOW BULL' : 'NOW BEAR'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bullish Signals */}
        {bullish.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: colors.bullish }]} />
              <Text style={s.sectionLabel}>BULLISH</Text>
              <Text style={s.sectionCount}>{bullish.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {bullish.map((sig) => (
                <SignalCard key={sig.ticker} sig={sig} colors={colors} bullishColor={colors.bullish} onPress={() => goToAnalysis(sig.ticker)} onLongPress={() => shareSignal(sig)} period={period} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bearish Signals */}
        {bearish.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: colors.bearish }]} />
              <Text style={s.sectionLabel}>BEARISH</Text>
              <Text style={s.sectionCount}>{bearish.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {bearish.map((sig) => (
                <SignalCard key={sig.ticker} sig={sig} colors={colors} bullishColor={colors.bearish} onPress={() => goToAnalysis(sig.ticker)} onLongPress={() => shareSignal(sig)} period={period} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sector Heatmap */}
        {sectorHeatmap.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: colors.accent }]} />
              <Text style={s.sectionLabel}>SECTOR HEATMAP</Text>
            </View>
            <View style={s.heatmapGrid}>
              {sectorHeatmap.map(({ sector, bullPct, avgWinRate, avgChange, total }) => {
                const isHot = avgWinRate >= 55;
                const isCold = avgWinRate < 45;
                const tileColor = isHot ? colors.bullish : isCold ? colors.bearish : colors.textMuted;
                const bgOpacity = Math.min(Math.abs(avgWinRate - 50) / 25, 1) * 0.25;
                return (
                  <Pressable
                    key={sector}
                    style={({ pressed }) => [
                      s.heatmapTile,
                      { backgroundColor: `${tileColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`, borderColor: `${tileColor}40` },
                      pressed && { transform: [{ scale: 0.96 }], opacity: 0.8 },
                    ]}
                    onPress={() => setActiveSector(sector)}
                  >
                    <Text style={[s.heatmapSector, { color: colors.textPrimary }]} numberOfLines={1}>{sector}</Text>
                    <Text style={[s.heatmapWr, { color: tileColor }]}>{avgWinRate.toFixed(0)}%</Text>
                    <Text style={[s.heatmapChange, { color: getDirectionColor(avgChange, colors) }]}>
                      {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%
                    </Text>
                    <Text style={s.heatmapCount}>{total} stocks</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Leveraged ETFs */}
        {leveraged.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: colors.warning }]} />
              <Text style={s.sectionLabel}>LEVERAGED ETF</Text>
              <Text style={s.sectionCount}>{leveraged.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {leveraged.map((sig) => {
                const wr = getWinRateForPeriod(sig, period);
                const leveragedColor = wr >= 50 ? colors.bullish : colors.bearish;
                return (
                  <SignalCard key={sig.ticker} sig={sig} colors={colors} bullishColor={leveragedColor} onPress={() => goToAnalysis(sig.ticker)} onLongPress={() => shareSignal(sig)} period={period} />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Unusual Volume */}
        {unusualVolume.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={s.sectionLabel}>UNUSUAL VOLUME</Text>
              <Text style={s.sectionCount}>{unusualVolume.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {unusualVolume.map((sig) => {
                const wr = getWinRateForPeriod(sig, period);
                const volColor = wr >= 50 ? colors.bullish : colors.bearish;
                return (
                  <Pressable
                    key={sig.ticker}
                    style={({ pressed }) => [
                      cardStyles(colors).card,
                      { borderLeftColor: '#8B5CF6' },
                      pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                    ]}
                    onPress={() => goToAnalysis(sig.ticker)}
                  >
                    <View style={cardStyles(colors).topRow}>
                      <Text style={cardStyles(colors).ticker}>{sig.ticker}</Text>
                      <Text style={[cardStyles(colors).change, { color: getDirectionColor(sig.change_pct, colors) }]}>
                        {sig.change_pct >= 0 ? '+' : ''}{sig.change_pct.toFixed(1)}%
                      </Text>
                    </View>
                    {sig.name && <Text style={cardStyles(colors).companyName} numberOfLines={1}>{sig.name}</Text>}
                    <View style={cardStyles(colors).priceRow}>
                      <Text style={cardStyles(colors).price}>${sig.price.toFixed(2)}</Text>
                    </View>
                    <View style={cardStyles(colors).divider} />
                    <View style={[cardStyles(colors).avgBadge, {
                      backgroundColor: (sig.volume_ratio ?? 1) >= 2.0 ? '#8B5CF620' : `${colors.warning}20`,
                      alignSelf: 'center',
                      marginBottom: 4,
                    }]}>
                      <Text style={[cardStyles(colors).avgText, {
                        color: (sig.volume_ratio ?? 1) >= 2.0 ? '#8B5CF6' : colors.warning,
                        fontSize: 14,
                        fontWeight: '800',
                      }]}>
                        Vol {(sig.volume_ratio ?? 1).toFixed(1)}x
                      </Text>
                    </View>
                    <Text style={[cardStyles(colors).winRate, { color: volColor, fontSize: 22 }]}>
                      {wr.toFixed(0)}%
                    </Text>
                    <Text style={cardStyles(colors).probLabel}>Win Rate</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Market Calendar - Grid */}
        {calendarGrid && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={s.sectionLabel}>MARKET CALENDAR</Text>
              <Text style={s.sectionCount}>{calendarGrid.monthName} {calendarGrid.year}</Text>
            </View>
            <View style={s.calGrid}>
              {/* Weekday headers */}
              <View style={s.calWeekRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <View key={i} style={s.calHeaderCell}>
                    <Text style={[s.calHeaderText, (i === 0 || i === 6) && { color: colors.textMuted }]}>{d}</Text>
                  </View>
                ))}
              </View>
              {/* Week rows */}
              {calendarGrid.weeks.map((week, wi) => (
                <View key={wi} style={s.calWeekRow}>
                  {week.map((day, di) => {
                    const events = day ? (calendarGrid.eventsByDay[day] || []) : [];
                    const isToday = day === calendarGrid.todayDate;
                    const isPast = day !== null && day < calendarGrid.todayDate;
                    const isSelected = day === selectedCalDay;
                    const hasHigh = events.some(e => e.impact === 'high');
                    const typeColors: Record<string, string> = {
                      FOMC: '#EF4444', CPI: '#F59E0B', PPI: '#F97316',
                      PMI: '#8B5CF6', NFP: '#3B82F6', EARNINGS: '#10B981',
                    };
                    return (
                      <Pressable
                        key={di}
                        style={[
                          s.calDayCell,
                          isToday && s.calDayCellToday,
                          isSelected && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
                          isPast && { opacity: 0.4 },
                        ]}
                        onPress={day && events.length > 0 ? () => setSelectedCalDay(isSelected ? null : day) : undefined}
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
                                {ev.type === 'EARNINGS' ? (ev.ticker || 'EARN') : ev.type}
                              </Text>
                            ))}
                            {events.length > 2 && (
                              <Text style={s.calMoreTag}>+{events.length - 2}</Text>
                            )}
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
                {calendarGrid.eventsByDay[selectedCalDay].map((ev, i) => {
                  const typeColors: Record<string, string> = {
                    FOMC: '#EF4444', CPI: '#F59E0B', PPI: '#F97316',
                    PMI: '#8B5CF6', NFP: '#3B82F6', EARNINGS: '#10B981',
                  };
                  const evColor = typeColors[ev.type] || colors.textMuted;
                  return (
                    <Pressable
                      key={`${ev.type}-${i}`}
                      style={({ pressed }) => [s.calDetailRow, pressed && ev.ticker && { opacity: 0.7 }]}
                      onPress={ev.ticker ? () => goToAnalysis(ev.ticker!) : undefined}
                    >
                      <View style={s.calDetailLeft}>
                        <View style={[s.calDetailBadge, { backgroundColor: `${evColor}20` }]}>
                          <Text style={[s.calDetailType, { color: evColor }]}>{ev.type}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.calDetailLabel} numberOfLines={1}>{ev.label}</Text>
                          {ev.desc ? <Text style={s.calDetailDesc} numberOfLines={2}>{ev.desc}</Text> : null}
                        </View>
                      </View>
                      {(ev.avg_move || ev.bullish_pct) && (
                        <View style={s.calDetailStats}>
                          {ev.avg_move ? (
                            <Text style={s.calDetailMove}>±{ev.avg_move.toFixed(1)}%</Text>
                          ) : null}
                          {ev.bullish_pct ? (
                            <Text style={[s.calDetailBull, { color: ev.bullish_pct >= 50 ? colors.bullish : colors.bearish }]}>
                              {ev.bullish_pct}% bull
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
            {/* Legend */}
            <View style={s.calLegend}>
              {[
                { type: 'FOMC', color: '#EF4444' }, { type: 'CPI', color: '#F59E0B' },
                { type: 'PPI', color: '#F97316' }, { type: 'PMI', color: '#8B5CF6' },
                { type: 'NFP', color: '#3B82F6' }, { type: 'EARN', color: '#10B981' },
              ].map(({ type, color }) => (
                <View key={type} style={s.calLegendItem}>
                  <View style={[s.calDot, { backgroundColor: color }]} />
                  <Text style={s.calLegendText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Scan info */}
        {signalsUpdated ? (
          <View style={s.scanInfo}>
            <Text style={s.scanInfoText}>
              Scanned {scannedCount} stocks  |  {dataPeriod.toUpperCase()} data  |  Updated {signalsUpdated}
            </Text>
          </View>
        ) : null}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  // ═══ HEADER BLOCK ═══
  headerBlock: {
    backgroundColor: c.bgCard,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: c.textTertiary, fontSize: 10, fontWeight: '500' },
  marketBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  marketBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniLabel: { color: c.textMuted, fontSize: 7, fontWeight: '800', letterSpacing: 0.3 },
  miniPillGroup: { flexDirection: 'row', gap: 1 },
  miniPill: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  miniPillActiveBlue: { backgroundColor: c.accent },
  miniPillActiveOrange: { backgroundColor: c.warning },
  miniPillText: { color: c.textMuted, fontSize: 8, fontWeight: '600' },
  miniPillTextActive: { color: '#fff', fontWeight: '800' },
  miniDivider: { width: 1, height: 12, backgroundColor: c.border },
  themeBtn: { padding: 6, borderRadius: 6 },
  themeBtnPressed: { backgroundColor: c.bgElevated },
  shareTopBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border,
  },
  shareTopBtnText: { color: c.textSecondary, fontSize: 10, fontWeight: '600' },

  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 2,
  },
  title: { color: c.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  summaryRow: { flexDirection: 'row', gap: 6 },
  summaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  summaryDot: { width: 5, height: 5, borderRadius: 3 },
  summaryText: { fontSize: 12, fontWeight: '700' },

  // ═══ MARKET INDICES ═══
  indexCardsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  indexCard: {
    flex: 1, backgroundColor: c.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: `${c.accent}30`,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  indexCardTicker: { color: c.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  indexCardName: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginTop: 1 },
  indexCardPrice: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
  indexCardChange: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  indexCardDivider: { height: 1, marginVertical: 10 },
  indexCardWinRate: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  indexCardAvg: { fontSize: 14, fontWeight: '700' },
  indexCardCases: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  indexCardLabel: { color: c.textMuted, fontSize: 8, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },
  // ═══ SEARCHED ═══
  searchedChipWrap: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
  searchedChip: {
    backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: c.border,
  },
  searchedChipText: { color: c.textPrimary, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  searchedDismiss: { marginLeft: -8, paddingHorizontal: 4, paddingVertical: 2 },
  searchedDismissText: { color: c.textMuted, fontSize: 10 },

  // ═══ SEARCH ═══
  searchWrapper: { zIndex: 10, position: 'relative', marginTop: 10 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgElevated, borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 42, color: c.textPrimary, fontSize: 14 },
  clearBtn: { color: c.textMuted, fontSize: 14, padding: 4 },

  dropdown: {
    position: 'absolute', left: spacing.lg, right: spacing.lg,
    backgroundColor: c.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.border, maxHeight: 320,
    elevation: 20, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12,
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  dropdownItemLeft: { flex: 1, marginRight: spacing.sm },
  dropdownTicker: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
  dropdownName: { color: c.textTertiary, fontSize: 11, marginTop: 1 },
  dropdownExchange: { color: c.textMuted, fontSize: 10 },

  // ═══ CONTENT ═══
  mainScroll: { flex: 1 },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { color: c.textTertiary, ...typography.label, flex: 1, textTransform: 'uppercase' },
  sectionCount: { color: c.textMuted, fontSize: 12, fontWeight: '600' },

  watchlistChip: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: c.border, marginRight: spacing.sm,
  },
  watchlistChipText: { color: c.textPrimary, ...typography.bodyBold, letterSpacing: 0.5 },

  sectorChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border, marginRight: 6,
  },
  sectorChipActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  sectorChipText: { color: c.textMuted, fontSize: 11, fontWeight: '500' },
  sectorChipTextActive: { color: c.accent, fontWeight: '700' },

  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  sortLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', marginRight: 2 },
  sortPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border,
  },
  sortPillActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  sortPillText: { color: c.textMuted, fontSize: 10, fontWeight: '500' },
  sortPillTextActive: { color: c.accent, fontWeight: '700' },

  scanInfo: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  scanInfoText: { color: c.textMuted, fontSize: 10, letterSpacing: 0.3 },

  // ═══ MARKET REGIME ═══
  regimeBar: {
    marginTop: 10, backgroundColor: c.bgElevated, borderRadius: radius.md,
    padding: spacing.sm, paddingHorizontal: spacing.md,
  },
  regimeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  regimeTitle: { color: c.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  regimeMood: { fontSize: 11, fontWeight: '800' },
  regimeTrack: {
    height: 6, borderRadius: 3, backgroundColor: `${c.bearish}30`,
    overflow: 'hidden' as const,
  },
  regimeFill: { height: '100%', borderRadius: 3 },
  regimeLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4,
  },
  regimeStat: { fontSize: 10, fontWeight: '600' },
  regimePct: { color: c.textMuted, fontSize: 10, fontWeight: '700' },

  // ═══ SECTOR HEATMAP ═══
  heatmapGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  heatmapTile: {
    flexBasis: '30%' as any, flexGrow: 1,
    borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, alignItems: 'center' as const, minWidth: 90, maxWidth: '48%' as any,
  },
  heatmapSector: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  heatmapWr: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  heatmapChange: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  heatmapCount: { color: c.textMuted, fontSize: 8, fontWeight: '500', marginTop: 2 },

  // ═══ SIGNAL FLIP ═══
  flipArrow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  flipFrom: { fontSize: 16, fontWeight: '700' },
  flipArrowText: { fontSize: 14, color: c.textMuted },
  flipTo: { fontSize: 20, fontWeight: '800' },
  flipBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
    marginTop: 2,
  },
  flipBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // ═══ MARKET CALENDAR (Grid) ═══
  calGrid: {
    backgroundColor: c.bgElevated, borderRadius: radius.md,
    padding: spacing.sm, overflow: 'hidden' as const,
  },
  calWeekRow: { flexDirection: 'row' },
  calHeaderCell: {
    flex: 1, alignItems: 'center' as const, paddingVertical: 4,
  },
  calHeaderText: { color: c.textTertiary, fontSize: 11, fontWeight: '700' },
  calDayCell: {
    flex: 1, alignItems: 'center' as const, justifyContent: 'flex-start' as const,
    minHeight: 62, paddingVertical: 3, paddingHorizontal: 1, borderRadius: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  calDayCellToday: {
    backgroundColor: `${c.warning}12`, borderColor: `${c.warning}40`,
  },
  calDayNum: { color: c.textPrimary, fontSize: 14, fontWeight: '600' },
  calEventTag: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2, marginTop: 1, textAlign: 'center' as const },
  calMoreTag: { color: c.textMuted, fontSize: 7, fontWeight: '600', marginTop: 1 },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  calDetail: {
    marginTop: spacing.sm, backgroundColor: c.bgCard,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: c.border,
  },
  calDetailDate: { color: c.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  calDetailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  calDetailLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  calDetailBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 1 },
  calDetailType: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  calDetailLabel: { color: c.textPrimary, fontSize: 13, fontWeight: '600' },
  calDetailDesc: { color: c.textMuted, fontSize: 10, fontWeight: '400', marginTop: 2 },
  calDetailStats: { alignItems: 'flex-end' as const, marginLeft: 8 },
  calDetailMove: { color: c.textSecondary, fontSize: 13, fontWeight: '800' },
  calDetailBull: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  calLegend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8,
    paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calLegendText: { color: c.textMuted, fontSize: 9, fontWeight: '600' },
});

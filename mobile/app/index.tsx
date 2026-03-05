import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { initServerUrl } from '../src/api/client';
import type { EarningsItem, SearchResult, SignalItem } from '../src/types/analysis';
import { getWatchlist, removeFromWatchlist, subscribe, initWatchlist } from '../src/store/watchlist';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../src/theme';
import { SunIcon, MoonIcon, MonitorIcon, SearchIcon } from '../src/components/ThemeIcons';

const PERIOD_LABELS: Record<string, string> = { '5d': '1W', '20d': '1M', '60d': '3M' };

function SignalCard({ sig, colors, bullishColor, onPress, period = '20d' }: {
  sig: SignalItem;
  colors: ThemeColors;
  bullishColor: string;
  onPress: () => void;
  period?: '5d' | '20d' | '60d';
}) {
  const winRate = period === '5d' ? sig.win_rate_5d : period === '60d' ? sig.win_rate_60d : sig.win_rate_20d;
  const avgReturn = period === '5d' ? (sig.avg_return_5d ?? sig.avg_return_20d) : period === '60d' ? (sig.avg_return_60d ?? sig.avg_return_20d) : sig.avg_return_20d;
  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles(colors).card,
        { borderLeftColor: bullishColor },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}
      onPress={onPress}
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
            Win Rate ({PERIOD_LABELS[period]}){sig.occurrences < 5 ? ' *' : ''}
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
  const [period, setPeriod] = useState<'5d' | '20d' | '60d'>('20d');
  const [marketIndices, setMarketIndices] = useState<Record<string, { price: number; change_pct: number }>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [dismissedSearches, setDismissedSearches] = useState<Set<string>>(new Set());
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    async function init() {
      await initServerUrl();
      await initWatchlist();
      setWatchlist(getWatchlist());
      const ok = await api.health();
      setServerOk(ok);
      if (ok) {
        loadSignals();
        loadMarketIndices();
        loadRecentSearches();
        loadEarnings();
      }
    }
    init();
    return subscribe(() => setWatchlist(getWatchlist()));
  }, []);

  const loadSignals = async () => {
    setSignalsLoading(true);
    try {
      const res = await api.signals(101);
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

  const loadEarnings = async () => {
    try {
      const res = await api.earningsCalendar();
      setEarnings(res.earnings || []);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSignals(), loadMarketIndices(), loadRecentSearches(), loadEarnings()]);
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
  const sectorMomentum = useMemo(() => {
    const map: Record<string, { bullish: number; bearish: number; avgWinRate: number; avgChange: number }> = {};
    const uniqueSectors = [...new Set(signals.map(s => s.sector).filter(Boolean))];
    for (const sec of uniqueSectors) {
      const sectorSignals = signals.filter(s => s.sector === sec && !LEVERAGED_TICKERS.has(s.ticker));
      const bull = sectorSignals.filter(s => s.win_rate_20d >= 50).length;
      const bear = sectorSignals.length - bull;
      const avgWr = sectorSignals.length > 0 ? sectorSignals.reduce((sum, s) => sum + s.win_rate_20d, 0) / sectorSignals.length : 50;
      const avgChg = sectorSignals.length > 0 ? sectorSignals.reduce((sum, s) => sum + s.change_pct, 0) / sectorSignals.length : 0;
      map[sec] = { bullish: bull, bearish: bear, avgWinRate: avgWr, avgChange: avgChg };
    }
    return map;
  }, [signals]);
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
  const getWinRate = useCallback((s: SignalItem) => {
    return period === '5d' ? s.win_rate_5d : period === '60d' ? s.win_rate_60d : s.win_rate_20d;
  }, [period]);
  const bullish = useMemo(() => {
    const items = filtered.filter(s => getWinRate(s) >= 50);
    if (sortBy === 'avg_return') return items.sort((a, b) => (b.avg_return_20d ?? 0) - (a.avg_return_20d ?? 0));
    if (sortBy === 'change') return items.sort((a, b) => b.change_pct - a.change_pct);
    return items.sort((a, b) => getWinRate(b) - getWinRate(a));
  }, [filtered, sortBy, getWinRate]);
  const bearish = useMemo(() => {
    const items = filtered.filter(s => getWinRate(s) < 50);
    if (sortBy === 'avg_return') return items.sort((a, b) => (a.avg_return_20d ?? 0) - (b.avg_return_20d ?? 0));
    if (sortBy === 'change') return items.sort((a, b) => a.change_pct - b.change_pct);
    return items.sort((a, b) => getWinRate(a) - getWinRate(b));
  }, [filtered, sortBy, getWinRate]);

  return (
    <View style={s.container}>
      {/* ═══ SCROLLABLE CONTENT (header + all sections) ═══ */}
      <ScrollView
        style={s.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        keyboardShouldPersistTaps="handled"
      >
      {/* ═══ HEADER BLOCK ═══ */}
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
        </View>

        {/* App Name + Title + Summary */}
        <Text style={s.appName}>Stock Scanner</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>NASDAQ 100</Text>
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

        {/* INDEX ETF Cards (QQQ/SPY) */}
        {(() => {
          const etfs = signals.filter(s => s.ticker === 'QQQ' || s.ticker === 'SPY');
          // Fall back to simple price chips if signals haven't loaded yet
          if (etfs.length === 0 && (marketIndices['QQQ'] || marketIndices['SPY'])) {
            return (
              <View style={s.indicesRow}>
                {['QQQ', 'SPY'].map(sym => {
                  const idx = marketIndices[sym];
                  if (!idx) return null;
                  const color = idx.change_pct >= 0 ? colors.bullish : colors.bearish;
                  return (
                    <Pressable key={sym} style={s.indexChip} onPress={() => goToAnalysis(sym)}>
                      <Text style={s.indexLabel}>{sym}</Text>
                      <Text style={s.indexPrice}>${idx.price.toFixed(2)}</Text>
                      <Text style={[s.indexChange, { color }]}>
                        {idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          }
          if (etfs.length === 0) return null;
          return (
            <View style={s.indexCardsRow}>
              {etfs.map(sig => {
                const liveData = marketIndices[sig.ticker];
                const price = liveData?.price ?? sig.price;
                const changePct = liveData?.change_pct ?? sig.change_pct;
                const color = sig.win_rate_20d >= 50 ? colors.bullish : colors.bearish;
                const name = sig.ticker === 'QQQ' ? 'Invesco QQQ' : sig.ticker === 'SPY' ? 'S&P 500 ETF' : sig.name;
                return (
                  <Pressable
                    key={sig.ticker}
                    style={({ pressed }) => [
                      s.indexCard,
                      pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                    ]}
                    onPress={() => goToAnalysis(sig.ticker)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={s.indexCardTicker}>{sig.ticker}</Text>
                        <Text style={s.indexCardName}>{name}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.indexCardPrice}>${price.toFixed(2)}</Text>
                        <Text style={[s.indexCardChange, { color: getDirectionColor(changePct, colors) }]}>
                          {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                    <View style={[s.indexCardDivider, { backgroundColor: `${color}30` }]} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[s.indexCardWinRate, { color }]}>{sig.win_rate_20d.toFixed(0)}%</Text>
                        <Text style={s.indexCardLabel}>1M Win</Text>
                      </View>
                      {sig.avg_return_20d !== undefined && sig.avg_return_20d !== 0 && (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={[s.indexCardAvg, { color: sig.avg_return_20d >= 0 ? colors.bullish : colors.bearish }]}>
                            {sig.avg_return_20d >= 0 ? '+' : ''}{sig.avg_return_20d.toFixed(1)}%
                          </Text>
                          <Text style={s.indexCardLabel}>Avg Return</Text>
                        </View>
                      )}
                      <View style={{ alignItems: 'center' }}>
                        <Text style={s.indexCardCases}>{sig.occurrences}</Text>
                        <Text style={s.indexCardLabel}>Cases</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })()}

        {/* Search */}
        <View style={s.searchWrapper}>
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
          {results.length > 0 && (
            <View style={s.dropdown}>
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
        </View>
      </View>

        {/* Recently Searched */}
        {(() => {
          const visible = recentSearches.filter(t => !dismissedSearches.has(t));
          if (visible.length === 0) return null;
          return (
            <View style={s.section}>
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
            </View>
          );
        })()}

        {/* Watchlist */}
        {watchlist.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
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
          </View>
        )}

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

        {/* Sort + Period Options */}
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
            <View style={s.sortDivider} />
            {([
              { key: '5d', label: '1W' },
              { key: '20d', label: '1M' },
              { key: '60d', label: '3M' },
            ] as const).map(opt => (
              <Pressable
                key={opt.key}
                style={[s.sortPill, period === opt.key && s.periodPillActive]}
                onPress={() => setPeriod(opt.key)}
              >
                <Text style={[s.sortPillText, period === opt.key && s.periodPillTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Loading skeleton */}
        {signalsLoading && signals.length === 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>LOADING...</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[cardStyles(colors).card, { opacity: 0.3, borderLeftColor: colors.textMuted }]}>
                  <View style={{ width: 50, height: 14, borderRadius: 4, backgroundColor: colors.bgElevated, marginBottom: 8 }} />
                  <View style={{ width: 70, height: 24, borderRadius: 4, backgroundColor: colors.bgElevated }} />
                </View>
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
                <SignalCard key={sig.ticker} sig={sig} colors={colors} bullishColor={colors.bullish} onPress={() => goToAnalysis(sig.ticker)} period={period} />
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
                <SignalCard key={sig.ticker} sig={sig} colors={colors} bullishColor={colors.bearish} onPress={() => goToAnalysis(sig.ticker)} period={period} />
              ))}
            </ScrollView>
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
                const wr = period === '5d' ? sig.win_rate_5d : period === '60d' ? sig.win_rate_60d : sig.win_rate_20d;
                const leveragedColor = wr >= 50 ? colors.bullish : colors.bearish;
                return (
                  <SignalCard key={sig.ticker} sig={sig} colors={colors} bullishColor={leveragedColor} onPress={() => goToAnalysis(sig.ticker)} period={period} />
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
                const wr = period === '5d' ? sig.win_rate_5d : period === '60d' ? sig.win_rate_60d : sig.win_rate_20d;
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

        {/* Earnings This Week */}
        {earnings.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={s.sectionLabel}>EARNINGS THIS WEEK</Text>
              <Text style={s.sectionCount}>{earnings.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {earnings.map((item) => (
                <Pressable
                  key={item.ticker}
                  style={({ pressed }) => [
                    cardStyles(colors).card,
                    { borderLeftColor: '#F59E0B' },
                    pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                  ]}
                  onPress={() => goToAnalysis(item.ticker)}
                >
                  <View style={cardStyles(colors).topRow}>
                    <Text style={cardStyles(colors).ticker}>{item.ticker}</Text>
                    <View style={{
                      backgroundColor: item.time_of_day === 'BMO' ? `${colors.warning}25` : `${colors.accent}25`,
                      paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: item.time_of_day === 'BMO' ? colors.warning : colors.accent }}>
                        {item.time_of_day || '?'}
                      </Text>
                    </View>
                  </View>
                  <Text style={cardStyles(colors).companyName} numberOfLines={1}>{item.name}</Text>
                  {item.price != null && (
                    <View style={cardStyles(colors).priceRow}>
                      <Text style={cardStyles(colors).price}>${item.price.toFixed(2)}</Text>
                      {item.change_pct != null && (
                        <Text style={[cardStyles(colors).change, { color: getDirectionColor(item.change_pct, colors) }]}>
                          {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={cardStyles(colors).divider} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#F59E0B', fontSize: 22, fontWeight: '800' }}>
                      D-{item.days_until}
                    </Text>
                    <Text style={cardStyles(colors).probLabel}>
                      {item.earnings_date}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Scan info */}
        {signalsUpdated ? (
          <View style={s.scanInfo}>
            <Text style={s.scanInfoText}>
              Scanned {scannedCount} stocks  |  Updated {signalsUpdated}
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
  themeBtn: { padding: 8, borderRadius: 6 },
  themeBtnPressed: { backgroundColor: c.bgElevated },

  appName: { color: c.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
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
  indicesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  indexChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.bgElevated, borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  indexLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
  indexPrice: { color: c.textPrimary, fontSize: 12, fontWeight: '600' },
  indexChange: { fontSize: 11, fontWeight: '700' },

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
    position: 'absolute', top: 48, left: 0, right: 0,
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
  sortDivider: { width: 1, height: 14, backgroundColor: c.border, marginHorizontal: 2 },
  periodPillActive: { backgroundColor: `${c.warning}20`, borderColor: c.warning },
  periodPillTextActive: { color: c.warning, fontWeight: '700' },

  scanInfo: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  scanInfoText: { color: c.textMuted, fontSize: 10, letterSpacing: 0.3 },
});

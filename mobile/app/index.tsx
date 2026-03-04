import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { initServerUrl } from '../src/api/client';
import type { SearchResult, SignalItem, TrendingStock } from '../src/types/analysis';
import { getWatchlist, removeFromWatchlist, subscribe, initWatchlist } from '../src/store/watchlist';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, formatVolume, getDirectionColor, type ThemeColors } from '../src/theme';

// Skeleton shimmer for loading state
function SkeletonSignalCard({ colors, index }: { colors: any; index: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true, delay: index * 80 }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 260, height: 140, borderRadius: radius.lg, marginRight: 12, padding: spacing.md,
      backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, opacity,
    }}>
      <View style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: colors.bgElevated, marginBottom: 8 }} />
      <View style={{ width: '80%', height: 10, borderRadius: 4, backgroundColor: colors.bgElevated, marginBottom: 12 }} />
      <View style={{ width: '60%', height: 20, borderRadius: 4, backgroundColor: colors.bgElevated, marginBottom: 8 }} />
      <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.bgElevated }} />
    </Animated.View>
  );
}

// Individual signal card
function SignalCard({
  signal, direction, colors, onPress,
}: {
  signal: SignalItem; direction: 'bullish' | 'bearish'; colors: any; onPress: () => void;
}) {
  const isBullish = direction === 'bullish';
  const accentColor = isBullish ? colors.bullish : colors.bearish;
  const accentBg = isBullish ? colors.bullishBg : colors.bearishBg;
  const wr20 = signal.win_rate_20d;
  const wr5 = signal.win_rate_5d;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        width: 260, borderRadius: radius.lg, padding: spacing.md,
        backgroundColor: colors.bgCard, borderWidth: 1,
        borderColor: pressed ? accentColor : colors.border,
        marginRight: 12,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }]}
    >
      {/* Top: ticker + price */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.textPrimary, ...typography.bodyBold, fontSize: 15 }}>{signal.ticker}</Text>
          {signal.sector ? (
            <Text style={{ color: colors.textMuted, fontSize: 9, fontStyle: 'italic' }}>{signal.sector}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.textPrimary, ...typography.number, fontSize: 13 }}>${signal.price.toFixed(2)}</Text>
          <Text style={{ color: getDirectionColor(signal.change_pct, colors), fontSize: 10, fontWeight: '600' }}>
            {signal.change_pct >= 0 ? '+' : ''}{signal.change_pct.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Signal type badge */}
      <View style={{
        backgroundColor: accentBg, paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: 8,
        borderWidth: 1, borderColor: `${accentColor}30`,
      }}>
        <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700' }}>
          {signal.signal_type}
        </Text>
      </View>

      {/* Win rates */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 6 }}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>5D Win</Text>
          <Text style={{ color: getWinRateColor(wr5, isBullish, colors), ...typography.numberSm, fontSize: 16, fontWeight: '700' }}>
            {wr5.toFixed(0)}%
          </Text>
        </View>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>20D Win</Text>
          <Text style={{ color: getWinRateColor(wr20, isBullish, colors), ...typography.numberSm, fontSize: 16, fontWeight: '700' }}>
            {wr20.toFixed(0)}%
          </Text>
        </View>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>Avg 20D</Text>
          <Text style={{ color: getDirectionColor(signal.avg_return_20d, colors), ...typography.numberSm, fontSize: 16, fontWeight: '700' }}>
            {signal.avg_return_20d >= 0 ? '+' : ''}{signal.avg_return_20d.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Bottom: samples + description */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 9 }}>{signal.description}</Text>
        <Text style={{ color: colors.textTertiary, fontSize: 9 }}>{signal.samples} cases</Text>
      </View>
    </Pressable>
  );
}

function getWinRateColor(wr: number, isBullish: boolean, colors: any): string {
  if (isBullish) {
    return wr >= 55 ? colors.bullish : wr >= 50 ? colors.textPrimary : colors.bearish;
  }
  // For bearish signals, low win rate = strong bearish signal
  return wr <= 45 ? colors.bearish : wr <= 50 ? colors.textPrimary : colors.bullish;
}

export default function HomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [similarTickers, setSimilarTickers] = useState<{ sector: string; tickers: string[] }>({ sector: '', tickers: [] });
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const [bullishSignals, setBullishSignals] = useState<SignalItem[]>([]);
  const [bearishSignals, setBearishSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsUpdated, setSignalsUpdated] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  // Build signal lookup for probability badges on popular stocks
  const signalLookup = useMemo(() => {
    const map = new Map<string, { win_rate_20d: number; signal_type: string }>();
    for (const sig of [...bullishSignals, ...bearishSignals]) {
      if (!map.has(sig.ticker)) {
        map.set(sig.ticker, { win_rate_20d: sig.win_rate_20d, signal_type: sig.signal_type });
      }
    }
    return map;
  }, [bullishSignals, bearishSignals]);

  useEffect(() => {
    async function init() {
      await initServerUrl();
      await initWatchlist();
      setWatchlist(getWatchlist());
      const ok = await api.health();
      setServerOk(ok);
      if (ok) {
        loadSignals();
        loadTrending();
      }
    }
    init();
    return subscribe(() => setWatchlist(getWatchlist()));
  }, []);

  const loadSignals = async () => {
    setSignalsLoading(true);
    try {
      const res = await api.signals(8);
      setBullishSignals(res.bullish);
      setBearishSignals(res.bearish);
      setScannedCount(res.scanned);
      setSignalsUpdated(res.updated);
    } catch (e) {
      console.log('Signals load error', e);
    }
    setSignalsLoading(false);
  };

  const loadTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await api.trending('change_pct', 20, 'All', 'desc');
      setTrendingStocks(res.stocks);
    } catch {}
    setTrendingLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSignals(), loadTrending()]);
    setRefreshing(false);
  };

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 1) { setResults([]); setSimilarTickers({ sector: '', tickers: [] }); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await api.search(text);
        setResults(searchResults);
        if (searchResults.length > 0) {
          api.similar(searchResults[0].ticker).then(res => {
            setSimilarTickers({ sector: res.sector, tickers: res.similar });
          }).catch(() => {});
        }
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, []);

  const goToAnalysis = (ticker: string) => router.push(`/analyze/${ticker}`);
  const handleSubmit = () => { const t = query.trim().toUpperCase(); if (t) goToAnalysis(t); };

  const renderSearchResults = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.ticker}
        style={s.resultsList}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [s.resultItem, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
            onPress={() => goToAnalysis(item.ticker)}
          >
            <View style={s.resultLeft}>
              <View style={s.tickerBadge}>
                <Text style={s.tickerBadgeText}>{item.ticker.slice(0, 2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resultTicker}>{item.ticker}</Text>
                <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
              </View>
            </View>
            <Text style={s.resultExchange}>{item.exchange}</Text>
          </Pressable>
        )}
        ListFooterComponent={similarTickers.tickers.length > 0 ? (
          <View style={s.similarSection}>
            <Text style={s.similarTitle}>
              {similarTickers.sector ? `${similarTickers.sector} peers` : `Similar to ${results[0]?.ticker}`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {similarTickers.tickers.map(t => (
                <Pressable key={t} style={s.similarChip} onPress={() => goToAnalysis(t)}>
                  <Text style={s.similarChipText}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      />
    </View>
  );

  const renderSignalsContent = () => (
    <ScrollView
      style={s.mainScroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Watchlist */}
      {watchlist.length > 0 && (
        <View style={s.sectionContainer}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>SAVED</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {watchlist.map((ticker) => (
              <Pressable
                key={ticker}
                style={({ pressed }) => [s.watchlistChip, pressed && { transform: [{ scale: 0.95 }] }]}
                onPress={() => goToAnalysis(ticker)}
                onLongPress={() => removeFromWatchlist(ticker)}
              >
                <Text style={s.watchlistChipText}>{ticker}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bullish Signals */}
      <View style={s.sectionContainer}>
        <View style={s.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[s.directionDot, { backgroundColor: colors.bullish }]} />
            <Text style={s.sectionLabel}>BULLISH SIGNALS</Text>
          </View>
          {signalsLoading && <ActivityIndicator size="small" color={colors.accent} />}
        </View>
        <Text style={s.sectionSubtitle}>
          High probability of going up based on historical patterns
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {signalsLoading && bullishSignals.length === 0
            ? [0, 1, 2].map(i => <SkeletonSignalCard key={i} colors={colors} index={i} />)
            : bullishSignals.map((sig, i) => (
                <SignalCard
                  key={`${sig.ticker}-${sig.signal_type}-${i}`}
                  signal={sig}
                  direction="bullish"
                  colors={colors}
                  onPress={() => goToAnalysis(sig.ticker)}
                />
              ))
          }
          {!signalsLoading && bullishSignals.length === 0 && (
            <View style={s.emptySignal}>
              <Text style={s.emptyText}>No strong bullish signals detected</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bearish Signals */}
      <View style={s.sectionContainer}>
        <View style={s.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[s.directionDot, { backgroundColor: colors.bearish }]} />
            <Text style={s.sectionLabel}>BEARISH SIGNALS</Text>
          </View>
        </View>
        <Text style={s.sectionSubtitle}>
          High probability of going down based on historical patterns
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {signalsLoading && bearishSignals.length === 0
            ? [0, 1, 2].map(i => <SkeletonSignalCard key={i} colors={colors} index={i + 3} />)
            : bearishSignals.map((sig, i) => (
                <SignalCard
                  key={`${sig.ticker}-${sig.signal_type}-${i}`}
                  signal={sig}
                  direction="bearish"
                  colors={colors}
                  onPress={() => goToAnalysis(sig.ticker)}
                />
              ))
          }
          {!signalsLoading && bearishSignals.length === 0 && (
            <View style={s.emptySignal}>
              <Text style={s.emptyText}>No strong bearish signals detected</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Popular Stocks with probability badges */}
      <View style={s.sectionContainer}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>POPULAR STOCKS</Text>
          {trendingLoading && <ActivityIndicator size="small" color={colors.accent} />}
        </View>

        {trendingLoading && trendingStocks.length === 0 && (
          [0, 1, 2, 3, 4].map(i => <SkeletonSignalCard key={`sk-${i}`} colors={colors} index={i + 6} />)
        )}

        {trendingStocks.map((stock, i) => {
          const mktLabel = stock.market_state === 'PRE' ? 'PRE' : (stock.market_state === 'POST' || stock.market_state === 'POSTPOST') ? 'AFTER' : '';
          const sigInfo = signalLookup.get(stock.ticker);
          return (
            <Pressable
              key={stock.ticker}
              style={({ pressed }) => [s.stockCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.8 }]}
              onPress={() => goToAnalysis(stock.ticker)}
            >
              <View style={s.stockRank}>
                <Text style={s.stockRankText}>{i + 1}</Text>
              </View>
              <View style={s.stockInfo}>
                <View style={s.stockRow1}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.stockTicker}>{stock.ticker}</Text>
                    {stock.sector ? <Text style={s.sectorTag}>{stock.sector}</Text> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {mktLabel ? <Text style={s.marketTag}>{mktLabel}</Text> : null}
                    <Text style={s.stockPrice}>${stock.price.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={s.stockRow2}>
                  <Text style={s.stockName} numberOfLines={1}>{stock.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {sigInfo && (
                      <View style={[s.probBadge, {
                        backgroundColor: sigInfo.win_rate_20d >= 55 ? `${colors.bullish}15` : sigInfo.win_rate_20d <= 45 ? `${colors.bearish}15` : `${colors.textMuted}10`,
                      }]}>
                        <Text style={[s.probBadgeText, {
                          color: sigInfo.win_rate_20d >= 55 ? colors.bullish : sigInfo.win_rate_20d <= 45 ? colors.bearish : colors.textMuted,
                        }]}>
                          {sigInfo.win_rate_20d.toFixed(0)}%
                        </Text>
                      </View>
                    )}
                    <View style={[s.changeBadge, { backgroundColor: stock.change_pct >= 0 ? colors.bullishBg : colors.bearishBg }]}>
                      <Text style={[s.changeText, { color: getDirectionColor(stock.change_pct, colors) }]}>
                        {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={s.stockRow3}>
                  <Text style={s.metricVal}>{formatVolume(stock.volume)}</Text>
                  {sigInfo && (
                    <>
                      <Text style={s.metricDot}>|</Text>
                      <Text style={[s.metricVal, { color: colors.textTertiary }]}>{sigInfo.signal_type}</Text>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Scan info */}
      {signalsUpdated ? (
        <View style={s.scanInfo}>
          <Text style={s.scanInfoText}>
            Scanned {scannedCount} stocks | Updated {signalsUpdated}
          </Text>
        </View>
      ) : null}

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 4 }]}>
        <View style={s.topBarLeft}>
          <View style={[s.statusDot, { backgroundColor: serverOk === true ? colors.success : serverOk === false ? colors.error : colors.textMuted }]} />
          <Text style={s.statusText}>
            {serverOk === true ? 'Connected' : serverOk === false ? 'Offline' : '...'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={toggleTheme} style={s.themeToggle}>
            <Text style={s.themeToggleText}>{isDark ? '☀' : '🌙'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={s.settingsBtn}>
            <Text style={s.settingsBtnText}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* Title */}
      <View style={s.titleArea}>
        <Text style={s.title}>Signal Scanner</Text>
        <Text style={s.subtitle}>Probability-based technical signals</Text>
      </View>

      {/* Search */}
      <View style={s.searchContainer}>
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
      </View>

      {results.length > 0 ? renderSearchResults() : renderSignalsContent()}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: c.textTertiary, ...typography.labelSm },
  themeToggle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: c.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  themeToggleText: { fontSize: 16 },
  settingsBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: c.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  settingsBtnText: { fontSize: 14 },

  titleArea: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { color: c.textPrimary, ...typography.h1 },
  subtitle: { color: c.textTertiary, ...typography.bodySm, marginTop: 2 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: c.border,
  },
  searchInput: { flex: 1, height: 44, color: c.textPrimary, ...typography.body },

  resultsList: { flex: 1, paddingHorizontal: spacing.lg },
  resultItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: c.bgCard, borderRadius: radius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: c.border,
  },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  tickerBadge: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: c.accentDim, justifyContent: 'center', alignItems: 'center',
  },
  tickerBadgeText: { color: c.accent, ...typography.label },
  resultTicker: { color: c.textPrimary, ...typography.bodyBold },
  resultName: { color: c.textTertiary, ...typography.labelSm, maxWidth: 200, marginTop: 1 },
  resultExchange: { color: c.textMuted, ...typography.labelSm },

  similarSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  similarTitle: { color: c.textTertiary, ...typography.labelSm, marginBottom: spacing.sm },
  similarChip: {
    backgroundColor: c.accentDim, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, marginRight: spacing.sm, borderWidth: 1, borderColor: c.accent,
  },
  similarChipText: { color: c.accent, ...typography.bodyBold, letterSpacing: 0.5 },

  mainScroll: { flex: 1 },

  sectionContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 2,
  },
  sectionLabel: { color: c.textTertiary, ...typography.label },
  sectionSubtitle: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
  directionDot: { width: 8, height: 8, borderRadius: 4 },

  watchlistChip: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: c.border, marginRight: spacing.sm,
  },
  watchlistChipText: { color: c.textPrimary, ...typography.bodyBold, letterSpacing: 0.5 },

  stockCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: radius.md, padding: spacing.md,
    marginBottom: 6, borderWidth: 1, borderColor: c.border,
  },
  stockRank: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: c.bgElevated, justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.sm,
  },
  stockRankText: { color: c.textMuted, fontSize: 10, fontWeight: '700' },
  stockInfo: { flex: 1 },
  stockRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockTicker: { color: c.textPrimary, ...typography.bodyBold },
  sectorTag: { color: c.textMuted, fontSize: 9, fontStyle: 'italic' },
  marketTag: {
    color: c.warning, fontSize: 8, fontWeight: '700',
    backgroundColor: `${c.warning}15`, paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 3, overflow: 'hidden',
  },
  stockPrice: { color: c.textPrimary, ...typography.number },
  stockRow2: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2,
  },
  stockName: { color: c.textTertiary, ...typography.labelSm, flex: 1, marginRight: spacing.sm },
  changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  changeText: { ...typography.numberSm },
  probBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  probBadgeText: { fontSize: 10, fontWeight: '700' },
  stockRow3: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.border,
  },
  metricVal: { color: c.textMuted, fontSize: 10 },
  metricDot: { color: c.border, fontSize: 10 },

  emptySignal: {
    width: 260, height: 120, borderRadius: radius.lg, backgroundColor: c.bgCard,
    borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg,
  },
  emptyText: { color: c.textMuted, ...typography.bodySm, textAlign: 'center' },

  scanInfo: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    alignItems: 'center', gap: 2,
  },
  scanInfoText: { color: c.textMuted, fontSize: 10 },
});

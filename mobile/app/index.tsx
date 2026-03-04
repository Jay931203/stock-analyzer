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
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { initServerUrl } from '../src/api/client';
import type { SearchResult, TrendingStock } from '../src/types/analysis';
import { getWatchlist, removeFromWatchlist, subscribe, initWatchlist } from '../src/store/watchlist';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, formatNumber, formatVolume, getDirectionColor, type ThemeColors } from '../src/theme';

type ReturnPeriod = '1D' | '1W' | '1M';
type SortKey = 'return' | 'volume' | 'market_cap';

const RETURN_PERIOD_SORT: Record<ReturnPeriod, string> = {
  '1D': 'change_pct',
  '1W': 'week_return',
  '1M': 'month_return',
};

function getReturnValue(stock: TrendingStock, period: ReturnPeriod): number {
  if (period === '1W') return stock.week_return ?? 0;
  if (period === '1M') return stock.month_return ?? 0;
  return stock.change_pct ?? 0;
}

// Similar tickers based on sector/industry
const SIMILAR_TICKERS: Record<string, string[]> = {
  // Tech mega-cap
  AAPL: ['MSFT', 'GOOGL', 'META', 'AMZN'],
  MSFT: ['AAPL', 'GOOGL', 'ORCL', 'CRM'],
  GOOGL: ['META', 'MSFT', 'AMZN', 'NFLX'],
  META: ['GOOGL', 'SNAP', 'PINS', 'NFLX'],
  // Semis
  NVDA: ['AMD', 'INTC', 'AVGO', 'QCOM'],
  AMD: ['NVDA', 'INTC', 'AVGO', 'QCOM'],
  AVGO: ['NVDA', 'AMD', 'QCOM', 'INTC'],
  INTC: ['AMD', 'NVDA', 'QCOM', 'AVGO'],
  QCOM: ['AVGO', 'AMD', 'INTC', 'NVDA'],
  AMAT: ['LRCX', 'KLAC', 'NVDA', 'AMD'],
  // Enterprise SW
  CRM: ['ORCL', 'ADBE', 'MSFT', 'NOW'],
  ORCL: ['CRM', 'MSFT', 'SAP', 'ADBE'],
  ADBE: ['CRM', 'ORCL', 'MSFT', 'INTU'],
  PLTR: ['SNOW', 'CRM', 'AI', 'DDOG'],
  // Consumer / Retail / EV
  AMZN: ['SHOP', 'WMT', 'GOOGL', 'MSFT'],
  TSLA: ['RIVN', 'NIO', 'F', 'GM'],
  COST: ['WMT', 'TGT', 'HD', 'AMZN'],
  WMT: ['COST', 'TGT', 'AMZN', 'HD'],
  HD: ['LOW', 'WMT', 'COST', 'TGT'],
  NKE: ['LULU', 'ADIDAS', 'UA', 'DECK'],
  SBUX: ['MCD', 'CMG', 'YUM', 'DPZ'],
  MCD: ['SBUX', 'CMG', 'YUM', 'DPZ'],
  // Finance
  JPM: ['BAC', 'GS', 'MS', 'WFC'],
  GS: ['MS', 'JPM', 'BAC', 'C'],
  BAC: ['JPM', 'WFC', 'C', 'GS'],
  MS: ['GS', 'JPM', 'BAC', 'SCHW'],
  V: ['MA', 'PYPL', 'SQ', 'AXP'],
  MA: ['V', 'PYPL', 'SQ', 'AXP'],
  'BRK-B': ['JPM', 'GS', 'BAC', 'V'],
  // Healthcare
  LLY: ['NVO', 'JNJ', 'PFE', 'MRK'],
  UNH: ['HUM', 'CI', 'ELV', 'CVS'],
  JNJ: ['PFE', 'MRK', 'ABBV', 'LLY'],
  PFE: ['MRK', 'JNJ', 'ABBV', 'BMY'],
  MRK: ['PFE', 'JNJ', 'ABBV', 'LLY'],
  ABBV: ['MRK', 'PFE', 'JNJ', 'BMY'],
  TMO: ['DHR', 'ABT', 'ISRG', 'SYK'],
  // Media
  NFLX: ['DIS', 'CMCSA', 'WBD', 'PARA'],
  DIS: ['NFLX', 'CMCSA', 'WBD', 'PARA'],
  CMCSA: ['DIS', 'NFLX', 'WBD', 'CHTR'],
  // Energy
  XOM: ['CVX', 'COP', 'SLB', 'EOG'],
  CVX: ['XOM', 'COP', 'SLB', 'EOG'],
  COP: ['XOM', 'CVX', 'EOG', 'DVN'],
  // Industrial
  CAT: ['DE', 'UNP', 'GE', 'HON'],
  BA: ['LMT', 'RTX', 'NOC', 'GD'],
  LMT: ['BA', 'RTX', 'NOC', 'GD'],
  UNP: ['CSX', 'NSC', 'CAT', 'FDX'],
  GE: ['HON', 'MMM', 'CAT', 'RTX'],
};

function getSimilarTickers(ticker: string): string[] {
  const upper = ticker.toUpperCase();
  return SIMILAR_TICKERS[upper] ?? [];
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const [trending, setTrending] = useState<TrendingStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [returnPeriod, setReturnPeriod] = useState<ReturnPeriod>('1D');
  const [sortKey, setSortKey] = useState<SortKey>('return');
  const [sortAsc, setSortAsc] = useState(false);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [sectors, setSectors] = useState<string[]>(['All']);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    async function init() {
      await initServerUrl();
      await initWatchlist();
      setWatchlist(getWatchlist());
      const ok = await api.health();
      setServerOk(ok);
      if (ok) {
        loadTrending();
        api.sectors().then(r => setSectors(r.sectors)).catch(() => {});
      }
    }
    init();
    return subscribe(() => setWatchlist(getWatchlist()));
  }, []);

  const loadTrending = async (
    period = returnPeriod,
    key = sortKey,
    asc = sortAsc,
    sector = sectorFilter,
  ) => {
    setTrendingLoading(true);
    try {
      const sort = key === 'return' ? RETURN_PERIOD_SORT[period] : key;
      const res = await api.trending(sort, 15, sector, asc ? 'asc' : 'desc');
      setTrending(res.stocks);
    } catch {}
    setTrendingLoading(false);
  };

  // Fix: single function for period + sort to avoid double API call
  const changeReturnPeriod = (p: ReturnPeriod) => {
    setReturnPeriod(p);
    setSortKey('return');
    loadTrending(p, 'return', sortAsc, sectorFilter);
  };

  const changeSortKey = (key: SortKey) => {
    setSortKey(key);
    loadTrending(returnPeriod, key, sortAsc, sectorFilter);
  };

  const toggleSortOrder = () => {
    const newAsc = !sortAsc;
    setSortAsc(newAsc);
    loadTrending(returnPeriod, sortKey, newAsc, sectorFilter);
  };

  const changeSector = (sector: string) => {
    setSectorFilter(sector);
    loadTrending(returnPeriod, sortKey, sortAsc, sector);
  };

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 1) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try { setResults(await api.search(text)); } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, []);

  const goToAnalysis = (ticker: string) => router.push(`/analyze/${ticker}`);
  const handleSubmit = () => { const t = query.trim().toUpperCase(); if (t) goToAnalysis(t); };

  const renderSearchResults = () => {
    const topResult = results[0]?.ticker;
    const similar = topResult ? getSimilarTickers(topResult) : [];

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={results}
          keyExtractor={(item) => item.ticker}
          style={s.resultsList}
          renderItem={({ item }) => (
            <Pressable style={s.resultItem} onPress={() => goToAnalysis(item.ticker)}>
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
          ListFooterComponent={similar.length > 0 ? (
            <View style={s.similarSection}>
              <Text style={s.similarTitle}>Similar to {topResult}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {similar.map(t => (
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
  };

  const renderMainContent = () => (
    <ScrollView style={s.mainScroll} showsVerticalScrollIndicator={false}>
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
                style={s.watchlistChip}
                onPress={() => goToAnalysis(ticker)}
                onLongPress={() => removeFromWatchlist(ticker)}
              >
                <Text style={s.watchlistChipText}>{ticker}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending Section */}
      <View style={s.sectionContainer}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>POPULAR STOCKS</Text>
          {trendingLoading && <ActivityIndicator size="small" color={colors.accent} />}
        </View>

        {/* Sector filter */}
        {sectors.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
            {sectors.map((sec) => (
              <Pressable
                key={sec}
                style={[s.filterChip, sectorFilter === sec && s.filterChipActive]}
                onPress={() => changeSector(sec)}
              >
                <Text style={[s.filterChipText, sectorFilter === sec && s.filterChipTextActive]}>
                  {sec === 'All' ? 'All' : sec}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Return period + sort controls */}
        <View style={s.controlsRow}>
          <View style={s.periodGroup}>
            {(['1D', '1W', '1M'] as ReturnPeriod[]).map((p) => (
              <Pressable
                key={p}
                style={[s.periodBtn, returnPeriod === p && sortKey === 'return' && s.periodBtnActive]}
                onPress={() => changeReturnPeriod(p)}
              >
                <Text style={[s.periodBtnText, returnPeriod === p && sortKey === 'return' && s.periodBtnTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.periodGroup}>
            <Pressable
              style={[s.periodBtn, sortKey === 'volume' && s.periodBtnActive]}
              onPress={() => changeSortKey('volume')}
            >
              <Text style={[s.periodBtnText, sortKey === 'volume' && s.periodBtnTextActive]}>Vol</Text>
            </Pressable>
            <Pressable
              style={[s.periodBtn, sortKey === 'market_cap' && s.periodBtnActive]}
              onPress={() => changeSortKey('market_cap')}
            >
              <Text style={[s.periodBtnText, sortKey === 'market_cap' && s.periodBtnTextActive]}>Mkt</Text>
            </Pressable>
          </View>

          <Pressable style={s.orderBtn} onPress={toggleSortOrder}>
            <Text style={s.orderBtnText}>{sortAsc ? '↑' : '↓'}</Text>
          </Pressable>
        </View>

        {/* Stock list */}
        {trending.map((stock, i) => {
          const ret = getReturnValue(stock, returnPeriod);
          return (
            <Pressable key={stock.ticker} style={s.stockCard} onPress={() => goToAnalysis(stock.ticker)}>
              <View style={s.stockRank}>
                <Text style={s.stockRankText}>{i + 1}</Text>
              </View>
              <View style={s.stockInfo}>
                <View style={s.stockRow1}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.stockTicker}>{stock.ticker}</Text>
                    {stock.sector ? <Text style={s.sectorTag}>{stock.sector}</Text> : null}
                  </View>
                  <Text style={s.stockPrice}>${stock.price.toFixed(2)}</Text>
                </View>
                <View style={s.stockRow2}>
                  <Text style={s.stockName} numberOfLines={1}>{stock.name}</Text>
                  <View style={[s.changeBadge, { backgroundColor: ret >= 0 ? colors.bullishBg : colors.bearishBg }]}>
                    <Text style={[s.changeText, { color: getDirectionColor(ret, colors) }]}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                    </Text>
                  </View>
                </View>
                <View style={s.stockRow3}>
                  <Text style={s.metricVal}>{formatVolume(stock.volume)}</Text>
                  <Text style={s.metricDot}>|</Text>
                  <Text style={s.metricVal}>{formatNumber(stock.market_cap)}</Text>
                  {sortKey === 'return' && returnPeriod !== '1D' && (
                    <>
                      <Text style={s.metricDot}>|</Text>
                      <Text style={[s.metricVal, { color: getDirectionColor(stock.change_pct, colors) }]}>
                        1D {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(1)}%
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}

        {trending.length === 0 && !trendingLoading && (
          <View style={s.emptyTrending}>
            <Text style={s.emptyText}>Connect to server to see popular stocks</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <View style={[s.statusDot, { backgroundColor: serverOk === true ? colors.success : serverOk === false ? colors.error : colors.textMuted }]} />
          <Text style={s.statusText}>
            {serverOk === true ? 'Connected' : serverOk === false ? 'Offline' : '...'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={s.settingsBtn}>
          <Text style={s.settingsBtnText}>Settings</Text>
        </Pressable>
      </View>

      {/* Title */}
      <View style={s.titleArea}>
        <Text style={s.title}>Stock Analysis</Text>
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

      {results.length > 0 ? renderSearchResults() : renderMainContent()}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, paddingTop: spacing.md,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: c.textTertiary, ...typography.labelSm },
  settingsBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.sm, backgroundColor: c.bgCard,
    borderWidth: 1, borderColor: c.border,
  },
  settingsBtnText: { color: c.accent, ...typography.labelSm },

  titleArea: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { color: c.textPrimary, ...typography.h1 },

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

  // Similar ticker suggestions
  similarSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  similarTitle: { color: c.textTertiary, ...typography.labelSm, marginBottom: spacing.sm },
  similarChip: {
    backgroundColor: c.accentDim, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, marginRight: spacing.sm, borderWidth: 1, borderColor: c.accent,
  },
  similarChipText: { color: c.accent, ...typography.bodyBold, letterSpacing: 0.5 },

  mainScroll: { flex: 1 },

  sectionContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: { color: c.textTertiary, ...typography.label },

  watchlistChip: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: c.border, marginRight: spacing.sm,
  },
  watchlistChipText: { color: c.textPrimary, ...typography.bodyBold, letterSpacing: 0.5 },

  filterRow: { marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: c.bgCard, marginRight: 6, borderWidth: 1, borderColor: c.border,
  },
  filterChipActive: { backgroundColor: `${c.bullish}15`, borderColor: c.bullish },
  filterChipText: { color: c.textMuted, fontSize: 11 },
  filterChipTextActive: { color: c.bullish },

  controlsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  periodGroup: { flexDirection: 'row', gap: 2 },
  periodBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm,
    backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
  },
  periodBtnActive: { backgroundColor: c.accentDim, borderColor: c.accent },
  periodBtnText: { color: c.textMuted, ...typography.labelSm },
  periodBtnTextActive: { color: c.accent },
  orderBtn: {
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.sm,
    backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.borderLight,
    marginLeft: 'auto',
  },
  orderBtnText: { color: c.textTertiary, fontSize: 14, fontWeight: '600' },

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
  stockPrice: { color: c.textPrimary, ...typography.number },
  stockRow2: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2,
  },
  stockName: { color: c.textTertiary, ...typography.labelSm, flex: 1, marginRight: spacing.sm },
  changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  changeText: { ...typography.numberSm },
  stockRow3: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.border,
  },
  metricVal: { color: c.textMuted, fontSize: 10 },
  metricDot: { color: c.border, fontSize: 10 },

  emptyTrending: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: c.textMuted, ...typography.bodySm },
});

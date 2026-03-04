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
import type { SearchResult, SignalItem } from '../src/types/analysis';
import { getWatchlist, removeFromWatchlist, subscribe, initWatchlist } from '../src/store/watchlist';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, getDirectionColor, type ThemeColors } from '../src/theme';

export default function HomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
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
      }
    }
    init();
    return subscribe(() => setWatchlist(getWatchlist()));
  }, []);

  const loadSignals = async () => {
    setSignalsLoading(true);
    try {
      const res = await api.signals(20);
      setSignals(res.signals);
      setScannedCount(res.scanned);
      setSignalsUpdated(res.updated);
      setMarketState(res.market_state ?? '');
    } catch (e) {
      console.log('Signals load error', e);
    }
    setSignalsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSignals();
    setRefreshing(false);
  };

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 1) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await api.search(text);
        setResults(searchResults.slice(0, 6));
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, []);

  const goToAnalysis = (ticker: string) => router.push(`/analyze/${ticker}`);
  const handleSubmit = () => { const t = query.trim().toUpperCase(); if (t) { setQuery(''); setResults([]); goToAnalysis(t); } };

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

      {/* Loading skeleton */}
      {signalsLoading && signals.length === 0 && (
        <View style={s.sectionContainer}>
          <Text style={s.sectionLabel}>LOADING...</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[0,1,2,3].map(i => (
              <View key={i} style={[s.signalCard, { opacity: 0.4 }]}>
                <View style={{ width: 50, height: 14, borderRadius: 4, backgroundColor: colors.bgElevated, marginBottom: 8 }} />
                <View style={{ width: 70, height: 24, borderRadius: 4, backgroundColor: colors.bgElevated }} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bullish Signals */}
      {(() => {
        const bullish = signals.filter(s => s.win_rate_20d >= 55)
          .sort((a, b) => b.win_rate_20d - a.win_rate_20d);
        if (bullish.length === 0) return null;
        return (
          <View style={s.sectionContainer}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>BULLISH</Text>
              <Text style={s.sectionCount}>{bullish.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {bullish.map((sig) => (
                <Pressable key={sig.ticker} style={({ pressed }) => [s.signalCard, pressed && { transform: [{ scale: 0.96 }] }]} onPress={() => goToAnalysis(sig.ticker)}>
                  <Text style={s.cardTicker}>{sig.ticker}</Text>
                  <Text style={s.cardPrice}>${sig.price.toFixed(2)}</Text>
                  <Text style={[s.cardChange, { color: getDirectionColor(sig.change_pct, colors) }]}>
                    {sig.change_pct >= 0 ? '+' : ''}{sig.change_pct.toFixed(1)}%
                  </Text>
                  <Text style={[s.cardWinRate, { color: colors.bullish }]}>
                    {sig.win_rate_20d.toFixed(0)}%
                  </Text>
                  <Text style={s.cardPeriod}>1M</Text>
                  <Text style={s.cardCases}>{sig.occurrences} cases</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })()}

      {/* Bearish Signals */}
      {(() => {
        const bearish = signals.filter(s => s.win_rate_20d <= 45)
          .sort((a, b) => a.win_rate_20d - b.win_rate_20d);
        if (bearish.length === 0) return null;
        return (
          <View style={s.sectionContainer}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>BEARISH</Text>
              <Text style={s.sectionCount}>{bearish.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {bearish.map((sig) => (
                <Pressable key={sig.ticker} style={({ pressed }) => [s.signalCard, pressed && { transform: [{ scale: 0.96 }] }]} onPress={() => goToAnalysis(sig.ticker)}>
                  <Text style={s.cardTicker}>{sig.ticker}</Text>
                  <Text style={s.cardPrice}>${sig.price.toFixed(2)}</Text>
                  <Text style={[s.cardChange, { color: getDirectionColor(sig.change_pct, colors) }]}>
                    {sig.change_pct >= 0 ? '+' : ''}{sig.change_pct.toFixed(1)}%
                  </Text>
                  <Text style={[s.cardWinRate, { color: colors.bearish }]}>
                    {sig.win_rate_20d.toFixed(0)}%
                  </Text>
                  <Text style={s.cardPeriod}>1M</Text>
                  <Text style={s.cardCases}>{sig.occurrences} cases</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })()}

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
        <Pressable onPress={toggleTheme} style={s.themeBtn}>
          <Text style={s.themeBtnIcon}>{isDark ? '\u2600' : '\u263D'}</Text>
        </Pressable>
      </View>

      {/* Title */}
      <View style={s.titleArea}>
        <Text style={s.title}>Stock Scanner</Text>
      </View>

      {/* Search with dropdown */}
      <View style={s.searchWrapper}>
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
          {query.length > 0 && !loading && (
            <Pressable onPress={() => { setQuery(''); setResults([]); }}>
              <Text style={s.clearBtn}>{'\u2715'}</Text>
            </Pressable>
          )}
        </View>

        {/* Dropdown overlay */}
        {results.length > 0 && (
          <View style={s.dropdown}>
            {results.map((item) => (
              <Pressable
                key={item.ticker}
                style={s.dropdownItem}
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

      {renderSignalsContent()}
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
  marketBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  marketBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  themeBtn: {
    padding: 6, borderRadius: 8,
  },
  themeBtnIcon: {
    fontSize: 18, color: c.textSecondary,
  },

  titleArea: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { color: c.textPrimary, ...typography.h1 },

  searchWrapper: { zIndex: 10, position: 'relative', marginHorizontal: spacing.lg, marginBottom: spacing.md },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: c.border,
  },
  searchInput: { flex: 1, height: 44, color: c.textPrimary, ...typography.body },
  clearBtn: { color: c.textMuted, fontSize: 14, padding: 4 },

  dropdown: {
    position: 'absolute', top: 50, left: 0, right: 0,
    backgroundColor: c.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.border, maxHeight: 320,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  dropdownItemLeft: { flex: 1, marginRight: spacing.sm },
  dropdownTicker: { color: c.textPrimary, ...typography.bodyBold, fontSize: 14 },
  dropdownName: { color: c.textTertiary, fontSize: 11, marginTop: 1 },
  dropdownExchange: { color: c.textMuted, fontSize: 10 },

  mainScroll: { flex: 1 },

  sectionContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 2,
  },
  sectionLabel: { color: c.textTertiary, ...typography.label },
  sectionCount: { color: c.textMuted, fontSize: 12 },

  watchlistChip: {
    backgroundColor: c.bgCard, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: c.border, marginRight: spacing.sm,
  },
  watchlistChipText: { color: c.textPrimary, ...typography.bodyBold, letterSpacing: 0.5 },

  signalCard: {
    width: 130, minHeight: 150, backgroundColor: c.bgCard, borderRadius: radius.lg,
    padding: spacing.md, marginRight: spacing.sm, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTicker: { color: c.textPrimary, ...typography.bodyBold, fontSize: 15, marginBottom: 4 },
  cardPrice: { color: c.textSecondary, ...typography.number, fontSize: 13 },
  cardChange: { fontSize: 12, marginBottom: 8 },
  cardWinRate: { fontSize: 28, fontWeight: '800' },
  cardPeriod: { color: c.textMuted, fontSize: 10, fontWeight: '600', marginTop: 1 },
  cardCases: { color: c.textMuted, fontSize: 10, marginTop: 4 },

  scanInfo: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    alignItems: 'center', gap: 2,
  },
  scanInfoText: { color: c.textMuted, fontSize: 10 },
});

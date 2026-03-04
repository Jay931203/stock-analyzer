import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { initServerUrl } from '../src/api/client';
import type { SearchResult } from '../src/types/analysis';
import { getWatchlist, removeFromWatchlist, subscribe, initWatchlist } from '../src/store/watchlist';

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    async function init() {
      await initServerUrl();
      await initWatchlist();
      setWatchlist(getWatchlist());
      const ok = await api.health();
      setServerOk(ok);
    }
    init();
    return subscribe(() => setWatchlist(getWatchlist()));
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);

    if (text.length < 1) {
      setResults([]);
      return;
    }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(text);
        setResults(res);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  }, []);

  const goToAnalysis = (ticker: string) => {
    router.push(`/analyze/${ticker}`);
  };

  const handleSubmit = () => {
    const ticker = query.trim().toUpperCase();
    if (ticker) goToAnalysis(ticker);
  };

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  serverOk === true ? '#4caf50' : serverOk === false ? '#f44336' : '#666',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {serverOk === true
              ? 'Connected'
              : serverOk === false
              ? 'Offline'
              : 'Connecting...'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <Text style={styles.settingsBtnText}>Settings</Text>
        </Pressable>
      </View>

      {/* Hero section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Stock Analyzer</Text>
        <Text style={styles.heroSub}>Historical probability-based technical analysis</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>S</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ticker or company..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={handleSearch}
          onSubmitEditing={handleSubmit}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color="#6c9bd1" style={styles.searchSpinner} />}
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.ticker}
          style={styles.resultsList}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultItem}
              onPress={() => goToAnalysis(item.ticker)}
            >
              <View style={styles.resultLeft}>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>{item.ticker.slice(0, 2)}</Text>
                </View>
                <View>
                  <Text style={styles.resultTicker}>{item.ticker}</Text>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              </View>
              <Text style={styles.resultExchange}>{item.exchange}</Text>
            </Pressable>
          )}
        />
      )}

      {/* Watchlist */}
      {results.length === 0 && !query && (
        <View style={styles.watchlistSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Watchlist</Text>
            <Text style={styles.sectionCount}>{watchlist.length} tickers</Text>
          </View>
          {watchlist.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No tickers yet. Search and analyze a stock to add it.
              </Text>
            </View>
          ) : (
            <View style={styles.tickerGrid}>
              {watchlist.map((ticker) => (
                <Pressable
                  key={ticker}
                  style={styles.tickerCard}
                  onPress={() => goToAnalysis(ticker)}
                  onLongPress={() => removeFromWatchlist(ticker)}
                >
                  <Text style={styles.tickerCardText}>{ticker}</Text>
                  <Text style={styles.tickerCardHint}>Tap to analyze</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.hintText}>Long press to remove from watchlist</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#777',
    fontSize: 12,
  },
  settingsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
  },
  settingsBtnText: {
    color: '#6c9bd1',
    fontSize: 12,
    fontWeight: '500',
  },

  // Hero
  hero: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroTitle: {
    color: '#e0e0e0',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: '#555',
    fontSize: 14,
    marginTop: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12122a',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  searchIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#6c9bd118',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchIconText: {
    color: '#6c9bd1',
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  searchSpinner: {
    marginLeft: 8,
  },

  // Results
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#12122a',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resultBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6c9bd118',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBadgeText: {
    color: '#6c9bd1',
    fontSize: 13,
    fontWeight: '700',
  },
  resultTicker: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  resultName: {
    color: '#777',
    fontSize: 12,
    maxWidth: 200,
    marginTop: 1,
  },
  resultExchange: {
    color: '#555',
    fontSize: 11,
  },

  // Watchlist
  watchlistSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionCount: {
    color: '#555',
    fontSize: 12,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tickerCard: {
    backgroundColor: '#12122a',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e3e',
    minWidth: 90,
    alignItems: 'center',
  },
  tickerCardText: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tickerCardHint: {
    color: '#444',
    fontSize: 10,
    marginTop: 4,
  },
  hintText: {
    color: '#333',
    fontSize: 11,
    marginTop: 16,
    textAlign: 'center',
  },
});

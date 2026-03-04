import React, { useEffect, useState, useCallback } from 'react';
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
import DashboardSummary from '../../src/components/DashboardSummary';
import IndicatorCard from '../../src/components/IndicatorCard';
import CombinedTab from '../../src/components/CombinedTab';
import SmartCombinedView from '../../src/components/SmartCombinedView';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '../../src/store/watchlist';

const ALL_INDICATORS = ['RSI', 'MACD', 'MA', 'Drawdown', 'ADX', 'BB', 'MADist', 'Consec', 'Vol', 'W52', 'Stoch', 'ATR', 'Combined'];

export default function AnalyzeScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(['RSI', 'MACD']));
  const [inWatchlist, setInWatchlist] = useState(isInWatchlist(ticker ?? ''));

  useEffect(() => {
    navigation.setOptions({ title: ticker?.toUpperCase() ?? 'Analysis' });
    loadData();

    const interval = setInterval(() => refreshData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [ticker]);

  const loadData = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyze(ticker);
      setData(result);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Analysis failed');
    }
    setLoading(false);
  };

  const refreshData = async () => {
    if (!ticker) return;
    try {
      const result = await api.analyze(ticker);
      setData(result);
    } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [ticker]);

  const toggleIndicator = (key: string) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    setActiveIndicators(new Set(ALL_INDICATORS));
  };

  const clearAll = () => {
    setActiveIndicators(new Set());
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#6c9bd1" />
          <Text style={styles.loadingText}>Analyzing {ticker?.toUpperCase()}</Text>
          <Text style={styles.loadingSub}>Computing indicators & historical probabilities...</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{error ?? 'Unknown error'}</Text>
          <Pressable style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { ticker_info, price } = data;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6c9bd1"
            colors={['#6c9bd1']}
            progressBackgroundColor="#1a1a2e"
          />
        }
      >
        {/* Price Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tickerLabel}>{ticker_info.ticker}</Text>
              <Text style={styles.tickerName} numberOfLines={1}>{ticker_info.name}</Text>
            </View>
            <Pressable
              style={[styles.saveBtn, inWatchlist && styles.saveBtnActive]}
              onPress={() => {
                if (inWatchlist) {
                  removeFromWatchlist(ticker!);
                } else {
                  addToWatchlist(ticker!);
                }
                setInWatchlist(!inWatchlist);
              }}
            >
              <Text style={[styles.saveBtnText, inWatchlist && styles.saveBtnTextActive]}>
                {inWatchlist ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>${price.current.toFixed(2)}</Text>
            <View style={[styles.changeBadge, { backgroundColor: price.change >= 0 ? '#4caf5018' : '#f4433618' }]}>
              <Text
                style={[styles.changeText, { color: price.change >= 0 ? '#4caf50' : '#f44336' }]}
              >
                {price.change >= 0 ? '+' : ''}{price.change.toFixed(2)} ({price.change_pct >= 0 ? '+' : ''}{price.change_pct.toFixed(2)}%)
              </Text>
            </View>
          </View>

          {price.high_52w && price.low_52w && (
            <View style={styles.rangeContainer}>
              <Text style={styles.rangeLabel}>52W Range</Text>
              <View style={styles.rangeBar}>
                <View style={styles.rangeTrack}>
                  <View
                    style={[
                      styles.rangeFill,
                      {
                        left: '0%',
                        width: `${Math.min(
                          ((price.current - price.low_52w) / (price.high_52w - price.low_52w)) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.rangeMarker,
                      {
                        left: `${Math.min(
                          ((price.current - price.low_52w) / (price.high_52w - price.low_52w)) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.rangeValues}>
                  <Text style={styles.rangeValue}>${price.low_52w.toFixed(0)}</Text>
                  <Text style={styles.rangeValue}>${price.high_52w.toFixed(0)}</Text>
                </View>
              </View>
            </View>
          )}

          {ticker_info.sector && (
            <Text style={styles.sectorText}>
              {ticker_info.sector}{ticker_info.industry ? ` / ${ticker_info.industry}` : ''}
            </Text>
          )}
        </View>

        {/* Dashboard Summary - always visible */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Indicators Overview</Text>
            <View style={styles.quickActions}>
              <Pressable onPress={selectAll} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>All</Text>
              </Pressable>
              <Pressable onPress={clearAll} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>None</Text>
              </Pressable>
            </View>
          </View>
          <DashboardSummary
            data={data}
            activeIndicators={activeIndicators}
            onToggle={toggleIndicator}
          />
        </View>

        {/* Smart Combined View - shows when 2+ non-Combined indicators selected */}
        {(() => {
          const nonCombined = ALL_INDICATORS.filter(k => k !== 'Combined' && activeIndicators.has(k));
          if (nonCombined.length >= 2) {
            return (
              <View style={styles.section}>
                <SmartCombinedView
                  ticker={ticker!}
                  selectedIndicators={nonCombined}
                />
              </View>
            );
          }
          return null;
        })()}

        {/* Active indicator detail cards */}
        {activeIndicators.size > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Individual Details ({activeIndicators.size} selected)
            </Text>

            {ALL_INDICATORS.filter(k => activeIndicators.has(k) && k !== 'Combined').map(key => (
              <IndicatorCard key={key} type={key} data={data} />
            ))}

            {activeIndicators.has('Combined') && (
              <View style={styles.combinedCard}>
                <View style={styles.combinedHeader}>
                  <Text style={styles.combinedIcon}>C</Text>
                  <Text style={styles.combinedTitle}>Custom Combinations</Text>
                </View>
                <CombinedTab data={data} />
              </View>
            )}
          </View>
        )}

        {activeIndicators.size === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>^</Text>
            <Text style={styles.emptyText}>
              Tap the indicators above to view details
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Updated: {data.analysis_date} | Auto-refresh every 5 min
          </Text>
          <Text style={styles.footerHint}>Pull down to refresh</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 20,
  },

  // Loading
  loadingCard: {
    backgroundColor: '#12122a',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3e',
    width: '80%',
  },
  loadingText: {
    color: '#e0e0e0',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSub: {
    color: '#666',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },

  // Error
  errorCard: {
    backgroundColor: '#12122a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f4433630',
    width: '80%',
  },
  errorIcon: {
    color: '#f44336',
    fontSize: 32,
    fontWeight: '700',
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
    backgroundColor: '#f4433618',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  retryText: {
    color: '#6c9bd1',
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#0e0e22',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a30',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tickerLabel: {
    color: '#6c9bd1',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tickerName: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
    maxWidth: 250,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a2e',
  },
  saveBtnActive: {
    backgroundColor: '#1a2a3e',
    borderColor: '#6c9bd160',
  },
  saveBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  saveBtnTextActive: {
    color: '#6c9bd1',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  priceValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeContainer: {
    marginBottom: 8,
  },
  rangeLabel: {
    color: '#555',
    fontSize: 11,
    marginBottom: 4,
  },
  rangeBar: {},
  rangeTrack: {
    height: 4,
    backgroundColor: '#222244',
    borderRadius: 2,
    position: 'relative',
  },
  rangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#6c9bd130',
    borderRadius: 2,
  },
  rangeMarker: {
    position: 'absolute',
    top: -3,
    width: 4,
    height: 10,
    backgroundColor: '#6c9bd1',
    borderRadius: 2,
    marginLeft: -2,
  },
  rangeValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rangeValue: {
    color: '#555',
    fontSize: 10,
  },
  sectorText: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
  },

  // Sections
  section: {
    padding: 16,
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
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
  },
  quickBtnText: {
    color: '#6c9bd1',
    fontSize: 12,
    fontWeight: '500',
  },

  // Combined card wrapper
  combinedCard: {
    backgroundColor: '#12122a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  combinedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  combinedIcon: {
    color: '#6c9bd1',
    fontSize: 16,
    fontWeight: '800',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#6c9bd118',
    borderRadius: 6,
    overflow: 'hidden',
  },
  combinedTitle: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    color: '#333',
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
    gap: 4,
  },
  footerText: {
    color: '#444',
    fontSize: 11,
  },
  footerHint: {
    color: '#333',
    fontSize: 10,
  },
});

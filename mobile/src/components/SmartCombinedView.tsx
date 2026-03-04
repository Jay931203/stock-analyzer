import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import api from '../api/client';
import type { SmartProbabilityResult, ProbabilityData } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  ticker: string;
  selectedIndicators: string[];
}

const TIER_LABELS: Record<string, { label: string; desc: string }> = {
  strict: { label: 'Strict', desc: 'Tight range match' },
  normal: { label: 'Normal', desc: 'Moderately widened' },
  relaxed: { label: 'Relaxed', desc: 'Wide range match' },
};

const COMP_PERIODS = [
  { key: '5', label: '5D' },
  { key: '20', label: '1M' },
  { key: '60', label: '3M' },
  { key: '252', label: '1Y' },
];

const INDICATOR_LABELS: Record<string, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  ma: 'MA',
  drawdown: 'Drawdown',
  adx: 'ADX',
  bb: 'Bollinger',
  volume: 'Volume',
  stoch: 'Stochastic',
  ma_distance: 'MA Dist',
  consecutive: 'Streak',
  week52: '52W Pos',
};

export default function SmartCombinedView({ ticker, selectedIndicators }: Props) {
  const [result, setResult] = useState<SmartProbabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string>('');
  const [showImpact, setShowImpact] = useState(false);
  const [showIndividuals, setShowIndividuals] = useState(false);
  const prevKey = useRef('');

  const selectionKey = selectedIndicators.sort().join(',');

  useEffect(() => {
    if (selectedIndicators.length >= 2 && selectionKey !== prevKey.current) {
      prevKey.current = selectionKey;
      loadSmartProbability();
    }
  }, [selectionKey]);

  const loadSmartProbability = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.smartProbability(ticker, selectedIndicators);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setResult(res);
      setActiveTier(res.best_tier);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Failed');
    }
    setLoading(false);
  };

  if (selectedIndicators.length < 2) {
    return (
      <View style={styles.container}>
        <View style={styles.hintCard}>
          <Text style={styles.hintIcon}>+</Text>
          <Text style={styles.hintText}>
            Select 2+ indicators above to see combined probability
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#6c9bd1" />
          <Text style={styles.loadingText}>
            Computing combined probability for {selectedIndicators.length} indicators...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadSmartProbability}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!result) return null;

  const tierData = result.tiers[activeTier];
  const availableTiers = Object.keys(result.tiers);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Combined Analysis</Text>
          <Text style={styles.headerSub}>
            {selectedIndicators.length} indicators | {result.data_days} days of data
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={loadSmartProbability}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {/* Active conditions */}
      <View style={styles.conditionsRow}>
        {result.selected.map(key => (
          <View key={key} style={styles.conditionChip}>
            <Text style={styles.conditionText}>
              {INDICATOR_LABELS[key] ?? key}
            </Text>
          </View>
        ))}
      </View>

      {/* Tier selector */}
      {availableTiers.length > 1 && (
        <View style={styles.tierSelector}>
          {availableTiers.map(tier => {
            const isActive = tier === activeTier;
            const isBest = tier === result.best_tier;
            const tierInfo = TIER_LABELS[tier] ?? { label: tier, desc: '' };
            const tierProb = result.tiers[tier];
            return (
              <Pressable
                key={tier}
                style={[styles.tierBtn, isActive && styles.tierBtnActive]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveTier(tier);
                }}
              >
                <View style={styles.tierLabelRow}>
                  <Text style={[styles.tierLabel, isActive && styles.tierLabelActive]}>
                    {tierInfo.label}
                  </Text>
                  {isBest && <View style={styles.bestDot} />}
                </View>
                <Text style={styles.tierSamples}>
                  {tierProb?.occurrences ?? 0} cases
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Best tier indicator */}
      {result.best_tier === activeTier && (
        <View style={styles.bestBanner}>
          <Text style={styles.bestBannerText}>
            Best balance of precision & sample size
          </Text>
        </View>
      )}

      {/* Main probability card */}
      {tierData && <ProbabilityCard data={tierData} />}

      {!tierData && (
        <Text style={styles.noDataText}>
          No matching historical cases found for this tier.
        </Text>
      )}

      {/* Impact Analysis */}
      {Object.keys(result.impact).length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.sectionToggle}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowImpact(!showImpact);
            }}
          >
            <Text style={styles.sectionTitle}>Impact Analysis</Text>
            <Text style={styles.toggleArrow}>{showImpact ? 'v' : '>'}</Text>
          </Pressable>

          {showImpact && (
            <View style={styles.impactGrid}>
              {Object.entries(result.impact).map(([key, prob]) => {
                const label = INDICATOR_LABELS[key] ?? key;
                const winRate5 = prob.periods?.['5']?.win_rate;
                const combinedWinRate5 = tierData?.periods?.['5']?.win_rate;
                const diff = (winRate5 != null && combinedWinRate5 != null)
                  ? winRate5 - combinedWinRate5 : null;
                return (
                  <View key={key} style={styles.impactCard}>
                    <Text style={styles.impactLabel}>Without {label}</Text>
                    <View style={styles.impactStats}>
                      <Text style={styles.impactSamples}>
                        {prob.occurrences} cases
                      </Text>
                      {winRate5 != null && (
                        <Text style={styles.impactWinRate}>
                          5d: {winRate5.toFixed(0)}%
                        </Text>
                      )}
                      {diff != null && (
                        <Text style={[
                          styles.impactDiff,
                          { color: diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#888' },
                        ]}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Individual Comparison */}
      {Object.keys(result.individuals).length > 0 && (
        <View style={styles.section}>
          <Pressable
            style={styles.sectionToggle}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowIndividuals(!showIndividuals);
            }}
          >
            <Text style={styles.sectionTitle}>Individual vs Combined</Text>
            <Text style={styles.toggleArrow}>{showIndividuals ? 'v' : '>'}</Text>
          </Pressable>

          {showIndividuals && (
            <View style={styles.comparisonGrid}>
              {/* Combined baseline */}
              {tierData && (
                <View style={[styles.comparisonRow, styles.comparisonBaseline]}>
                  <Text style={styles.compLabel}>Combined</Text>
                  <View style={styles.compStats}>
                    {COMP_PERIODS.map(({ key, label }) => {
                      const stats = tierData.periods?.[key];
                      if (!stats) return null;
                      return (
                        <View key={key} style={styles.compPeriod}>
                          <Text style={styles.compPeriodLabel}>{label}</Text>
                          <Text style={[
                            styles.compWinRate,
                            { color: stats.win_rate >= 55 ? '#4caf50' : stats.win_rate <= 45 ? '#f44336' : '#888' },
                          ]}>
                            {stats.win_rate.toFixed(0)}%
                          </Text>
                          <Text style={styles.compAvgReturn}>
                            {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
                          </Text>
                        </View>
                      );
                    })}
                    <Text style={styles.compSamples}>
                      n={tierData.occurrences}
                    </Text>
                  </View>
                </View>
              )}

              {/* Individual indicators */}
              {Object.entries(result.individuals).map(([key, prob]) => (
                <View key={key} style={styles.comparisonRow}>
                  <Text style={styles.compLabel}>{INDICATOR_LABELS[key] ?? key}</Text>
                  <View style={styles.compStats}>
                    {COMP_PERIODS.map(({ key: pKey, label }) => {
                      const stats = prob.periods?.[pKey];
                      if (!stats) return null;
                      return (
                        <View key={pKey} style={styles.compPeriod}>
                          <Text style={styles.compPeriodLabel}>{label}</Text>
                          <Text style={[
                            styles.compWinRate,
                            { color: stats.win_rate >= 55 ? '#4caf50' : stats.win_rate <= 45 ? '#f44336' : '#888' },
                          ]}>
                            {stats.win_rate.toFixed(0)}%
                          </Text>
                          <Text style={styles.compAvgReturn}>
                            {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
                          </Text>
                        </View>
                      );
                    })}
                    <Text style={styles.compSamples}>
                      n={prob.occurrences}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {},
  headerTitle: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
  },
  refreshText: {
    color: '#6c9bd1',
    fontSize: 12,
    fontWeight: '500',
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  conditionChip: {
    backgroundColor: '#1a2a3e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  conditionText: {
    color: '#6c9bd1',
    fontSize: 12,
    fontWeight: '500',
  },

  // Tier selector
  tierSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tierBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  tierBtnActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#6c9bd160',
  },
  tierLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierLabel: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  tierLabelActive: {
    color: '#6c9bd1',
  },
  bestDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4caf50',
  },
  tierSamples: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },

  bestBanner: {
    backgroundColor: '#4caf5010',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4caf5020',
  },
  bestBannerText: {
    color: '#4caf50',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },

  noDataText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Sections
  section: {
    marginTop: 12,
    backgroundColor: '#12122a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  sectionTitle: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleArrow: {
    color: '#666',
    fontSize: 14,
  },

  // Impact
  impactGrid: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  impactCard: {
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  impactStats: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  impactSamples: {
    color: '#555',
    fontSize: 11,
  },
  impactWinRate: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  impactDiff: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },

  // Comparison
  comparisonGrid: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  comparisonRow: {
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    padding: 10,
  },
  comparisonBaseline: {
    backgroundColor: '#1a2a3e20',
    borderWidth: 1,
    borderColor: '#6c9bd120',
  },
  compLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  compStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compPeriod: {
    alignItems: 'center',
  },
  compPeriodLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '500',
  },
  compWinRate: {
    fontSize: 14,
    fontWeight: '700',
  },
  compAvgReturn: {
    color: '#888',
    fontSize: 10,
  },
  compSamples: {
    color: '#555',
    fontSize: 10,
    marginLeft: 'auto',
  },

  // Loading/Error/Hint
  loadingCard: {
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  loadingText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  errorCard: {
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f4433630',
  },
  errorText: {
    color: '#f44336',
    fontSize: 13,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
  },
  retryText: {
    color: '#6c9bd1',
    fontSize: 13,
    fontWeight: '500',
  },
  hintCard: {
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3e',
    borderStyle: 'dashed',
  },
  hintIcon: {
    color: '#333',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  hintText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});

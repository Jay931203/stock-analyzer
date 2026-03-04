import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import type { SmartProbabilityResult } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../theme';

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

const INDICATOR_LABELS: Record<string, string> = {
  rsi: 'RSI', macd: 'MACD', ma: 'MA', drawdown: 'Drawdown', adx: 'ADX',
  bb: 'Bollinger', volume: 'Volume', stoch: 'Stochastic',
  ma_distance: 'MA Dist', consecutive: 'Streak', week52: '52W Pos',
};

export default function SmartCombinedView({ ticker, selectedIndicators }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [result, setResult] = useState<SmartProbabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string>('');
  const [showImpact, setShowImpact] = useState(false);
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
      <View style={s.container}>
        <View style={s.hintCard}>
          <Text style={s.hintIcon}>+</Text>
          <Text style={s.hintText}>Select 2+ indicators above to see combined probability</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.loadingCard}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={s.loadingText}>
            Computing combined probability for {selectedIndicators.length} indicators...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <View style={s.errorCard}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={loadSmartProbability}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!result) return null;

  const tierData = result.tiers[activeTier];
  const availableTiers = Object.keys(result.tiers);

  return (
    <View style={s.container}>
      {/* Summary line */}
      <Text style={s.summaryText}>
        {selectedIndicators.length} indicators | {result.data_days} days of data
      </Text>

      {/* Tier selector */}
      {availableTiers.length > 1 && (
        <View style={s.tierSelector}>
          {availableTiers.map(tier => {
            const isActive = tier === activeTier;
            const isBest = tier === result.best_tier;
            const tierInfo = TIER_LABELS[tier] ?? { label: tier, desc: '' };
            const tierProb = result.tiers[tier];
            return (
              <Pressable key={tier} style={[s.tierBtn, isActive && s.tierBtnActive]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTier(tier); }}
              >
                <View style={s.tierLabelRow}>
                  <Text style={[s.tierLabel, isActive && s.tierLabelActive]}>{tierInfo.label}</Text>
                  {isBest && <View style={s.bestDot} />}
                </View>
                <Text style={s.tierSamples}>{tierProb?.occurrences ?? 0} cases</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {result.best_tier === activeTier && (
        <View style={s.bestBanner}>
          <Text style={s.bestBannerText}>Best balance of precision & sample size</Text>
        </View>
      )}

      {tierData && <ProbabilityCard data={tierData} />}

      {!tierData && <Text style={s.noDataText}>No matching historical cases found for this tier.</Text>}

      {/* Impact Analysis - Enhanced with multi-period data */}
      {Object.keys(result.impact).length > 0 && (
        <View style={s.section}>
          <Pressable style={s.sectionToggle}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowImpact(!showImpact); }}
          >
            <Text style={s.sectionTitle}>Impact Analysis</Text>
            <Text style={s.toggleArrow}>{showImpact ? 'v' : '>'}</Text>
          </Pressable>

          {showImpact && (
            <View style={s.impactGrid}>
              {Object.entries(result.impact).map(([key, prob]) => {
                const label = INDICATOR_LABELS[key] ?? key;
                // Show multiple periods for richer info
                const periods = ['5', '20', '60', '252'];
                return (
                  <View key={key} style={s.impactCard}>
                    <Text style={s.impactLabel}>Without {label}</Text>
                    <Text style={s.impactSamples}>{prob.occurrences} cases</Text>
                    <View style={s.impactPeriodRow}>
                      {periods.map(p => {
                        const stats = prob.periods?.[p];
                        const combinedStats = tierData?.periods?.[p];
                        if (!stats) return null;
                        const diff = combinedStats ? stats.win_rate - combinedStats.win_rate : null;
                        const periodLabel = p === '5' ? '5D' : p === '20' ? '1M' : p === '60' ? '3M' : '1Y';
                        return (
                          <View key={p} style={s.impactPeriodCell}>
                            <Text style={s.impactPeriodLabel}>{periodLabel}</Text>
                            <Text style={[s.impactWinRate, { color: stats.win_rate >= 55 ? colors.bullish : stats.win_rate <= 45 ? colors.bearish : colors.textSecondary }]}>
                              {stats.win_rate.toFixed(0)}%
                            </Text>
                            <Text style={[s.impactAvg, { color: stats.avg_return >= 0 ? colors.bullish : colors.bearish }]}>
                              {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
                            </Text>
                            {diff != null && (
                              <Text style={[s.impactDiff, { color: diff > 0 ? colors.bullish : diff < 0 ? colors.bearish : colors.textMuted }]}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { marginBottom: 16 },
  summaryText: { color: c.textMuted, fontSize: 11, marginBottom: 10 },

  tierSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tierBtn: { flex: 1, backgroundColor: c.bgCard, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  tierBtnActive: { backgroundColor: c.accentDim, borderColor: `${c.accent}60` },
  tierLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierLabel: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  tierLabelActive: { color: c.accent },
  bestDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.bullish },
  tierSamples: { color: c.textMuted, fontSize: 11, marginTop: 2 },

  bestBanner: { backgroundColor: `${c.bullish}10`, borderRadius: 8, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: `${c.bullish}20` },
  bestBannerText: { color: c.bullish, fontSize: 11, textAlign: 'center', fontWeight: '500' },

  noDataText: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  section: { marginTop: 12, backgroundColor: c.bgCard, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  sectionTitle: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  toggleArrow: { color: c.textMuted, fontSize: 14 },

  // Impact - Enhanced layout
  impactGrid: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  impactCard: { backgroundColor: c.bg, borderRadius: 8, padding: 10 },
  impactLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  impactSamples: { color: c.textMuted, fontSize: 10, marginBottom: 6 },
  impactPeriodRow: { flexDirection: 'row', gap: 12 },
  impactPeriodCell: { alignItems: 'center' },
  impactPeriodLabel: { color: c.textMuted, fontSize: 9, fontWeight: '500' },
  impactWinRate: { fontSize: 13, fontWeight: '700' },
  impactAvg: { fontSize: 10, marginTop: 1 },
  impactDiff: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  loadingCard: { backgroundColor: c.bgCard, borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.border },
  loadingText: { color: c.textSecondary, fontSize: 13, flex: 1 },
  errorCard: { backgroundColor: c.bgCard, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: `${c.bearish}30` },
  errorText: { color: c.bearish, fontSize: 13, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: c.bgElevated },
  retryText: { color: c.accent, fontSize: 13, fontWeight: '500' },
  hintCard: { backgroundColor: c.bgCard, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
  hintIcon: { color: c.textMuted, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  hintText: { color: c.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

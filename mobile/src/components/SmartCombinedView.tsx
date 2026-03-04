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

      {/* Impact Analysis - simplified card row */}
      {Object.keys(result.impact).length > 0 && (
        <Pressable style={s.section}
          onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowImpact(!showImpact); }}
        >
          <View style={s.sectionToggle}>
            <Text style={s.sectionTitle}>Indicator Impact</Text>
            <Text style={s.toggleArrow}>{showImpact ? '▾' : '▸'}</Text>
          </View>

          {showImpact && (
            <View style={s.impactRow}>
              {Object.entries(result.impact).map(([key, prob]) => {
                const label = INDICATOR_LABELS[key] ?? key;
                const wr20 = prob.periods?.['20']?.win_rate ?? 50;
                const combinedWr = tierData?.periods?.['20']?.win_rate ?? 50;
                const diff = wr20 - combinedWr;
                return (
                  <View key={key} style={s.impactChip}>
                    <Text style={s.impactChipLabel}>{label}</Text>
                    <Text style={[s.impactChipDiff, {
                      color: diff > 2 ? colors.bearish : diff < -2 ? colors.bullish : colors.textMuted,
                    }]}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Pressable>
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

  // Impact - card chips
  impactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 14 },
  impactChip: {
    backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 60,
  },
  impactChipLabel: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginBottom: 2 },
  impactChipDiff: { fontSize: 14, fontWeight: '700' },

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

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
import { usePremium } from '../contexts/PremiumContext';
import UpgradeOverlay from './UpgradeOverlay';
import { spacing, radius, typography, type ThemeColors } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  ticker: string;
  selectedIndicators: string[];
}

const TIER_LABELS: Record<string, { label: string; desc: string }> = {
  strict: { label: 'Precise', desc: 'Fewer but closer matches' },
  normal: { label: 'Balanced', desc: 'Recommended' },
  relaxed: { label: 'Wide', desc: 'More historical data' },
};

const INDICATOR_LABELS: Record<string, string> = {
  rsi: 'RSI', macd: 'MACD', ma: 'MA', drawdown: 'Drawdown', adx: 'ADX',
  bb: 'Bollinger', volume: 'Volume', stoch: 'Stochastic',
  ma_distance: 'MA Dist', consecutive: 'Streak', week52: '52W Pos',
};

export const TIER_WIDTHS: Record<string, number> = { strict: 1.0, normal: 2.0, relaxed: 3.5 };
export const CV_LABELS: Record<string, { label: string; format: (v: any) => string; halfW: number; unit: string }> = {
  rsi: { label: 'RSI', format: v => v.toFixed(1), halfW: 5, unit: '' },
  macd_histogram: { label: 'MACD', format: v => v > 0 ? 'Positive' : 'Negative', halfW: 0, unit: '' },
  ma_alignment: { label: 'MA Trend', format: v => v === 'bullish' ? 'Uptrend' : v === 'bearish' ? 'Downtrend' : 'Mixed', halfW: 0, unit: '' },
  drawdown_60d: { label: 'Pullback', format: v => `${v.toFixed(1)}%`, halfW: 3, unit: '%' },
  adx: { label: 'ADX', format: v => v.toFixed(0), halfW: 5, unit: '' },
  bb_position: { label: 'BB Pos', format: v => `${(v * 100).toFixed(0)}%`, halfW: 0.15, unit: '' },
  volume_ratio: { label: 'Volume', format: v => `${v.toFixed(1)}x`, halfW: 0.3, unit: 'x' },
  stoch_k: { label: 'Stoch', format: v => v.toFixed(0), halfW: 10, unit: '' },
  ma20_distance: { label: 'MA Gap', format: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, halfW: 2, unit: '%' },
  consecutive_days: { label: 'Streak', format: v => `${v > 0 ? '+' : ''}${v}d`, halfW: 0, unit: '' },
  w52_position: { label: '52W Pos', format: v => `${v.toFixed(0)}%`, halfW: 10, unit: '' },
};

export function getRangeText(key: string, val: any, tier: string): string | null {
  const meta = CV_LABELS[key];
  if (!meta || meta.halfW === 0) return null;
  const mult = TIER_WIDTHS[tier] ?? 2.0;
  const hw = meta.halfW * mult;
  if (key === 'bb_position') {
    return `${Math.max((val - hw) * 100, 0).toFixed(0)}–${Math.min((val + hw) * 100, 100).toFixed(0)}%`;
  }
  if (key === 'volume_ratio') {
    return `${Math.max(val - hw, 0).toFixed(1)}–${(val + hw).toFixed(1)}x`;
  }
  const lo = key === 'adx' || key === 'stoch_k' || key === 'w52_position' ? Math.max(val - hw, 0) : val - hw;
  const hi = key === 'stoch_k' || key === 'w52_position' ? Math.min(val + hw, 100) : val + hw;
  const u = meta.unit;
  return `${lo.toFixed(key === 'rsi' || key === 'drawdown_60d' || key === 'ma20_distance' ? 1 : 0)}${u}–${hi.toFixed(key === 'rsi' || key === 'drawdown_60d' || key === 'ma20_distance' ? 1 : 0)}${u}`;
}

export default function SmartCombinedView({ ticker, selectedIndicators }: Props) {
  const { colors } = useTheme();
  const { isPro } = usePremium();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [result, setResult] = useState<SmartProbabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string>('');
  const [showImpact, setShowImpact] = useState(false);
  const prevKey = useRef('');

  const selectionKey = [...selectedIndicators].sort().join(',');

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
      setActiveTier('normal');
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
          <Pressable style={s.retryBtn} onPress={loadSmartProbability} accessibilityRole="button" accessibilityLabel="Retry combined analysis">
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!result) return null;

  const tierData = result.tiers[activeTier];
  const availableTiers = Object.keys(result.tiers);

  // Free users: show first tier as preview, gate the rest
  const showGate = !isPro;

  return (
    <View style={s.container}>
      {/* Summary line */}
      <Text style={s.summaryText}>
        Analyzing {selectedIndicators.length} indicators
      </Text>

      {/* Tier selector - always visible */}
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
                accessibilityRole="button"
                accessibilityLabel={`${tierInfo.label} tier${isBest ? ', recommended' : ''}, ${tierProb?.occurrences ?? 0} cases`}
              >
                <View style={s.tierLabelRow}>
                  <Text style={[s.tierLabel, isActive && s.tierLabelActive]}>{tierInfo.label}</Text>
                  {isBest && <Text style={s.bestLabel}>Best</Text>}
                </View>
                <Text style={s.tierSamples}>{tierProb?.occurrences ?? 0} cases</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Show probability card — free users see it but gated details below */}
      {tierData && <ProbabilityCard data={tierData} compact />}

      {!tierData && <Text style={s.noDataText}>No matching historical cases found for this tier.</Text>}

      {/* Gate the expandable details for free users */}
      {showGate && (
        <View style={{ position: 'relative', marginTop: 12, minHeight: 80 }}>
          <UpgradeOverlay message="Unlock full combined analysis" compact />
        </View>
      )}

      {/* Conditions & Cases - expandable section (pro only) */}
      {!showGate && (
      <Pressable style={s.section}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowImpact(!showImpact); }}
        accessibilityRole="button"
        accessibilityLabel={showImpact ? 'Hide conditions and cases' : 'Show conditions and cases'}
      >
        <View style={s.sectionToggle}>
          <Text style={s.sectionTitle}>Show Conditions & Cases</Text>
          <Text style={s.toggleArrow}>{showImpact ? '▾' : '▸'}</Text>
        </View>

        {showImpact && (
          <>
            {/* Part A: Conditions grid */}
            {result.current_values && Object.keys(result.current_values).length > 0 && (
              <View style={s.conditionsBlock}>
                <Text style={s.conditionsLabel}>
                  Conditions — searching {activeTier === 'strict' ? 'Precise' : activeTier === 'relaxed' ? 'Wide' : 'Balanced'} range
                </Text>
                <View style={s.conditionsGrid}>
                  {Object.entries(result.current_values).map(([key, val]) => {
                    if (val === null || val === undefined || key === 'macd_event') return null;
                    const meta = CV_LABELS[key];
                    if (!meta) return null;
                    const formatted = meta.format(val);
                    const range = typeof val === 'number' ? getRangeText(key, val, activeTier) : null;
                    return (
                      <View key={key} style={s.conditionChip}>
                        <Text style={s.conditionLabel}>{meta.label}</Text>
                        <Text style={s.conditionValue}>{formatted}</Text>
                        {range && <Text style={s.conditionRange}>{range}</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Part B: Without each indicator impact */}
            {Object.keys(result.impact).length > 0 && (
              <View style={s.impactBlock}>
                <Text style={s.impactBlockLabel}>Without each indicator:</Text>
                <View style={s.impactRow}>
                  {Object.entries(result.impact).map(([key, prob]) => {
                    const label = INDICATOR_LABELS[key] ?? key;
                    const wr20 = prob.periods?.['20']?.win_rate ?? 50;
                    const combinedWr = tierData?.periods?.['20']?.win_rate ?? 50;
                    const diff = wr20 - combinedWr;
                    const helping = diff < -2;
                    const hurting = diff > 2;
                    return (
                      <View key={key} style={s.impactChip}>
                        <Text style={s.impactChipLabel}>{label}</Text>
                        <Text style={[s.impactChipDiff, {
                          color: helping ? colors.bullish : hurting ? colors.bearish : colors.textMuted,
                        }]}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                        </Text>
                        <Text style={[s.impactChipHint, {
                          color: helping ? colors.bullish : hurting ? colors.bearish : colors.textMuted,
                        }]}>
                          {helping ? 'Helps' : hurting ? 'Hurts' : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
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
  tierBtn: { flex: 1, backgroundColor: c.bgCard, borderRadius: radius.sm, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  tierBtnActive: { backgroundColor: c.accentDim, borderColor: `${c.accent}60` },
  tierLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierLabel: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  tierLabelActive: { color: c.accent },
  bestLabel: { color: c.bullish, fontSize: 10, fontWeight: '700' },
  tierSamples: { color: c.textMuted, fontSize: 11, marginTop: 2 },

  noDataText: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },


  section: { marginTop: 12, backgroundColor: c.bgCard, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  sectionTitle: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  toggleArrow: { color: c.textMuted, fontSize: 14 },

  // Conditions block (inside expandable section)
  conditionsBlock: { paddingHorizontal: 14, paddingBottom: 12 },
  conditionsLabel: { color: c.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  conditionChip: { backgroundColor: c.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  conditionLabel: { color: c.textMuted, fontSize: 10, fontWeight: '500' },
  conditionValue: { color: c.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 1 },
  conditionRange: { color: c.accent, fontSize: 10, fontWeight: '500', marginTop: 1 },

  // Impact block
  impactBlock: { paddingHorizontal: 14, paddingBottom: 14 },
  impactBlockLabel: { color: c.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },

  // Impact - card chips
  impactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  impactChip: {
    backgroundColor: c.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 60,
  },
  impactChipLabel: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginBottom: 2 },
  impactChipDiff: { fontSize: 14, fontWeight: '700' },
  impactChipHint: { fontSize: 10, fontWeight: '500', marginTop: 1 },

  loadingCard: { backgroundColor: c.bgCard, borderRadius: radius.md, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.border },
  loadingText: { color: c.textSecondary, fontSize: 13, flex: 1 },
  errorCard: { backgroundColor: c.bgCard, borderRadius: radius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: `${c.bearish}30` },
  errorText: { color: c.bearish, fontSize: 13, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: c.bgElevated },
  retryText: { color: c.accent, fontSize: 13, fontWeight: '500' },
  hintCard: { backgroundColor: c.bgCard, borderRadius: radius.md, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
  hintIcon: { color: c.textMuted, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  hintText: { color: c.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

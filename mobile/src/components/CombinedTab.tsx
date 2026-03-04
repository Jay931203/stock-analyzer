import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { AnalysisResponse, ProbabilityData } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';
import api from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, type ThemeColors } from '../theme';

interface Props {
  data: AnalysisResponse;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  condition_count: number;
}

interface ConditionOption {
  label: string;
  states: string[];
}

const STATE_LABELS: Record<string, string> = {
  'golden_cross': 'Golden Cross', 'dead_cross': 'Dead Cross',
  'positive': 'Positive', 'negative': 'Negative',
  'bullish': 'Bullish (20>50>200)', 'bearish': 'Bearish (20<50<200)',
  'below_lower': 'Below Lower Band', 'lower_quarter': 'Lower Quarter',
  'mid_lower': 'Mid-Lower', 'mid_upper': 'Mid-Upper',
  'upper_quarter': 'Upper Quarter', 'above_upper': 'Above Upper Band',
  'very_low': 'Very Low (<0.5x)', 'low': 'Low (0.5-0.8x)',
  'normal': 'Normal (0.8-1.2x)', 'high': 'High (1.2-2x)', 'very_high': 'Very High (>2x)',
  'near_high': 'Near High (within 2%)', 'dip_2_5': 'Dip (2-5%)',
  'pullback_5_10': 'Pullback (5-10%)', 'correction_10_20': 'Correction (10-20%)',
  'crash_20pct_plus': 'Crash (>20%)',
  'no_trend': 'No Trend (<20)', 'weak_trend': 'Weak Trend (20-25)',
  'strong_trend': 'Strong Trend (25-40)', 'very_strong_trend': 'Very Strong (>40)',
  'up_3_4': '3-4 Up Days', 'up_5plus': '5+ Up Days',
  'down_3_4': '3-4 Down Days', 'down_5plus': '5+ Down Days',
  'far_below_5pct': '>5% Below MA20', 'below_2_5pct': '2-5% Below MA20',
  'near_ma20': 'Near MA20 (+-2%)', 'above_2_5pct': '2-5% Above MA20',
  'far_above_5pct': '>5% Above MA20',
};

export default function CombinedTab({ data }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [mode, setMode] = useState<'auto' | 'presets' | 'custom'>('auto');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [conditions, setConditions] = useState<Record<string, ConditionOption>>({});
  const [presetResult, setPresetResult] = useState<{ name: string; prob: ProbabilityData } | null>(null);
  const [customSelections, setCustomSelections] = useState<Record<string, string>>({});
  const [customResult, setCustomResult] = useState<ProbabilityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPresets();
    loadConditions();
  }, []);

  const loadPresets = async () => { try { setPresets(await api.getPresets()); } catch {} };
  const loadConditions = async () => { try { setConditions(await api.getConditions()); } catch {} };

  const runPreset = async (presetId: string) => {
    setLoading(true);
    setPresetResult(null);
    try {
      const res = await api.runPreset(presetId, data.ticker_info.ticker);
      setPresetResult({ name: res.preset, prob: res.probability });
    } catch {}
    setLoading(false);
  };

  const runCustom = async () => {
    const conds = Object.entries(customSelections)
      .filter(([_, state]) => state !== '')
      .map(([indicator, state]) => ({ indicator, state }));
    if (conds.length < 2) return;
    setLoading(true);
    setCustomResult(null);
    try { setCustomResult(await api.customProbability(data.ticker_info.ticker, conds)); } catch {}
    setLoading(false);
  };

  const toggleCustom = (indicator: string, state: string) => {
    setCustomSelections(prev => ({ ...prev, [indicator]: prev[indicator] === state ? '' : state }));
    setCustomResult(null);
  };

  const selectedCount = Object.values(customSelections).filter(v => v !== '').length;

  return (
    <View>
      <View style={s.modeTabs}>
        {(['auto', 'presets', 'custom'] as const).map(m => (
          <Pressable key={m} style={[s.modeTab, mode === m && s.modeTabActive]} onPress={() => setMode(m)}>
            <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
              {m === 'auto' ? 'Auto' : m === 'presets' ? 'Presets' : 'Custom'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'auto' && (
        <View>
          <Text style={s.modeDesc}>All currently active indicator conditions combined automatically.</Text>
          {data.combined ? (
            <>
              <View style={s.conditionsList}>
                {data.combined.conditions.map((c, i) => (
                  <View key={i} style={s.conditionChip}>
                    <Text style={s.conditionChipText}>{formatCondition(c)}</Text>
                  </View>
                ))}
              </View>
              <ProbabilityCard data={data.combined.probability} />
            </>
          ) : (
            <Text style={s.noData}>Not enough active conditions. Need at least 2 indicator signals.</Text>
          )}
        </View>
      )}

      {mode === 'presets' && (
        <View>
          <Text style={s.modeDesc}>Common trading scenario combinations with historical probabilities.</Text>
          {presets.map(preset => (
            <Pressable key={preset.id} style={s.presetCard} onPress={() => runPreset(preset.id)}>
              <View style={s.presetHeader}>
                <Text style={s.presetName}>{preset.name}</Text>
                <Text style={s.presetCount}>{preset.condition_count} conditions</Text>
              </View>
              <Text style={s.presetDesc}>{preset.description}</Text>
            </Pressable>
          ))}
          {loading && <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 16 }} />}
          {presetResult && (
            <View style={s.resultSection}>
              <Text style={s.resultTitle}>{presetResult.name}</Text>
              <ProbabilityCard data={presetResult.prob} />
            </View>
          )}
        </View>
      )}

      {mode === 'custom' && (
        <View>
          <Text style={s.modeDesc}>Select conditions to combine. Choose one state per indicator.</Text>
          {Object.entries(conditions).map(([key, cond]) => (
            <View key={key} style={s.conditionGroup}>
              <Text style={s.conditionLabel}>{cond.label}</Text>
              <View style={s.stateGrid}>
                {cond.states.map(state => {
                  const isSelected = customSelections[key] === state;
                  return (
                    <Pressable key={state} style={[s.stateChip, isSelected && s.stateChipSelected]}
                      onPress={() => toggleCustom(key, state)}>
                      <Text style={[s.stateChipText, isSelected && s.stateChipTextSelected]}>
                        {STATE_LABELS[state] ?? state}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Pressable style={[s.runBtn, selectedCount < 2 && s.runBtnDisabled]} onPress={runCustom} disabled={selectedCount < 2 || loading}>
            <Text style={s.runBtnText}>{loading ? 'Calculating...' : `Run Analysis (${selectedCount} conditions)`}</Text>
          </Pressable>
          {selectedCount < 2 && <Text style={s.hint}>Select at least 2 conditions to combine.</Text>}
          {customResult && <ProbabilityCard data={customResult} />}
        </View>
      )}
    </View>
  );
}

function formatCondition(c: string): string {
  const [indicator, state] = c.split(':');
  const indicatorLabels: Record<string, string> = {
    rsi: 'RSI', macd_event: 'MACD', ma_alignment: 'MA', bb_zone: 'BB', volume_level: 'Volume',
  };
  return `${indicatorLabels[indicator] ?? indicator}: ${STATE_LABELS[state] ?? state}`;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  modeTabs: { flexDirection: 'row', backgroundColor: c.bgCard, borderRadius: 10, padding: 3, marginBottom: 16 },
  modeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  modeTabActive: { backgroundColor: c.bgElevated },
  modeTabText: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
  modeTabTextActive: { color: c.accent },
  modeDesc: { color: c.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 18 },
  conditionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  conditionChip: { backgroundColor: c.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  conditionChipText: { color: c.accent, fontSize: 12 },
  noData: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  presetCard: { backgroundColor: c.bgElevated, borderRadius: 10, padding: 14, marginBottom: 8 },
  presetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetName: { color: c.textPrimary, fontSize: 14, fontWeight: '600' },
  presetCount: { color: c.textMuted, fontSize: 11 },
  presetDesc: { color: c.textSecondary, fontSize: 12, marginTop: 4 },
  resultSection: { marginTop: 12 },
  resultTitle: { color: c.textTertiary, fontSize: 13, marginBottom: 8 },
  conditionGroup: { marginBottom: 16 },
  conditionLabel: { color: c.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stateChip: { backgroundColor: c.bgElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: c.border },
  stateChipSelected: { backgroundColor: c.accentDim, borderColor: c.accent },
  stateChipText: { color: c.textSecondary, fontSize: 11 },
  stateChipTextSelected: { color: c.accent },
  runBtn: { backgroundColor: `${c.accent}25`, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginVertical: 12 },
  runBtnDisabled: { opacity: 0.4 },
  runBtnText: { color: c.accent, fontSize: 15, fontWeight: '600' },
  hint: { color: c.textMuted, fontSize: 12, textAlign: 'center' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import type { AnalysisResponse, ProbabilityData } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';
import api from '../api/client';

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
  'golden_cross': 'Golden Cross',
  'dead_cross': 'Dead Cross',
  'positive': 'Positive',
  'negative': 'Negative',
  'bullish': 'Bullish (20>50>200)',
  'bearish': 'Bearish (20<50<200)',
  'below_lower': 'Below Lower Band',
  'lower_quarter': 'Lower Quarter',
  'mid_lower': 'Mid-Lower',
  'mid_upper': 'Mid-Upper',
  'upper_quarter': 'Upper Quarter',
  'above_upper': 'Above Upper Band',
  'very_low': 'Very Low (<0.5x)',
  'low': 'Low (0.5-0.8x)',
  'normal': 'Normal (0.8-1.2x)',
  'high': 'High (1.2-2x)',
  'very_high': 'Very High (>2x)',
  // Drawdown
  'near_high': 'Near High (within 2%)',
  'dip_2_5': 'Dip (2-5%)',
  'pullback_5_10': 'Pullback (5-10%)',
  'correction_10_20': 'Correction (10-20%)',
  'crash_20pct_plus': 'Crash (>20%)',
  // ADX
  'no_trend': 'No Trend (<20)',
  'weak_trend': 'Weak Trend (20-25)',
  'strong_trend': 'Strong Trend (25-40)',
  'very_strong_trend': 'Very Strong (>40)',
  // Consecutive
  'up_3_4': '3-4 Up Days',
  'up_5plus': '5+ Up Days',
  'down_3_4': '3-4 Down Days',
  'down_5plus': '5+ Down Days',
  // MA Distance
  'far_below_5pct': '>5% Below MA20',
  'below_2_5pct': '2-5% Below MA20',
  'near_ma20': 'Near MA20 (±2%)',
  'above_2_5pct': '2-5% Above MA20',
  'far_above_5pct': '>5% Above MA20',
};

export default function CombinedTab({ data }: Props) {
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

  const loadPresets = async () => {
    try {
      const res = await api.getPresets();
      setPresets(res);
    } catch {}
  };

  const loadConditions = async () => {
    try {
      const res = await api.getConditions();
      setConditions(res);
    } catch {}
  };

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
    try {
      const res = await api.customProbability(data.ticker_info.ticker, conds);
      setCustomResult(res);
    } catch {}
    setLoading(false);
  };

  const toggleCustom = (indicator: string, state: string) => {
    setCustomSelections(prev => ({
      ...prev,
      [indicator]: prev[indicator] === state ? '' : state,
    }));
    setCustomResult(null);
  };

  const selectedCount = Object.values(customSelections).filter(v => v !== '').length;

  return (
    <View>
      {/* Mode tabs */}
      <View style={styles.modeTabs}>
        {(['auto', 'presets', 'custom'] as const).map(m => (
          <Pressable
            key={m}
            style={[styles.modeTab, mode === m && styles.modeTabActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
              {m === 'auto' ? 'Auto' : m === 'presets' ? 'Presets' : 'Custom'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Auto: current conditions */}
      {mode === 'auto' && (
        <View>
          <Text style={styles.modeDesc}>
            All currently active indicator conditions combined automatically.
          </Text>
          {data.combined ? (
            <>
              <View style={styles.conditionsList}>
                {data.combined.conditions.map((c, i) => (
                  <View key={i} style={styles.conditionChip}>
                    <Text style={styles.conditionChipText}>{formatCondition(c)}</Text>
                  </View>
                ))}
              </View>
              <ProbabilityCard data={data.combined.probability} />
            </>
          ) : (
            <Text style={styles.noData}>
              Not enough active conditions. Need at least 2 indicator signals.
            </Text>
          )}
        </View>
      )}

      {/* Presets */}
      {mode === 'presets' && (
        <View>
          <Text style={styles.modeDesc}>
            Common trading scenario combinations with historical probabilities.
          </Text>
          {presets.map(preset => (
            <Pressable
              key={preset.id}
              style={styles.presetCard}
              onPress={() => runPreset(preset.id)}
            >
              <View style={styles.presetHeader}>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetCount}>{preset.condition_count} conditions</Text>
              </View>
              <Text style={styles.presetDesc}>{preset.description}</Text>
            </Pressable>
          ))}

          {loading && (
            <ActivityIndicator size="small" color="#6c9bd1" style={{ marginVertical: 16 }} />
          )}

          {presetResult && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>{presetResult.name}</Text>
              <ProbabilityCard data={presetResult.prob} />
            </View>
          )}
        </View>
      )}

      {/* Custom */}
      {mode === 'custom' && (
        <View>
          <Text style={styles.modeDesc}>
            Select conditions to combine. Choose one state per indicator.
          </Text>

          {Object.entries(conditions).map(([key, cond]) => (
            <View key={key} style={styles.conditionGroup}>
              <Text style={styles.conditionLabel}>{cond.label}</Text>
              <View style={styles.stateGrid}>
                {cond.states.map(state => {
                  const isSelected = customSelections[key] === state;
                  return (
                    <Pressable
                      key={state}
                      style={[styles.stateChip, isSelected && styles.stateChipSelected]}
                      onPress={() => toggleCustom(key, state)}
                    >
                      <Text style={[styles.stateChipText, isSelected && styles.stateChipTextSelected]}>
                        {STATE_LABELS[state] ?? state}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable
            style={[styles.runBtn, selectedCount < 2 && styles.runBtnDisabled]}
            onPress={runCustom}
            disabled={selectedCount < 2 || loading}
          >
            <Text style={styles.runBtnText}>
              {loading ? 'Calculating...' : `Run Analysis (${selectedCount} conditions)`}
            </Text>
          </Pressable>

          {selectedCount < 2 && (
            <Text style={styles.hint}>Select at least 2 conditions to combine.</Text>
          )}

          {customResult && <ProbabilityCard data={customResult} />}
        </View>
      )}
    </View>
  );
}

function formatCondition(c: string): string {
  const [indicator, state] = c.split(':');
  const indicatorLabels: Record<string, string> = {
    rsi: 'RSI',
    macd_event: 'MACD',
    ma_alignment: 'MA',
    bb_zone: 'BB',
    volume_level: 'Volume',
  };
  return `${indicatorLabels[indicator] ?? indicator}: ${STATE_LABELS[state] ?? state}`;
}

const styles = StyleSheet.create({
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#1a1a2e',
  },
  modeTabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: '#6c9bd1',
  },
  modeDesc: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  conditionsList: {
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
  conditionChipText: {
    color: '#6c9bd1',
    fontSize: 12,
  },
  noData: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 30,
  },
  presetCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetName: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
  },
  presetCount: {
    color: '#555',
    fontSize: 11,
  },
  presetDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  resultSection: {
    marginTop: 12,
  },
  resultTitle: {
    color: '#999',
    fontSize: 13,
    marginBottom: 8,
  },
  conditionGroup: {
    marginBottom: 16,
  },
  conditionLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stateChip: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  stateChipSelected: {
    backgroundColor: '#1a2a3e',
    borderColor: '#6c9bd1',
  },
  stateChipText: {
    color: '#888',
    fontSize: 11,
  },
  stateChipTextSelected: {
    color: '#6c9bd1',
  },
  runBtn: {
    backgroundColor: '#1a3a5c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 12,
  },
  runBtnDisabled: {
    opacity: 0.4,
  },
  runBtnText: {
    color: '#6c9bd1',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
});

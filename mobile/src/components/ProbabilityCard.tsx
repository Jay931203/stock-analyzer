import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
import type { ProbabilityData, CaseRecord } from '../types/analysis';
import ProbabilityBar from './ProbabilityBar';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, radius, getWinRateColor, type ThemeColors } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  data: ProbabilityData;
  compact?: boolean;
}

const PERIOD_LABELS: Record<string, string> = {
  '5': '5D', '10': '10D', '20': '1M', '60': '3M', '120': '6M', '252': '1Y',
};

// Make raw condition strings more human-readable
function friendlyCondition(raw: string): string {
  return raw
    .replace(/RSI (\d+)-(\d+)/g, (_, lo, hi) => {
      const mid = (Number(lo) + Number(hi)) / 2;
      const zone = mid < 30 ? 'Low' : mid < 50 ? 'Moderate' : mid < 70 ? 'High' : 'Very High';
      return `RSI ${zone} (${lo}-${hi})`;
    })
    .replace(/BB Zone: below_lower/g, 'Below support band')
    .replace(/BB Zone: above_upper/g, 'Above resistance band')
    .replace(/BB Zone: lower_quarter/g, 'Near support')
    .replace(/BB Zone: upper_quarter/g, 'Near resistance')
    .replace(/BB Zone: mid_lower/g, 'Lower range')
    .replace(/BB Zone: mid_upper/g, 'Upper range')
    .replace(/MACD Golden Cross/g, 'Momentum turning up')
    .replace(/MACD Dead Cross/g, 'Momentum turning down')
    .replace(/MA Bullish Alignment Entry/g, 'Moving averages: Uptrend')
    .replace(/MA Bearish Alignment Entry/g, 'Moving averages: Downtrend')
    .replace(/Volume Spike \(>2x avg\)/g, 'Unusually high volume')
    .replace(/Stochastic %K (\d+)-(\d+)/g, (_, lo) => {
      const v = Number(lo);
      const zone = v < 20 ? 'Oversold' : v < 80 ? 'Neutral' : 'Overbought';
      return `Stochastic: ${zone}`;
    })
    .replace(/Drawdown (\d+)-(\d+)% from 60d high/g, 'Pullback from recent high')
    .replace(/Near 60d high \(within 2%\)/g, 'Near recent high')
    .replace(/ADX <20 \(No Trend\)/g, 'No clear trend')
    .replace(/ADX (\d+)-(\d+) \((\w+ Trend)\)/g, '$3')
    .replace(/ADX >40 \(Very Strong Trend\)/g, 'Very strong trend')
    .replace(/ AND /g, ' + ');
}

export default function ProbabilityCard({ data, compact }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [showCases, setShowCases] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  if (data.occurrences === 0) {
    return (
      <View style={s.container}>
        {!compact && <Text style={s.condition}>{friendlyCondition(data.condition)}</Text>}
        <Text style={s.noData}>No historical data available</Text>
      </View>
    );
  }

  const sortedPeriods = Object.entries(data.periods).sort(([a], [b]) => Number(a) - Number(b));
  const overallBullish = sortedPeriods.filter(([_, st]) => st.win_rate >= 55).length;
  const overallBearish = sortedPeriods.filter(([_, st]) => st.win_rate <= 45).length;

  const signalColor = overallBullish > overallBearish ? colors.bullish
    : overallBearish > overallBullish ? colors.bearish : colors.neutral;
  const signalLabel = overallBullish > overallBearish ? 'Bullish'
    : overallBearish > overallBullish ? 'Bearish' : 'Neutral';

  return (
    <View style={s.container}>
      {compact ? (
        <Text style={s.compactHeader}>{data.occurrences} historical matches</Text>
      ) : (
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.condition}>{friendlyCondition(data.condition)}</Text>
            <Text style={s.occurrences}>{data.occurrences} historical cases</Text>
          </View>
          <View style={[s.signalBadge, { backgroundColor: `${signalColor}15` }]}>
            <Text style={[s.signalText, { color: signalColor }]}>{signalLabel}</Text>
          </View>
        </View>
      )}

      {data.warning && <Text style={s.warning}>{data.warning}</Text>}

      <View style={s.viewToggle}>
        <Pressable
          style={[s.toggleBtn, viewMode === 'chart' && s.toggleBtnActive]}
          onPress={() => setViewMode('chart')}
        >
          <Text style={[s.toggleText, viewMode === 'chart' && s.toggleTextActive]}>Chart</Text>
        </Pressable>
        <Pressable
          style={[s.toggleBtn, viewMode === 'table' && s.toggleBtnActive]}
          onPress={() => setViewMode('table')}
        >
          <Text style={[s.toggleText, viewMode === 'table' && s.toggleTextActive]}>Table</Text>
        </Pressable>
      </View>

      {viewMode === 'chart' && <ProbabilityBar periods={data.periods} />}

      {viewMode === 'table' && (
        <View style={s.table}>
          <View style={s.headerRow}>
            <Text style={[s.headerCell, s.periodCol]}>Period</Text>
            <Text style={[s.headerCell, s.winCol]}>Win %</Text>
            <Text style={[s.headerCell, s.returnCol]}>Avg</Text>
            <Text style={[s.headerCell, s.returnCol]}>Median</Text>
            <Text style={[s.headerCell, s.returnCol]}>Best</Text>
            <Text style={[s.headerCell, s.returnCol]}>Worst</Text>
          </View>
          {sortedPeriods.map(([period, stats]) => (
            <View style={s.dataRow} key={period}>
              <Text style={[s.cell, s.periodCol, s.periodText]}>
                {PERIOD_LABELS[period] ?? `${period}d`}
              </Text>
              <Text style={[s.cell, s.winCol, s.winText, { color: getWinRateColor(stats.win_rate) }]}>
                {stats.win_rate.toFixed(1)}%
              </Text>
              <Text style={[s.cell, s.returnCol, { color: stats.avg_return >= 0 ? colors.bullish : colors.bearish }]}>
                {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
              </Text>
              <Text style={[s.cell, s.returnCol, { color: stats.median_return >= 0 ? colors.bullish : colors.bearish }]}>
                {stats.median_return >= 0 ? '+' : ''}{stats.median_return.toFixed(1)}%
              </Text>
              <Text style={[s.cell, s.returnCol, { color: colors.bullish }]}>+{stats.best.toFixed(1)}%</Text>
              <Text style={[s.cell, s.returnCol, { color: colors.bearish }]}>{stats.worst.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      )}

      {data.cases && data.cases.length > 0 && (
        <Pressable style={s.casesToggle} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowCases(!showCases); }}>
          <Text style={s.casesToggleText}>
            {showCases ? 'Hide' : 'Show'} individual cases ({data.cases.length})
          </Text>
        </Pressable>
      )}

      {showCases && data.cases && (
        <View style={s.casesList}>
          <View style={s.caseHeader}>
            <Text style={[s.caseHeaderText, { flex: 1.2 }]}>Date</Text>
            <Text style={[s.caseHeaderText, { flex: 0.8 }]}>Price</Text>
            {sortedPeriods.slice(0, 4).map(([p]) => (
              <Text key={p} style={[s.caseHeaderText, { flex: 0.6 }]}>
                {PERIOD_LABELS[p] ?? `${p}d`}
              </Text>
            ))}
          </View>
          <FlatList
            data={data.cases.slice().reverse()}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <CaseRow case_={item} periods={sortedPeriods.slice(0, 4).map(([p]) => p)} colors={colors} s={s} />
            )}
            style={s.caseListScroll}
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
}

function CaseRow({ case_, periods, colors, s }: { case_: CaseRecord; periods: string[]; colors: any; s: any }) {
  return (
    <View style={s.caseRow}>
      <Text style={[s.caseCell, { flex: 1.2 }]}>{case_.date}</Text>
      <Text style={[s.caseCell, { flex: 0.8 }]}>${case_.entry_price.toFixed(0)}</Text>
      {periods.map((p) => {
        const ret = case_.returns[p];
        if (ret === undefined) return <Text key={p} style={[s.caseCell, { flex: 0.6 }]}>-</Text>;
        return (
          <Text key={p} style={[s.caseCell, { flex: 0.6, color: ret > 0 ? colors.bullish : colors.bearish }]}>
            {ret > 0 ? '+' : ''}{ret.toFixed(1)}%
          </Text>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: c.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  condition: { color: c.textPrimary, ...typography.bodyBold },
  occurrences: { color: c.textMuted, ...typography.labelSm, marginTop: 2 },
  compactHeader: { color: c.textPrimary, ...typography.bodyBold, marginBottom: spacing.xs },
  signalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  signalText: { ...typography.labelSm, fontWeight: '700' },
  warning: { color: c.warning, ...typography.labelSm, marginTop: spacing.xs, marginBottom: spacing.xs },
  noData: { color: c.textMuted, ...typography.bodySm, fontStyle: 'italic' },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: c.bg,
    borderRadius: radius.sm,
    padding: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: c.bgElevated },
  toggleText: { color: c.textMuted, ...typography.labelSm },
  toggleTextActive: { color: c.accent },

  table: { marginTop: spacing.xs },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 6,
    marginBottom: 2,
  },
  headerCell: { color: c.textMuted, ...typography.labelSm, textTransform: 'uppercase' },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  cell: { ...typography.labelSm, color: c.textSecondary },
  periodCol: { flex: 0.6 },
  winCol: { flex: 0.8, textAlign: 'center' },
  returnCol: { flex: 0.8, textAlign: 'right' },
  periodText: { fontWeight: '600', color: c.textTertiary },
  winText: { fontWeight: '700' },

  casesToggle: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  casesToggleText: { color: c.accent, ...typography.labelSm },
  casesList: { marginTop: spacing.xs },
  caseHeader: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  caseHeaderText: { color: c.textMuted, ...typography.labelSm },
  caseRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  caseCell: { color: c.textTertiary, ...typography.labelSm },
  caseListScroll: { maxHeight: 300 },
});

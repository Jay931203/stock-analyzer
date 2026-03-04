import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import type { ProbabilityData, CaseRecord } from '../types/analysis';
import ProbabilityBar from './ProbabilityBar';

interface Props {
  data: ProbabilityData;
}

const PERIOD_LABELS: Record<string, string> = {
  '5': '5D',
  '10': '10D',
  '20': '1M',
  '60': '3M',
  '120': '6M',
  '252': '1Y',
};

export default function ProbabilityCard({ data }: Props) {
  const [showCases, setShowCases] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  if (data.occurrences === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.condition}>{data.condition}</Text>
        <Text style={styles.noData}>No historical data available</Text>
      </View>
    );
  }

  const sortedPeriods = Object.entries(data.periods).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  // Find best and worst periods
  const bestPeriod = sortedPeriods.reduce((best, [p, s]) =>
    s.win_rate > (best[1]?.win_rate ?? 0) ? [p, s] : best,
    ['', null as any]
  );
  const overallBullish = sortedPeriods.filter(([_, s]) => s.win_rate >= 55).length;
  const overallBearish = sortedPeriods.filter(([_, s]) => s.win_rate <= 45).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.condition}>{data.condition}</Text>
          <Text style={styles.occurrences}>
            {data.occurrences} historical cases
          </Text>
        </View>
        {/* Signal badge */}
        <View style={[
          styles.signalBadge,
          { backgroundColor: overallBullish > overallBearish ? '#4caf5015' : overallBearish > overallBullish ? '#f4433615' : '#88888815' },
        ]}>
          <Text style={[
            styles.signalText,
            { color: overallBullish > overallBearish ? '#4caf50' : overallBearish > overallBullish ? '#f44336' : '#888' },
          ]}>
            {overallBullish > overallBearish ? 'Bullish' : overallBearish > overallBullish ? 'Bearish' : 'Neutral'}
          </Text>
        </View>
      </View>

      {data.warning && <Text style={styles.warning}>{data.warning}</Text>}

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
          onPress={() => setViewMode('chart')}
        >
          <Text style={[styles.toggleText, viewMode === 'chart' && styles.toggleTextActive]}>Chart</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'table' && styles.toggleBtnActive]}
          onPress={() => setViewMode('table')}
        >
          <Text style={[styles.toggleText, viewMode === 'table' && styles.toggleTextActive]}>Table</Text>
        </Pressable>
      </View>

      {/* Chart view */}
      {viewMode === 'chart' && (
        <ProbabilityBar periods={data.periods} />
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.periodCol]}>Period</Text>
            <Text style={[styles.headerCell, styles.winCol]}>Win %</Text>
            <Text style={[styles.headerCell, styles.returnCol]}>Avg</Text>
            <Text style={[styles.headerCell, styles.returnCol]}>Median</Text>
            <Text style={[styles.headerCell, styles.returnCol]}>Best</Text>
            <Text style={[styles.headerCell, styles.returnCol]}>Worst</Text>
          </View>
          {sortedPeriods.map(([period, stats]) => (
            <View style={styles.dataRow} key={period}>
              <Text style={[styles.cell, styles.periodCol, styles.periodText]}>
                {PERIOD_LABELS[period] ?? `${period}d`}
              </Text>
              <Text style={[
                styles.cell, styles.winCol, styles.winText,
                { color: getWinColor(stats.win_rate) },
              ]}>
                {stats.win_rate.toFixed(1)}%
              </Text>
              <Text style={[
                styles.cell, styles.returnCol,
                { color: stats.avg_return >= 0 ? '#4caf50' : '#f44336' },
              ]}>
                {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
              </Text>
              <Text style={[
                styles.cell, styles.returnCol,
                { color: stats.median_return >= 0 ? '#4caf50' : '#f44336' },
              ]}>
                {stats.median_return >= 0 ? '+' : ''}{stats.median_return.toFixed(1)}%
              </Text>
              <Text style={[styles.cell, styles.returnCol, styles.positive]}>
                +{stats.best.toFixed(1)}%
              </Text>
              <Text style={[styles.cell, styles.returnCol, styles.negative]}>
                {stats.worst.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Cases toggle */}
      {data.cases && data.cases.length > 0 && (
        <Pressable
          style={styles.casesToggle}
          onPress={() => setShowCases(!showCases)}
        >
          <Text style={styles.casesToggleText}>
            {showCases ? 'Hide' : 'Show'} individual cases ({data.cases.length})
          </Text>
        </Pressable>
      )}

      {showCases && data.cases && (
        <View style={styles.casesList}>
          <View style={styles.caseHeader}>
            <Text style={[styles.caseHeaderText, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.caseHeaderText, { flex: 0.8 }]}>Price</Text>
            {sortedPeriods.slice(0, 4).map(([p]) => (
              <Text key={p} style={[styles.caseHeaderText, { flex: 0.6 }]}>
                {PERIOD_LABELS[p] ?? `${p}d`}
              </Text>
            ))}
          </View>
          <FlatList
            data={data.cases.slice().reverse()}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <CaseRow case_={item} periods={sortedPeriods.slice(0, 4).map(([p]) => p)} />
            )}
            style={styles.caseListScroll}
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
}

function CaseRow({ case_, periods }: { case_: CaseRecord; periods: string[] }) {
  return (
    <View style={styles.caseRow}>
      <Text style={[styles.caseCell, { flex: 1.2 }]}>{case_.date}</Text>
      <Text style={[styles.caseCell, { flex: 0.8 }]}>
        ${case_.entry_price.toFixed(0)}
      </Text>
      {periods.map((p) => {
        const ret = case_.returns[p];
        if (ret === undefined) {
          return <Text key={p} style={[styles.caseCell, { flex: 0.6 }]}>-</Text>;
        }
        return (
          <Text
            key={p}
            style={[
              styles.caseCell,
              { flex: 0.6 },
              ret > 0 ? styles.positive : styles.negative,
            ]}
          >
            {ret > 0 ? '+' : ''}{ret.toFixed(1)}%
          </Text>
        );
      })}
    </View>
  );
}

function getWinColor(value: number): string {
  if (value >= 60) return '#4caf50';
  if (value >= 55) return '#8bc34a';
  if (value >= 50) return '#9e9e9e';
  if (value >= 45) return '#ff9800';
  return '#f44336';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#12122a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  condition: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
  },
  occurrences: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  signalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  warning: {
    color: '#f0ad4e',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
  },
  noData: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    padding: 2,
    marginTop: 10,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#1a1a2e',
  },
  toggleText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#6c9bd1',
  },
  // Table
  table: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3e',
    paddingBottom: 6,
    marginBottom: 2,
  },
  headerCell: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a30',
  },
  cell: {
    fontSize: 12,
    color: '#aaa',
  },
  periodCol: { flex: 0.6 },
  winCol: { flex: 0.8, textAlign: 'center' },
  returnCol: { flex: 0.8, textAlign: 'right' },
  periodText: { fontWeight: '600', color: '#888' },
  winText: { fontWeight: '700' },
  positive: { color: '#4caf50' },
  negative: { color: '#f44336' },
  // Cases
  casesToggle: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e1e3e',
  },
  casesToggleText: {
    color: '#6c9bd1',
    fontSize: 12,
    fontWeight: '500',
  },
  casesList: { marginTop: 4 },
  caseHeader: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3e',
  },
  caseHeaderText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  caseRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a30',
  },
  caseCell: {
    color: '#999',
    fontSize: 11,
  },
  caseListScroll: { maxHeight: 300 },
});

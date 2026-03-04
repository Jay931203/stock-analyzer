import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PeriodStats } from '../types/analysis';

interface Props {
  label?: string;
  periods: Record<string, PeriodStats>;
}

const PERIOD_LABELS: Record<string, string> = {
  '5': '5D',
  '10': '10D',
  '20': '1M',
  '60': '3M',
  '120': '6M',
  '252': '1Y',
};

export default function ProbabilityBar({ label, periods }: Props) {
  const sorted = Object.entries(periods).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {sorted.map(([period, stats]) => {
        const winColor = getWinColor(stats.win_rate);
        const barWidth = Math.min(Math.max(stats.win_rate, 0), 100);
        return (
          <View key={period} style={styles.row}>
            <Text style={styles.period}>
              {PERIOD_LABELS[period] ?? `${period}d`}
            </Text>

            {/* Win rate bar */}
            <View style={styles.barContainer}>
              <View style={styles.barTrack}>
                <View style={styles.centerLine} />
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: winColor,
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={[styles.value, { color: winColor }]}>
              {stats.win_rate.toFixed(0)}%
            </Text>

            <Text
              style={[
                styles.returnValue,
                { color: stats.avg_return >= 0 ? '#4caf50' : '#f44336' },
              ]}
            >
              {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(1)}%
            </Text>
          </View>
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
    marginBottom: 4,
  },
  label: {
    color: '#777',
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  period: {
    color: '#888',
    fontSize: 11,
    width: 24,
    textAlign: 'right',
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
  },
  barTrack: {
    height: 16,
    backgroundColor: '#0e0e20',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ffffff15',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    opacity: 0.6,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  returnValue: {
    fontSize: 11,
    fontWeight: '500',
    width: 46,
    textAlign: 'right',
  },
});

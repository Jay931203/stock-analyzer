import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AnalysisResponse } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';
import CombinedTab from './CombinedTab';

interface Props {
  tab: string;
  data: AnalysisResponse;
}

export default function IndicatorTab({ tab, data }: Props) {
  const { indicators } = data;

  switch (tab) {
    case 'RSI':
      return <RSIView data={indicators.rsi} />;
    case 'MACD':
      return <MACDView data={indicators.macd} />;
    case 'MA':
      return <MAView data={indicators.ma} />;
    case 'BB':
      return <BBView data={indicators.bb} />;
    case 'Vol':
      return <VolView data={indicators.volume} />;
    case 'Stoch':
      return <StochView data={indicators.stochastic} />;
    case 'Combined':
      return <CombinedTab data={data} />;
    default:
      return null;
  }
}

function RSIView({ data }: { data: AnalysisResponse['indicators']['rsi'] }) {
  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>RSI(14)</Text>
        <Text style={styles.value}>
          {data.value !== null ? data.value.toFixed(1) : 'N/A'}
        </Text>
      </View>
      {data.value !== null && (
        <View style={styles.gauge}>
          <View style={styles.gaugeTrack}>
            <View
              style={[styles.gaugeZone, { left: '0%', width: '30%', backgroundColor: '#1b5e2033' }]}
            />
            <View
              style={[styles.gaugeZone, { left: '70%', width: '30%', backgroundColor: '#b71c1c33' }]}
            />
            <View
              style={[
                styles.gaugeMarker,
                { left: `${Math.min(Math.max(data.value, 0), 100)}%` },
              ]}
            />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>0</Text>
            <Text style={styles.gaugeLabel}>30</Text>
            <Text style={styles.gaugeLabel}>70</Text>
            <Text style={styles.gaugeLabel}>100</Text>
          </View>
        </View>
      )}
      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

function MACDView({ data }: { data: AnalysisResponse['indicators']['macd'] }) {
  const eventLabels: Record<string, string> = {
    golden_cross: 'Golden Cross',
    dead_cross: 'Dead Cross',
    positive: 'Positive',
    negative: 'Negative',
  };

  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>MACD</Text>
        <Text style={styles.value}>{data.macd?.toFixed(4) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Signal</Text>
        <Text style={styles.value}>{data.signal?.toFixed(4) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Histogram</Text>
        <Text
          style={[
            styles.value,
            data.histogram && data.histogram > 0
              ? styles.positive
              : styles.negative,
          ]}
        >
          {data.histogram?.toFixed(4) ?? 'N/A'}
        </Text>
      </View>
      {data.event && (
        <View style={styles.eventBadge}>
          <Text style={styles.eventText}>
            {eventLabels[data.event] ?? data.event}
          </Text>
        </View>
      )}
      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

function MAView({ data }: { data: AnalysisResponse['indicators']['ma'] }) {
  const alignmentColors: Record<string, string> = {
    bullish: '#4caf50',
    bearish: '#f44336',
    none: '#888',
  };

  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Price</Text>
        <Text style={styles.value}>${data.price.toFixed(2)}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>SMA 20</Text>
        <Text style={styles.value}>${data.sma20?.toFixed(2) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>SMA 50</Text>
        <Text style={styles.value}>${data.sma50?.toFixed(2) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>SMA 200</Text>
        <Text style={styles.value}>${data.sma200?.toFixed(2) ?? 'N/A'}</Text>
      </View>
      <View style={[styles.eventBadge, { borderColor: alignmentColors[data.alignment] }]}>
        <Text style={[styles.eventText, { color: alignmentColors[data.alignment] }]}>
          {data.alignment === 'bullish' ? 'Bullish Alignment (20>50>200)' :
           data.alignment === 'bearish' ? 'Bearish Alignment (20<50<200)' :
           'No Clear Alignment'}
        </Text>
      </View>
      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

function BBView({ data }: { data: AnalysisResponse['indicators']['bb'] }) {
  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Upper Band</Text>
        <Text style={styles.value}>${data.upper?.toFixed(2) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Middle</Text>
        <Text style={styles.value}>${data.middle?.toFixed(2) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Lower Band</Text>
        <Text style={styles.value}>${data.lower?.toFixed(2) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Position</Text>
        <Text style={styles.value}>
          {data.position !== null ? `${(data.position * 100).toFixed(0)}%` : 'N/A'}
        </Text>
      </View>
      {data.zone && (
        <View style={styles.eventBadge}>
          <Text style={styles.eventText}>Zone: {data.zone.replace('_', ' ')}</Text>
        </View>
      )}
      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

function VolView({ data }: { data: AnalysisResponse['indicators']['volume'] }) {
  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Volume</Text>
        <Text style={styles.value}>{formatNumber(data.current)}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>20d Avg</Text>
        <Text style={styles.value}>{formatNumber(data.avg20)}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>Ratio</Text>
        <Text
          style={[
            styles.value,
            data.ratio && data.ratio >= 2 ? styles.highlight : {},
          ]}
        >
          {data.ratio?.toFixed(2) ?? 'N/A'}x
        </Text>
      </View>
      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

function StochView({ data }: { data: AnalysisResponse['indicators']['stochastic'] }) {
  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>%K</Text>
        <Text style={styles.value}>{data.k?.toFixed(1) ?? 'N/A'}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.label}>%D</Text>
        <Text style={styles.value}>{data.d?.toFixed(1) ?? 'N/A'}</Text>
      </View>
      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}


function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

const styles = StyleSheet.create({
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  label: {
    color: '#888',
    fontSize: 14,
  },
  value: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
  },
  positive: { color: '#4caf50' },
  negative: { color: '#f44336' },
  highlight: { color: '#ff9800' },
  eventBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    marginBottom: 10,
  },
  eventText: {
    color: '#ccc',
    fontSize: 13,
  },
  gauge: {
    marginVertical: 12,
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  gaugeMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 16,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginLeft: -2,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gaugeLabel: {
    color: '#666',
    fontSize: 10,
  },
});

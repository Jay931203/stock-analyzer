import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import type { AnalysisResponse } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  type: string;
  data: AnalysisResponse;
}

export default function IndicatorCard({ type, data }: Props) {
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const { title, icon, content } = getCardContent(type, data);

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={toggle}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.cardBody}>
          {content}
        </View>
      )}
    </View>
  );
}

function getCardContent(type: string, data: AnalysisResponse): { title: string; icon: string; content: React.ReactNode } {
  const { indicators } = data;

  switch (type) {
    case 'RSI':
      return {
        title: 'RSI (14)',
        icon: 'R',
        content: <RSIContent data={indicators.rsi} />,
      };
    case 'MACD':
      return {
        title: 'MACD (12,26,9)',
        icon: 'M',
        content: <MACDContent data={indicators.macd} />,
      };
    case 'MA':
      return {
        title: 'Moving Averages',
        icon: 'A',
        content: <MAContent data={indicators.ma} />,
      };
    case 'BB':
      return {
        title: 'Bollinger Bands',
        icon: 'B',
        content: <BBContent data={indicators.bb} />,
      };
    case 'Vol':
      return {
        title: 'Volume Analysis',
        icon: 'V',
        content: <VolContent data={indicators.volume} />,
      };
    case 'Stoch':
      return {
        title: 'Stochastic (14,3)',
        icon: 'S',
        content: <StochContent data={indicators.stochastic} />,
      };
    case 'Drawdown':
      return {
        title: 'Drawdown from High',
        icon: 'D',
        content: <DrawdownContent data={indicators.drawdown} />,
      };
    case 'ADX':
      return {
        title: 'ADX (Trend Strength)',
        icon: 'X',
        content: <ADXContent data={indicators.adx} />,
      };
    case 'ATR':
      return {
        title: 'ATR (Volatility)',
        icon: 'T',
        content: <ATRContent data={indicators.atr} price={indicators.ma.price} />,
      };
    case 'MADist':
      return {
        title: 'MA Distance',
        icon: 'G',
        content: <MADistContent data={indicators.ma_distance} />,
      };
    case 'Consec':
      return {
        title: 'Consecutive Days',
        icon: 'C',
        content: <ConsecContent data={indicators.consecutive} />,
      };
    case 'W52':
      return {
        title: '52-Week Position',
        icon: 'W',
        content: <Week52Content data={indicators.week52} />,
      };
    default:
      return { title: type, icon: '?', content: null };
  }
}

// --- RSI ---
function RSIContent({ data }: { data: AnalysisResponse['indicators']['rsi'] }) {
  const value = data.value;
  const zone = value !== null
    ? value > 70 ? 'Overbought' : value < 30 ? 'Oversold' : 'Neutral'
    : null;
  const zoneColor = zone === 'Overbought' ? '#f44336' : zone === 'Oversold' ? '#4caf50' : '#888';

  return (
    <View>
      {/* Large value display */}
      <View style={styles.valueDisplay}>
        <Text style={styles.bigValue}>{value !== null ? value.toFixed(1) : 'N/A'}</Text>
        {zone && (
          <View style={[styles.zoneBadge, { backgroundColor: zoneColor + '20', borderColor: zoneColor + '60' }]}>
            <Text style={[styles.zoneText, { color: zoneColor }]}>{zone}</Text>
          </View>
        )}
      </View>

      {/* Gauge */}
      {value !== null && (
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeSection, { left: '0%', width: '30%', backgroundColor: '#4caf5015' }]} />
            <View style={[styles.gaugeSection, { left: '70%', width: '30%', backgroundColor: '#f4433615' }]} />
            <View style={[styles.gaugeMarker, { left: `${Math.min(Math.max(value, 0), 100)}%` }]} />
            {/* Reference lines */}
            <View style={[styles.refLine, { left: '30%' }]} />
            <View style={[styles.refLine, { left: '50%', backgroundColor: '#555' }]} />
            <View style={[styles.refLine, { left: '70%' }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>0</Text>
            <Text style={[styles.gaugeLabel, { color: '#4caf50' }]}>30</Text>
            <Text style={styles.gaugeLabel}>50</Text>
            <Text style={[styles.gaugeLabel, { color: '#f44336' }]}>70</Text>
            <Text style={styles.gaugeLabel}>100</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- MACD ---
function MACDContent({ data }: { data: AnalysisResponse['indicators']['macd'] }) {
  const eventLabels: Record<string, { label: string; color: string }> = {
    golden_cross: { label: 'Golden Cross', color: '#4caf50' },
    dead_cross: { label: 'Dead Cross', color: '#f44336' },
    positive: { label: 'Positive', color: '#8bc34a' },
    negative: { label: 'Negative', color: '#ff9800' },
  };

  const event = data.event ? eventLabels[data.event] : null;

  return (
    <View>
      <View style={styles.metricsGrid}>
        <MetricBox label="MACD" value={data.macd?.toFixed(4) ?? 'N/A'} />
        <MetricBox label="Signal" value={data.signal?.toFixed(4) ?? 'N/A'} />
        <MetricBox
          label="Histogram"
          value={data.histogram?.toFixed(4) ?? 'N/A'}
          color={data.histogram && data.histogram > 0 ? '#4caf50' : '#f44336'}
        />
      </View>

      {event && (
        <View style={[styles.eventBanner, { backgroundColor: event.color + '15', borderColor: event.color + '40' }]}>
          <View style={[styles.eventDot, { backgroundColor: event.color }]} />
          <Text style={[styles.eventLabel, { color: event.color }]}>{event.label}</Text>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- MA ---
function MAContent({ data }: { data: AnalysisResponse['indicators']['ma'] }) {
  const alignmentLabels: Record<string, { label: string; color: string }> = {
    bullish: { label: 'Bullish Alignment (20 > 50 > 200)', color: '#4caf50' },
    bearish: { label: 'Bearish Alignment (20 < 50 < 200)', color: '#f44336' },
    none: { label: 'No Clear Alignment', color: '#888' },
  };

  const alignment = alignmentLabels[data.alignment] ?? alignmentLabels.none;

  // Calculate price position relative to MAs
  const maValues = [
    { label: 'SMA 20', value: data.sma20, period: 20 },
    { label: 'SMA 50', value: data.sma50, period: 50 },
    { label: 'SMA 200', value: data.sma200, period: 200 },
  ];

  return (
    <View>
      <View style={[styles.eventBanner, { backgroundColor: alignment.color + '12', borderColor: alignment.color + '35' }]}>
        <View style={[styles.eventDot, { backgroundColor: alignment.color }]} />
        <Text style={[styles.eventLabel, { color: alignment.color }]}>{alignment.label}</Text>
      </View>

      {maValues.map(({ label, value }) => {
        const diff = value !== null ? ((data.price - value) / value * 100) : null;
        return (
          <View key={label} style={styles.maRow}>
            <Text style={styles.maLabel}>{label}</Text>
            <Text style={styles.maValue}>${value?.toFixed(2) ?? 'N/A'}</Text>
            {diff !== null && (
              <Text style={[styles.maDiff, { color: diff >= 0 ? '#4caf50' : '#f44336' }]}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
              </Text>
            )}
          </View>
        );
      })}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- BB ---
function BBContent({ data }: { data: AnalysisResponse['indicators']['bb'] }) {
  const position = data.position !== null ? data.position * 100 : null;
  const zoneLabels: Record<string, string> = {
    below_lower: 'Below Lower Band',
    lower_quarter: 'Lower Quarter',
    mid_lower: 'Mid-Lower',
    mid_upper: 'Mid-Upper',
    upper_quarter: 'Upper Quarter',
    above_upper: 'Above Upper Band',
  };

  return (
    <View>
      <View style={styles.metricsGrid}>
        <MetricBox label="Upper" value={`$${data.upper?.toFixed(2) ?? 'N/A'}`} />
        <MetricBox label="Middle" value={`$${data.middle?.toFixed(2) ?? 'N/A'}`} />
        <MetricBox label="Lower" value={`$${data.lower?.toFixed(2) ?? 'N/A'}`} />
      </View>

      {/* BB position visualizer */}
      {position !== null && (
        <View style={styles.bbVisual}>
          <View style={styles.bbTrack}>
            <View style={[styles.bbFill, { height: `${Math.min(Math.max(position, 0), 100)}%` }]} />
            <View style={styles.bbMiddleLine} />
            <View style={[styles.bbMarker, { bottom: `${Math.min(Math.max(position, 0), 100)}%` }]}>
              <Text style={styles.bbMarkerText}>{position.toFixed(0)}%</Text>
            </View>
          </View>
          <View style={styles.bbLabels}>
            <Text style={styles.bbLabel}>Upper</Text>
            <Text style={styles.bbLabel}>Middle</Text>
            <Text style={styles.bbLabel}>Lower</Text>
          </View>
        </View>
      )}

      {data.zone && (
        <View style={[styles.eventBanner, { backgroundColor: '#6c9bd115', borderColor: '#6c9bd135' }]}>
          <Text style={[styles.eventLabel, { color: '#6c9bd1' }]}>{zoneLabels[data.zone] ?? data.zone}</Text>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Volume ---
function VolContent({ data }: { data: AnalysisResponse['indicators']['volume'] }) {
  const ratio = data.ratio ?? 0;
  const ratioColor = ratio >= 2 ? '#ff9800' : ratio >= 1.2 ? '#8bc34a' : '#888';

  return (
    <View>
      <View style={styles.metricsGrid}>
        <MetricBox label="Current" value={formatNumber(data.current)} />
        <MetricBox label="20d Avg" value={formatNumber(data.avg20)} />
        <MetricBox label="Ratio" value={`${ratio.toFixed(2)}x`} color={ratioColor} />
      </View>

      {/* Volume ratio bar */}
      <View style={styles.volBarContainer}>
        <View style={styles.volBarTrack}>
          <View
            style={[
              styles.volBarFill,
              {
                width: `${Math.min(ratio / 3 * 100, 100)}%`,
                backgroundColor: ratioColor,
              },
            ]}
          />
          {/* 1x reference line */}
          <View style={[styles.refLine, { left: `${(1 / 3) * 100}%` }]} />
          {/* 2x reference line */}
          <View style={[styles.refLine, { left: `${(2 / 3) * 100}%` }]} />
        </View>
        <View style={styles.volBarLabels}>
          <Text style={styles.gaugeLabel}>0x</Text>
          <Text style={styles.gaugeLabel}>1x</Text>
          <Text style={styles.gaugeLabel}>2x</Text>
          <Text style={styles.gaugeLabel}>3x+</Text>
        </View>
      </View>

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Stochastic ---
function StochContent({ data }: { data: AnalysisResponse['indicators']['stochastic'] }) {
  const k = data.k;
  const d = data.d;
  const zone = k !== null
    ? k > 80 ? 'Overbought' : k < 20 ? 'Oversold' : 'Neutral'
    : null;
  const zoneColor = zone === 'Overbought' ? '#f44336' : zone === 'Oversold' ? '#4caf50' : '#888';

  return (
    <View>
      <View style={styles.metricsGrid}>
        <MetricBox label="%K" value={k?.toFixed(1) ?? 'N/A'} />
        <MetricBox label="%D" value={d?.toFixed(1) ?? 'N/A'} />
        {zone && (
          <View style={[styles.metricBox, { backgroundColor: zoneColor + '12' }]}>
            <Text style={styles.metricLabel}>Zone</Text>
            <Text style={[styles.metricValue, { color: zoneColor }]}>{zone}</Text>
          </View>
        )}
      </View>

      {/* Gauge similar to RSI */}
      {k !== null && (
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeSection, { left: '0%', width: '20%', backgroundColor: '#4caf5015' }]} />
            <View style={[styles.gaugeSection, { left: '80%', width: '20%', backgroundColor: '#f4433615' }]} />
            <View style={[styles.gaugeMarker, { left: `${Math.min(Math.max(k, 0), 100)}%` }]} />
            {d !== null && (
              <View style={[styles.gaugeMarkerD, { left: `${Math.min(Math.max(d, 0), 100)}%` }]} />
            )}
            <View style={[styles.refLine, { left: '20%' }]} />
            <View style={[styles.refLine, { left: '80%' }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>0</Text>
            <Text style={[styles.gaugeLabel, { color: '#4caf50' }]}>20</Text>
            <Text style={styles.gaugeLabel}>50</Text>
            <Text style={[styles.gaugeLabel, { color: '#f44336' }]}>80</Text>
            <Text style={styles.gaugeLabel}>100</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Drawdown ---
function DrawdownContent({ data }: { data: AnalysisResponse['indicators']['drawdown'] }) {
  const dd60 = data.from_60d_high;
  const ddColor = dd60 !== null
    ? dd60 <= -20 ? '#f44336' : dd60 <= -10 ? '#ff9800' : dd60 <= -5 ? '#ffc107' : '#4caf50'
    : '#888';

  return (
    <View>
      <View style={styles.valueDisplay}>
        <Text style={[styles.bigValue, { color: ddColor }]}>
          {dd60 !== null ? `${dd60.toFixed(1)}%` : 'N/A'}
        </Text>
        <View style={[styles.zoneBadge, { backgroundColor: ddColor + '20', borderColor: ddColor + '60' }]}>
          <Text style={[styles.zoneText, { color: ddColor }]}>from 60d high</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricBox
          label="20d High"
          value={data.from_20d_high !== null ? `${data.from_20d_high.toFixed(1)}%` : 'N/A'}
          color={data.from_20d_high !== null && data.from_20d_high < -5 ? '#ff9800' : undefined}
        />
        <MetricBox
          label="60d High"
          value={data.from_60d_high !== null ? `${data.from_60d_high.toFixed(1)}%` : 'N/A'}
          color={data.from_60d_high !== null && data.from_60d_high < -5 ? '#ff9800' : undefined}
        />
        <MetricBox
          label="1yr High"
          value={data.from_252d_high !== null ? `${data.from_252d_high.toFixed(1)}%` : 'N/A'}
          color={data.from_252d_high !== null && data.from_252d_high < -10 ? '#f44336' : undefined}
        />
      </View>

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- ADX ---
function ADXContent({ data }: { data: AnalysisResponse['indicators']['adx'] }) {
  const adx = data.adx;
  const trendLabel = data.trend_strength === 'very_strong_trend' ? 'Very Strong Trend'
    : data.trend_strength === 'strong_trend' ? 'Strong Trend'
    : data.trend_strength === 'weak_trend' ? 'Weak Trend'
    : 'No Trend';
  const trendColor = adx !== null
    ? adx >= 40 ? '#4caf50' : adx >= 25 ? '#8bc34a' : adx >= 20 ? '#ff9800' : '#f44336'
    : '#888';

  return (
    <View>
      <View style={styles.metricsGrid}>
        <MetricBox label="ADX" value={adx?.toFixed(1) ?? 'N/A'} color={trendColor} />
        <MetricBox label="+DI" value={data.plus_di?.toFixed(1) ?? 'N/A'} color="#4caf50" />
        <MetricBox label="-DI" value={data.minus_di?.toFixed(1) ?? 'N/A'} color="#f44336" />
      </View>

      <View style={[styles.eventBanner, { backgroundColor: trendColor + '15', borderColor: trendColor + '40' }]}>
        <View style={[styles.eventDot, { backgroundColor: trendColor }]} />
        <Text style={[styles.eventLabel, { color: trendColor }]}>{trendLabel}</Text>
      </View>

      {/* ADX gauge */}
      {adx !== null && (
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeSection, { left: '0%', width: '40%', backgroundColor: '#f4433610' }]} />
            <View style={[styles.gaugeSection, { left: '50%', width: '50%', backgroundColor: '#4caf5010' }]} />
            <View style={[styles.gaugeMarker, { left: `${Math.min(adx, 60) / 60 * 100}%` }]} />
            <View style={[styles.refLine, { left: `${20 / 60 * 100}%` }]} />
            <View style={[styles.refLine, { left: `${25 / 60 * 100}%` }]} />
            <View style={[styles.refLine, { left: `${40 / 60 * 100}%` }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>0</Text>
            <Text style={[styles.gaugeLabel, { color: '#ff9800' }]}>20</Text>
            <Text style={[styles.gaugeLabel, { color: '#8bc34a' }]}>25</Text>
            <Text style={[styles.gaugeLabel, { color: '#4caf50' }]}>40</Text>
            <Text style={styles.gaugeLabel}>60</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- ATR ---
function ATRContent({ data, price }: { data: AnalysisResponse['indicators']['atr']; price: number }) {
  return (
    <View>
      <View style={styles.metricsGrid}>
        <MetricBox label="ATR" value={data.atr !== null ? `$${data.atr.toFixed(2)}` : 'N/A'} />
        <MetricBox label="ATR %" value={data.atr_pct !== null ? `${data.atr_pct.toFixed(2)}%` : 'N/A'} />
        <MetricBox label="Price" value={`$${price.toFixed(2)}`} />
      </View>
      <View style={[styles.eventBanner, { backgroundColor: '#6c9bd115', borderColor: '#6c9bd135' }]}>
        <Text style={[styles.eventLabel, { color: '#999' }]}>
          Daily avg movement: ${data.atr?.toFixed(2) ?? '?'} ({data.atr_pct?.toFixed(1) ?? '?'}% of price)
        </Text>
      </View>
    </View>
  );
}

// --- MA Distance ---
function MADistContent({ data }: { data: AnalysisResponse['indicators']['ma_distance'] }) {
  const items = [
    { label: 'SMA 20', value: data.from_sma20 },
    { label: 'SMA 50', value: data.from_sma50 },
    { label: 'SMA 200', value: data.from_sma200 },
  ];

  return (
    <View>
      <View style={styles.metricsGrid}>
        {items.map(({ label, value }) => (
          <MetricBox
            key={label}
            label={label}
            value={value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : 'N/A'}
            color={value !== null ? (value > 0 ? '#4caf50' : '#f44336') : undefined}
          />
        ))}
      </View>

      {items.map(({ label, value }) => {
        if (value === null) return null;
        const absVal = Math.abs(value);
        const barWidth = Math.min(absVal / 10 * 100, 100);
        const color = value > 0 ? '#4caf50' : '#f44336';
        return (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
            <Text style={{ color: '#777', fontSize: 12, width: 55 }}>{label}</Text>
            <View style={{ flex: 1, height: 10, backgroundColor: '#222244', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{
                position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: '#444',
              }} />
              <View style={{
                position: 'absolute',
                [value > 0 ? 'left' : 'right']: '50%',
                top: 0, bottom: 0,
                width: `${barWidth / 2}%`,
                backgroundColor: color,
                opacity: 0.5,
                borderRadius: 5,
              }} />
            </View>
            <Text style={{ color, fontSize: 12, fontWeight: '600', width: 50, textAlign: 'right' }}>
              {value > 0 ? '+' : ''}{value.toFixed(1)}%
            </Text>
          </View>
        );
      })}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Consecutive Days ---
function ConsecContent({ data }: { data: AnalysisResponse['indicators']['consecutive'] }) {
  const days = data.days;
  const isUp = days > 0;
  const color = Math.abs(days) >= 5
    ? (isUp ? '#ff9800' : '#4caf50')
    : Math.abs(days) >= 3
    ? (isUp ? '#ffc107' : '#8bc34a')
    : '#888';

  return (
    <View>
      <View style={styles.valueDisplay}>
        <Text style={[styles.bigValue, { color }]}>
          {days > 0 ? '+' : ''}{days}
        </Text>
        <View style={[styles.zoneBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
          <Text style={[styles.zoneText, { color }]}>
            {data.streak_type === 'up' ? 'Consecutive Up' : data.streak_type === 'down' ? 'Consecutive Down' : 'Flat'}
          </Text>
        </View>
      </View>

      {data.probability && <ProbabilityCard data={data.probability} />}
      {!data.probability && Math.abs(days) < 3 && (
        <View style={[styles.eventBanner, { backgroundColor: '#88888815', borderColor: '#88888835' }]}>
          <Text style={[styles.eventLabel, { color: '#666' }]}>
            Probability data available when streak reaches 3+ days
          </Text>
        </View>
      )}
    </View>
  );
}

// --- 52-Week Position ---
function Week52Content({ data }: { data: AnalysisResponse['indicators']['week52'] }) {
  const pos = data.position_pct;
  const posColor = pos !== null
    ? pos >= 90 ? '#f44336' : pos >= 70 ? '#ff9800' : pos <= 10 ? '#4caf50' : pos <= 30 ? '#8bc34a' : '#888'
    : '#888';

  return (
    <View>
      <View style={styles.valueDisplay}>
        <Text style={[styles.bigValue, { color: posColor }]}>
          {pos !== null ? `${pos.toFixed(0)}%` : 'N/A'}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricBox label="52W Low" value={data.low !== null ? `$${data.low.toFixed(2)}` : 'N/A'} />
        <MetricBox label="52W High" value={data.high !== null ? `$${data.high.toFixed(2)}` : 'N/A'} />
      </View>

      {/* Position bar */}
      {pos !== null && (
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeSection, { left: '0%', width: '10%', backgroundColor: '#4caf5015' }]} />
            <View style={[styles.gaugeSection, { left: '90%', width: '10%', backgroundColor: '#f4433615' }]} />
            <View style={[styles.gaugeMarker, { left: `${Math.min(Math.max(pos, 0), 100)}%` }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={[styles.gaugeLabel, { color: '#4caf50' }]}>Low</Text>
            <Text style={styles.gaugeLabel}>25%</Text>
            <Text style={styles.gaugeLabel}>50%</Text>
            <Text style={styles.gaugeLabel}>75%</Text>
            <Text style={[styles.gaugeLabel, { color: '#f44336' }]}>High</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Shared sub-components ---
function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

const styles = StyleSheet.create({
  // Card container
  card: {
    backgroundColor: '#12122a',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e3e',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#16163a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    color: '#6c9bd1',
    fontSize: 16,
    fontWeight: '800',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#6c9bd118',
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    color: '#666',
    fontSize: 18,
    fontWeight: '300',
  },
  cardBody: {
    padding: 16,
  },

  // Value display
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bigValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  zoneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Gauge
  gaugeContainer: {
    marginVertical: 12,
  },
  gaugeTrack: {
    height: 10,
    backgroundColor: '#222244',
    borderRadius: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeSection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  gaugeMarker: {
    position: 'absolute',
    top: -3,
    width: 4,
    height: 16,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginLeft: -2,
  },
  gaugeMarkerD: {
    position: 'absolute',
    top: -1,
    width: 3,
    height: 12,
    backgroundColor: '#ff980080',
    borderRadius: 2,
    marginLeft: -1.5,
  },
  refLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#333355',
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gaugeLabel: {
    color: '#555',
    fontSize: 10,
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#1a1a3a',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#777',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '700',
  },

  // Event banner
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // MA-specific
  maRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e3e',
  },
  maLabel: {
    color: '#888',
    fontSize: 13,
    width: 70,
  },
  maValue: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  maDiff: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },

  // BB visualizer
  bbVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  bbTrack: {
    width: 24,
    height: 80,
    backgroundColor: '#222244',
    borderRadius: 4,
    position: 'relative',
    overflow: 'visible',
  },
  bbFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#6c9bd120',
    borderRadius: 4,
  },
  bbMiddleLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: '#555',
  },
  bbMarker: {
    position: 'absolute',
    left: 28,
    marginBottom: -8,
  },
  bbMarkerText: {
    color: '#6c9bd1',
    fontSize: 13,
    fontWeight: '700',
  },
  bbLabels: {
    justifyContent: 'space-between',
    height: 80,
  },
  bbLabel: {
    color: '#555',
    fontSize: 10,
  },

  // Volume bar
  volBarContainer: {
    marginVertical: 8,
  },
  volBarTrack: {
    height: 12,
    backgroundColor: '#222244',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  volBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
    opacity: 0.6,
  },
  volBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

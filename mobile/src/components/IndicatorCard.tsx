import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import type { AnalysisResponse } from '../types/analysis';
import ProbabilityCard from './ProbabilityCard';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing, typography, type ThemeColors } from '../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  type: string;
  data: AnalysisResponse;
}

// Module-level style cache to avoid re-creating styles in every sub-component
let _cachedColors: ThemeColors | null = null;
let _cachedStyles: ReturnType<typeof makeStyles> | null = null;
function getStyles(c: ThemeColors) {
  if (_cachedColors === c && _cachedStyles) return _cachedStyles;
  _cachedColors = c;
  _cachedStyles = makeStyles(c);
  return _cachedStyles;
}

export default function IndicatorCard({ type, data }: Props) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const { title, icon, content } = getCardContent(type, data);

  return (
    <View style={s.card}>
      <Pressable style={s.cardHeader} onPress={toggle}>
        <View style={s.headerLeft}>
          <Text style={s.icon}>{icon}</Text>
          <Text style={s.title}>{title}</Text>
        </View>
        <Text style={s.chevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && (
        <View style={s.cardBody}>
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
      return { title: 'RSI (14)', icon: 'R', content: <RSIContent data={indicators.rsi} /> };
    case 'MACD':
      return { title: 'MACD (12,26,9)', icon: 'M', content: <MACDContent data={indicators.macd} /> };
    case 'MA':
      return { title: 'Moving Averages', icon: 'A', content: <MAContent data={indicators.ma} /> };
    case 'BB':
      return { title: 'Bollinger Bands', icon: 'B', content: <BBContent data={indicators.bb} /> };
    case 'Vol':
      return { title: 'Volume Analysis', icon: 'V', content: <VolContent data={indicators.volume} /> };
    case 'Stoch':
      return { title: 'Stochastic (14,3)', icon: 'S', content: <StochContent data={indicators.stochastic} /> };
    case 'Drawdown':
      return { title: 'Drawdown from High', icon: 'D', content: <DrawdownContent data={indicators.drawdown} /> };
    case 'ADX':
      return { title: 'ADX (Trend Strength)', icon: 'X', content: <ADXContent data={indicators.adx} /> };
    case 'ATR':
      return { title: 'ATR (Volatility)', icon: 'T', content: <ATRContent data={indicators.atr} price={indicators.ma.price} /> };
    case 'MADist':
      return { title: 'MA Distance', icon: 'G', content: <MADistContent data={indicators.ma_distance} /> };
    case 'Consec':
      return { title: 'Consecutive Days', icon: 'C', content: <ConsecContent data={indicators.consecutive} /> };
    case 'W52':
      return { title: '52-Week Position', icon: 'W', content: <Week52Content data={indicators.week52} /> };
    default:
      return { title: type, icon: '?', content: null };
  }
}

// --- RSI ---
function RSIContent({ data }: { data: AnalysisResponse['indicators']['rsi'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const value = data.value;
  const zone = value !== null
    ? value > 70 ? 'Overbought' : value < 30 ? 'Oversold' : 'Neutral'
    : null;
  const zoneColor = zone === 'Overbought' ? colors.bearish : zone === 'Oversold' ? colors.bullish : colors.textMuted;

  return (
    <View>
      <View style={s.valueDisplay}>
        <Text style={s.bigValue}>{value !== null ? value.toFixed(1) : 'N/A'}</Text>
        {zone && (
          <View style={[s.zoneBadge, { backgroundColor: zoneColor + '20', borderColor: zoneColor + '60' }]}>
            <Text style={[s.zoneText, { color: zoneColor }]}>{zone}</Text>
          </View>
        )}
      </View>

      {value !== null && (
        <View style={s.gaugeContainer}>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeSection, { left: '0%', width: '30%', backgroundColor: colors.bullish + '15' }]} />
            <View style={[s.gaugeSection, { left: '70%', width: '30%', backgroundColor: colors.bearish + '15' }]} />
            <View style={[s.gaugeMarker, { left: `${Math.min(Math.max(value, 0), 100)}%` }]} />
            <View style={[s.refLine, { left: '30%' }]} />
            <View style={[s.refLine, { left: '50%', backgroundColor: colors.textMuted }]} />
            <View style={[s.refLine, { left: '70%' }]} />
          </View>
          <View style={s.gaugeLabels}>
            <Text style={s.gaugeLabel}>0</Text>
            <Text style={[s.gaugeLabel, { color: colors.bullish }]}>30</Text>
            <Text style={s.gaugeLabel}>50</Text>
            <Text style={[s.gaugeLabel, { color: colors.bearish }]}>70</Text>
            <Text style={s.gaugeLabel}>100</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- MACD ---
function MACDContent({ data }: { data: AnalysisResponse['indicators']['macd'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const eventLabels: Record<string, { label: string; color: string }> = {
    golden_cross: { label: 'Golden Cross', color: colors.bullish },
    dead_cross: { label: 'Dead Cross', color: colors.bearish },
    positive: { label: 'Positive', color: colors.success },
    negative: { label: 'Negative', color: colors.warning },
  };

  const event = data.event ? eventLabels[data.event] : null;

  return (
    <View>
      <View style={s.metricsGrid}>
        <MetricBox label="MACD" value={data.macd?.toFixed(4) ?? 'N/A'} />
        <MetricBox label="Signal" value={data.signal?.toFixed(4) ?? 'N/A'} />
        <MetricBox
          label="Histogram"
          value={data.histogram?.toFixed(4) ?? 'N/A'}
          color={data.histogram && data.histogram > 0 ? colors.bullish : colors.bearish}
        />
      </View>

      {event && (
        <View style={[s.eventBanner, { backgroundColor: event.color + '15', borderColor: event.color + '40' }]}>
          <View style={[s.eventDot, { backgroundColor: event.color }]} />
          <Text style={[s.eventLabel, { color: event.color }]}>{event.label}</Text>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- MA ---
function MAContent({ data }: { data: AnalysisResponse['indicators']['ma'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const alignmentLabels: Record<string, { label: string; color: string }> = {
    bullish: { label: 'Bullish Alignment (20 > 50 > 200)', color: colors.bullish },
    bearish: { label: 'Bearish Alignment (20 < 50 < 200)', color: colors.bearish },
    none: { label: 'No Clear Alignment', color: colors.textMuted },
  };

  const alignment = alignmentLabels[data.alignment] ?? alignmentLabels.none;

  const maValues = [
    { label: 'SMA 20', value: data.sma20 },
    { label: 'SMA 50', value: data.sma50 },
    { label: 'SMA 200', value: data.sma200 },
  ];

  return (
    <View>
      <View style={[s.eventBanner, { backgroundColor: alignment.color + '12', borderColor: alignment.color + '35' }]}>
        <View style={[s.eventDot, { backgroundColor: alignment.color }]} />
        <Text style={[s.eventLabel, { color: alignment.color }]}>{alignment.label}</Text>
      </View>

      {maValues.map(({ label, value }) => {
        const diff = value !== null ? ((data.price - value) / value * 100) : null;
        return (
          <View key={label} style={s.maRow}>
            <Text style={s.maLabel}>{label}</Text>
            <Text style={s.maValue}>${value?.toFixed(2) ?? 'N/A'}</Text>
            {diff !== null && (
              <Text style={[s.maDiff, { color: diff >= 0 ? colors.bullish : colors.bearish }]}>
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
  const { colors } = useTheme();
  const s = getStyles(colors);
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
      <View style={s.metricsGrid}>
        <MetricBox label="Upper" value={`$${data.upper?.toFixed(2) ?? 'N/A'}`} />
        <MetricBox label="Middle" value={`$${data.middle?.toFixed(2) ?? 'N/A'}`} />
        <MetricBox label="Lower" value={`$${data.lower?.toFixed(2) ?? 'N/A'}`} />
      </View>

      {position !== null && (
        <View style={s.bbVisual}>
          <View style={s.bbTrack}>
            <View style={[s.bbFill, { height: `${Math.min(Math.max(position, 0), 100)}%` }]} />
            <View style={s.bbMiddleLine} />
            <View style={[s.bbMarker, { bottom: `${Math.min(Math.max(position, 0), 100)}%` }]}>
              <Text style={[s.bbMarkerText, { color: colors.accent }]}>{position.toFixed(0)}%</Text>
            </View>
          </View>
          <View style={s.bbLabels}>
            <Text style={s.bbLabel}>Upper</Text>
            <Text style={s.bbLabel}>Middle</Text>
            <Text style={s.bbLabel}>Lower</Text>
          </View>
        </View>
      )}

      {data.zone && (
        <View style={[s.eventBanner, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' }]}>
          <Text style={[s.eventLabel, { color: colors.accent }]}>{zoneLabels[data.zone] ?? data.zone}</Text>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Volume ---
function VolContent({ data }: { data: AnalysisResponse['indicators']['volume'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const ratio = data.ratio ?? 0;
  const ratioColor = ratio >= 2 ? colors.warning : ratio >= 1.2 ? colors.success : colors.textMuted;

  return (
    <View>
      <View style={s.metricsGrid}>
        <MetricBox label="Current" value={formatNumber(data.current)} />
        <MetricBox label="20d Avg" value={formatNumber(data.avg20)} />
        <MetricBox label="Ratio" value={`${ratio.toFixed(2)}x`} color={ratioColor} />
      </View>

      <View style={s.volBarContainer}>
        <View style={s.volBarTrack}>
          <View
            style={[
              s.volBarFill,
              {
                width: `${Math.min(ratio / 3 * 100, 100)}%`,
                backgroundColor: ratioColor,
              },
            ]}
          />
          <View style={[s.refLine, { left: `${(1 / 3) * 100}%` }]} />
          <View style={[s.refLine, { left: `${(2 / 3) * 100}%` }]} />
        </View>
        <View style={s.volBarLabels}>
          <Text style={s.gaugeLabel}>0x</Text>
          <Text style={s.gaugeLabel}>1x</Text>
          <Text style={s.gaugeLabel}>2x</Text>
          <Text style={s.gaugeLabel}>3x+</Text>
        </View>
      </View>

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Stochastic ---
function StochContent({ data }: { data: AnalysisResponse['indicators']['stochastic'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const k = data.k;
  const d = data.d;
  const zone = k !== null
    ? k > 80 ? 'Overbought' : k < 20 ? 'Oversold' : 'Neutral'
    : null;
  const zoneColor = zone === 'Overbought' ? colors.bearish : zone === 'Oversold' ? colors.bullish : colors.textMuted;

  return (
    <View>
      <View style={s.metricsGrid}>
        <MetricBox label="%K" value={k?.toFixed(1) ?? 'N/A'} />
        <MetricBox label="%D" value={d?.toFixed(1) ?? 'N/A'} />
        {zone && (
          <View style={[s.metricBox, { backgroundColor: zoneColor + '12' }]}>
            <Text style={s.metricLabel}>Zone</Text>
            <Text style={[s.metricValue, { color: zoneColor }]}>{zone}</Text>
          </View>
        )}
      </View>

      {k !== null && (
        <View style={s.gaugeContainer}>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeSection, { left: '0%', width: '20%', backgroundColor: colors.bullish + '15' }]} />
            <View style={[s.gaugeSection, { left: '80%', width: '20%', backgroundColor: colors.bearish + '15' }]} />
            <View style={[s.gaugeMarker, { left: `${Math.min(Math.max(k, 0), 100)}%` }]} />
            {d !== null && (
              <View style={[s.gaugeMarkerD, { left: `${Math.min(Math.max(d, 0), 100)}%` }]} />
            )}
            <View style={[s.refLine, { left: '20%' }]} />
            <View style={[s.refLine, { left: '80%' }]} />
          </View>
          <View style={s.gaugeLabels}>
            <Text style={s.gaugeLabel}>0</Text>
            <Text style={[s.gaugeLabel, { color: colors.bullish }]}>20</Text>
            <Text style={s.gaugeLabel}>50</Text>
            <Text style={[s.gaugeLabel, { color: colors.bearish }]}>80</Text>
            <Text style={s.gaugeLabel}>100</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Drawdown ---
function DrawdownContent({ data }: { data: AnalysisResponse['indicators']['drawdown'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const dd60 = data.from_60d_high;
  const ddColor = dd60 !== null
    ? dd60 <= -20 ? colors.bearish : dd60 <= -10 ? colors.warning : dd60 <= -5 ? colors.warning : colors.bullish
    : colors.textMuted;

  return (
    <View>
      <View style={s.valueDisplay}>
        <Text style={[s.bigValue, { color: ddColor }]}>
          {dd60 !== null ? `${dd60.toFixed(1)}%` : 'N/A'}
        </Text>
        <View style={[s.zoneBadge, { backgroundColor: ddColor + '20', borderColor: ddColor + '60' }]}>
          <Text style={[s.zoneText, { color: ddColor }]}>from 60d high</Text>
        </View>
      </View>

      <View style={s.metricsGrid}>
        <MetricBox
          label="20d High"
          value={data.from_20d_high !== null ? `${data.from_20d_high.toFixed(1)}%` : 'N/A'}
          color={data.from_20d_high !== null && data.from_20d_high < -5 ? colors.warning : undefined}
        />
        <MetricBox
          label="60d High"
          value={data.from_60d_high !== null ? `${data.from_60d_high.toFixed(1)}%` : 'N/A'}
          color={data.from_60d_high !== null && data.from_60d_high < -5 ? colors.warning : undefined}
        />
        <MetricBox
          label="1yr High"
          value={data.from_252d_high !== null ? `${data.from_252d_high.toFixed(1)}%` : 'N/A'}
          color={data.from_252d_high !== null && data.from_252d_high < -10 ? colors.bearish : undefined}
        />
      </View>

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- ADX ---
function ADXContent({ data }: { data: AnalysisResponse['indicators']['adx'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const adx = data.adx;
  const trendLabel = data.trend_strength === 'very_strong_trend' ? 'Very Strong Trend'
    : data.trend_strength === 'strong_trend' ? 'Strong Trend'
    : data.trend_strength === 'weak_trend' ? 'Weak Trend'
    : 'No Trend';
  const trendColor = adx !== null
    ? adx >= 40 ? colors.bullish : adx >= 25 ? colors.success : adx >= 20 ? colors.warning : colors.bearish
    : colors.textMuted;

  return (
    <View>
      <View style={s.metricsGrid}>
        <MetricBox label="ADX" value={adx?.toFixed(1) ?? 'N/A'} color={trendColor} />
        <MetricBox label="+DI" value={data.plus_di?.toFixed(1) ?? 'N/A'} color={colors.bullish} />
        <MetricBox label="-DI" value={data.minus_di?.toFixed(1) ?? 'N/A'} color={colors.bearish} />
      </View>

      <View style={[s.eventBanner, { backgroundColor: trendColor + '15', borderColor: trendColor + '40' }]}>
        <View style={[s.eventDot, { backgroundColor: trendColor }]} />
        <Text style={[s.eventLabel, { color: trendColor }]}>{trendLabel}</Text>
      </View>

      {adx !== null && (
        <View style={s.gaugeContainer}>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeSection, { left: '0%', width: '40%', backgroundColor: colors.bearish + '10' }]} />
            <View style={[s.gaugeSection, { left: '50%', width: '50%', backgroundColor: colors.bullish + '10' }]} />
            <View style={[s.gaugeMarker, { left: `${Math.min(adx, 60) / 60 * 100}%` }]} />
            <View style={[s.refLine, { left: `${20 / 60 * 100}%` }]} />
            <View style={[s.refLine, { left: `${25 / 60 * 100}%` }]} />
            <View style={[s.refLine, { left: `${40 / 60 * 100}%` }]} />
          </View>
          <View style={s.gaugeLabels}>
            <Text style={s.gaugeLabel}>0</Text>
            <Text style={[s.gaugeLabel, { color: colors.warning }]}>20</Text>
            <Text style={[s.gaugeLabel, { color: colors.success }]}>25</Text>
            <Text style={[s.gaugeLabel, { color: colors.bullish }]}>40</Text>
            <Text style={s.gaugeLabel}>60</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- ATR ---
function ATRContent({ data, price }: { data: AnalysisResponse['indicators']['atr']; price: number }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  return (
    <View>
      <View style={s.metricsGrid}>
        <MetricBox label="ATR" value={data.atr !== null ? `$${data.atr.toFixed(2)}` : 'N/A'} />
        <MetricBox label="ATR %" value={data.atr_pct !== null ? `${data.atr_pct.toFixed(2)}%` : 'N/A'} />
        <MetricBox label="Price" value={`$${price.toFixed(2)}`} />
      </View>
      <View style={[s.eventBanner, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' }]}>
        <Text style={[s.eventLabel, { color: colors.textSecondary }]}>
          Daily avg movement: ${data.atr?.toFixed(2) ?? '?'} ({data.atr_pct?.toFixed(1) ?? '?'}% of price)
        </Text>
      </View>
    </View>
  );
}

// --- MA Distance ---
function MADistContent({ data }: { data: AnalysisResponse['indicators']['ma_distance'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const items = [
    { label: 'SMA 20', value: data.from_sma20 },
    { label: 'SMA 50', value: data.from_sma50 },
    { label: 'SMA 200', value: data.from_sma200 },
  ];

  return (
    <View>
      <View style={s.metricsGrid}>
        {items.map(({ label, value }) => (
          <MetricBox
            key={label}
            label={label}
            value={value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : 'N/A'}
            color={value !== null ? (value > 0 ? colors.bullish : colors.bearish) : undefined}
          />
        ))}
      </View>

      {items.map(({ label, value }) => {
        if (value === null) return null;
        const absVal = Math.abs(value);
        const barWidth = Math.min(absVal / 10 * 100, 100);
        const color = value > 0 ? colors.bullish : colors.bearish;
        return (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, width: 55 }}>{label}</Text>
            <View style={{ flex: 1, height: 10, backgroundColor: colors.bgElevated, borderRadius: 5, overflow: 'hidden' }}>
              <View style={{
                position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: colors.border,
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
  const { colors } = useTheme();
  const s = getStyles(colors);
  const days = data.days;
  const isUp = days > 0;
  const color = Math.abs(days) >= 5
    ? (isUp ? colors.warning : colors.bullish)
    : Math.abs(days) >= 3
    ? (isUp ? colors.warning : colors.success)
    : colors.textMuted;

  return (
    <View>
      <View style={s.valueDisplay}>
        <Text style={[s.bigValue, { color }]}>
          {days > 0 ? '+' : ''}{days}
        </Text>
        <View style={[s.zoneBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
          <Text style={[s.zoneText, { color }]}>
            {data.streak_type === 'up' ? 'Consecutive Up' : data.streak_type === 'down' ? 'Consecutive Down' : 'Flat'}
          </Text>
        </View>
      </View>

      {data.probability && <ProbabilityCard data={data.probability} />}
      {!data.probability && Math.abs(days) < 3 && (
        <View style={[s.eventBanner, { backgroundColor: colors.textMuted + '15', borderColor: colors.textMuted + '35' }]}>
          <Text style={[s.eventLabel, { color: colors.textMuted }]}>
            Probability data available when streak reaches 3+ days
          </Text>
        </View>
      )}
    </View>
  );
}

// --- 52-Week Position ---
function Week52Content({ data }: { data: AnalysisResponse['indicators']['week52'] }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  const pos = data.position_pct;
  const posColor = pos !== null
    ? pos >= 90 ? colors.bearish : pos >= 70 ? colors.warning : pos <= 10 ? colors.bullish : pos <= 30 ? colors.success : colors.textMuted
    : colors.textMuted;

  return (
    <View>
      <View style={s.valueDisplay}>
        <Text style={[s.bigValue, { color: posColor }]}>
          {pos !== null ? `${pos.toFixed(0)}%` : 'N/A'}
        </Text>
      </View>

      <View style={s.metricsGrid}>
        <MetricBox label="52W Low" value={data.low !== null ? `$${data.low.toFixed(2)}` : 'N/A'} />
        <MetricBox label="52W High" value={data.high !== null ? `$${data.high.toFixed(2)}` : 'N/A'} />
      </View>

      {pos !== null && (
        <View style={s.gaugeContainer}>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeSection, { left: '0%', width: '10%', backgroundColor: colors.bullish + '15' }]} />
            <View style={[s.gaugeSection, { left: '90%', width: '10%', backgroundColor: colors.bearish + '15' }]} />
            <View style={[s.gaugeMarker, { left: `${Math.min(Math.max(pos, 0), 100)}%` }]} />
          </View>
          <View style={s.gaugeLabels}>
            <Text style={[s.gaugeLabel, { color: colors.bullish }]}>Low</Text>
            <Text style={s.gaugeLabel}>25%</Text>
            <Text style={s.gaugeLabel}>50%</Text>
            <Text style={s.gaugeLabel}>75%</Text>
            <Text style={[s.gaugeLabel, { color: colors.bearish }]}>High</Text>
          </View>
        </View>
      )}

      {data.probability && <ProbabilityCard data={data.probability} />}
    </View>
  );
}

// --- Shared sub-components ---
function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  const s = getStyles(colors);
  return (
    <View style={s.metricBox}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, color ? { color } : {}]}>{value}</Text>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // Card container
  card: {
    backgroundColor: c.bgCard,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: c.bgElevated,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    color: c.accent,
    ...typography.bodyBold,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: c.accentDim,
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    color: c.textPrimary,
    ...typography.bodyBold,
  },
  chevron: {
    color: c.textMuted,
    fontSize: 18,
    fontWeight: '300',
  },
  cardBody: {
    padding: spacing.lg,
  },

  // Value display
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bigValue: {
    color: c.textPrimary,
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
    backgroundColor: c.bgElevated,
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
    backgroundColor: c.textPrimary,
    borderRadius: 2,
    marginLeft: -2,
  },
  gaugeMarkerD: {
    position: 'absolute',
    top: -1,
    width: 3,
    height: 12,
    backgroundColor: `${c.warning}80`,
    borderRadius: 2,
    marginLeft: -1.5,
  },
  refLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: c.border,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gaugeLabel: {
    color: c.textMuted,
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
    backgroundColor: c.bgElevated,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    color: c.textPrimary,
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
    borderBottomColor: c.border,
  },
  maLabel: {
    color: c.textMuted,
    fontSize: 13,
    width: 70,
  },
  maValue: {
    color: c.textPrimary,
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
    backgroundColor: c.bgElevated,
    borderRadius: 4,
    position: 'relative',
    overflow: 'visible',
  },
  bbFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.accent + '20',
    borderRadius: 4,
  },
  bbMiddleLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: c.textMuted,
  },
  bbMarker: {
    position: 'absolute',
    left: 28,
    marginBottom: -8,
  },
  bbMarkerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bbLabels: {
    justifyContent: 'space-between',
    height: 80,
  },
  bbLabel: {
    color: c.textMuted,
    fontSize: 10,
  },

  // Volume bar
  volBarContainer: {
    marginVertical: 8,
  },
  volBarTrack: {
    height: 12,
    backgroundColor: c.bgElevated,
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

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { typography, type ThemeColors } from '../theme';

interface Props {
  value: number;
  label: string;
  size?: number;
  color?: string;
}

export default function MiniGauge({ value, label, size = 64, color }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const strokeWidth = 4;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(Math.max(value / 100, 0), 1);
  const strokeDashoffset = circumference * (1 - progress);

  const fillColor = color || (
    value >= 70 ? colors.bearish :
    value <= 30 ? colors.bullish :
    colors.accent
  );

  return (
    <View style={[s.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgElevated} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={fillColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} opacity={0.8}
        />
      </Svg>
      <View style={s.textOverlay}>
        <Text style={[s.value, { color: fillColor }]}>{Math.round(value)}</Text>
        <Text style={s.label}>{label}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  textOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  value: { ...typography.numberSm, fontSize: 15 },
  label: { color: c.textMuted, fontSize: 8, fontWeight: '500', marginTop: -1 },
});

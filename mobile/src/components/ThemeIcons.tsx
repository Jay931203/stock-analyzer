import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * Lucide-style Sun icon (matches lucide-react <Sun />).
 * A circle with 8 radiating lines.
 */
export function SunIcon({ size = 16, color = '#666' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={4} />
      <Line x1={12} y1={2} x2={12} y2={4} />
      <Line x1={12} y1={20} x2={12} y2={22} />
      <Line x1={4.93} y1={4.93} x2={6.34} y2={6.34} />
      <Line x1={17.66} y1={17.66} x2={19.07} y2={19.07} />
      <Line x1={2} y1={12} x2={4} y2={12} />
      <Line x1={20} y1={12} x2={22} y2={12} />
      <Line x1={4.93} y1={19.07} x2={6.34} y2={17.66} />
      <Line x1={17.66} y1={6.34} x2={19.07} y2={4.93} />
    </Svg>
  );
}

/**
 * Lucide-style Moon icon (matches lucide-react <Moon />).
 * A crescent moon shape.
 */
export function MoonIcon({ size = 16, color = '#666' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Svg>
  );
}

/**
 * Lucide-style Monitor icon (matches lucide-react <Monitor />).
 * A desktop monitor shape.
 */
/**
 * Lucide-style Search icon.
 */
export function SearchIcon({ size = 16, color = '#666' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
  );
}

export function MonitorIcon({ size = 16, color = '#666' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={3} width={20} height={14} rx={2} ry={2} />
      <Line x1={8} y1={21} x2={16} y2={21} />
      <Line x1={12} y1={17} x2={12} y2={21} />
    </Svg>
  );
}

/**
 * Lucide-style ChevronLeft icon.
 */
export function ChevronLeftIcon({ size = 16, color = '#666' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

/**
 * Lucide-style Star icon.
 */
export function StarIcon({ size = 16, color = '#666', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

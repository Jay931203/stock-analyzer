/**
 * Design system tokens for Stock Analyzer.
 * Single source of truth for colors, spacing, typography, and component styles.
 */

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgCardHover: string;
  bgElevated: string;
  bgOverlay: string;
  border: string;
  borderLight: string;
  borderAccent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentDim: string;
  accentGlow: string;
  bullish: string;
  bullishBg: string;
  bearish: string;
  bearishBg: string;
  neutral: string;
  neutralBg: string;
  success: string;
  warning: string;
  error: string;
  gradientAccent: string[];
  gradientBullish: string[];
  gradientBearish: string[];
}

export const darkColors: ThemeColors = {
  bg: '#060612',
  bgCard: '#0f0f23',
  bgCardHover: '#141430',
  bgElevated: '#1a1a36',
  bgOverlay: 'rgba(6,6,18,0.85)',
  border: '#1c1c3a',
  borderLight: '#2a2a50',
  borderAccent: '#3d5afe30',
  textPrimary: '#eaeaff',
  textSecondary: '#9090b0',
  textTertiary: '#606080',
  textMuted: '#404060',
  accent: '#5c6bc0',
  accentLight: '#7986cb',
  accentDim: '#5c6bc020',
  accentGlow: '#5c6bc040',
  bullish: '#26a69a',
  bullishBg: '#26a69a18',
  bearish: '#ef5350',
  bearishBg: '#ef535018',
  neutral: '#78909c',
  neutralBg: '#78909c18',
  success: '#66bb6a',
  warning: '#ffa726',
  error: '#ef5350',
  gradientAccent: ['#5c6bc0', '#3d5afe'],
  gradientBullish: ['#26a69a', '#00897b'],
  gradientBearish: ['#ef5350', '#c62828'],
};

export const lightColors: ThemeColors = {
  bg: '#f4f5f9',
  bgCard: '#ffffff',
  bgCardHover: '#f0f1f5',
  bgElevated: '#e8e9f0',
  bgOverlay: 'rgba(244,245,249,0.9)',
  border: '#dcdde5',
  borderLight: '#c8c9d4',
  borderAccent: '#3d5afe18',
  textPrimary: '#1a1a2e',
  textSecondary: '#505068',
  textTertiary: '#7a7a96',
  textMuted: '#a0a0b8',
  accent: '#4a5ab8',
  accentLight: '#6370c5',
  accentDim: '#4a5ab812',
  accentGlow: '#4a5ab825',
  bullish: '#00897b',
  bullishBg: '#00897b10',
  bearish: '#e53935',
  bearishBg: '#e5393510',
  neutral: '#607d8b',
  neutralBg: '#607d8b10',
  success: '#43a047',
  warning: '#ef6c00',
  error: '#e53935',
  gradientAccent: ['#4a5ab8', '#3d5afe'],
  gradientBullish: ['#00897b', '#00695c'],
  gradientBearish: ['#e53935', '#c62828'],
};

// Default colors for backward compat (used by static StyleSheet.create)
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  bodySm: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelSm: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.3 },
  number: { fontSize: 16, fontWeight: '700' as const },
  numberLg: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -1 },
  numberSm: { fontSize: 13, fontWeight: '600' as const },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

export function formatNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

export function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

export function getDirectionColor(value: number, c: ThemeColors): string {
  if (value > 0) return c.bullish;
  if (value < 0) return c.bearish;
  return c.neutral;
}

export function getWinRateColor(rate: number): string {
  if (rate >= 65) return '#26a69a';
  if (rate >= 55) return '#66bb6a';
  if (rate >= 50) return '#78909c';
  if (rate >= 45) return '#ffa726';
  return '#ef5350';
}

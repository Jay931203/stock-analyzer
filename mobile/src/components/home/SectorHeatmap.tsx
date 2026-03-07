import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, radius, getDirectionColor, type ThemeColors } from '../../theme';

interface SectorHeatmapItem {
  sector: string;
  bullPct: number;
  avgWinRate: number;
  avgChange: number;
  total: number;
}

interface Props {
  sectorHeatmap: SectorHeatmapItem[];
  colors: ThemeColors;
  onSectorPress: (sector: string) => void;
}

function SectorHeatmap({ sectorHeatmap, colors, onSectorPress }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);

  if (sectorHeatmap.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: colors.accent }]} />
        <Text style={s.sectionLabel}>SECTOR HEATMAP</Text>
      </View>
      <View style={s.heatmapGrid}>
        {sectorHeatmap.map(({ sector, bullPct, avgWinRate, avgChange, total }) => {
          const isHot = avgWinRate >= 55;
          const isCold = avgWinRate < 45;
          const tileColor = isHot ? colors.bullish : isCold ? colors.bearish : colors.textMuted;
          const bgOpacity = Math.min(Math.abs(avgWinRate - 50) / 25, 1) * 0.25;
          return (
            <Pressable
              key={sector}
              style={({ pressed }) => [
                s.heatmapTile,
                {
                  backgroundColor: `${tileColor}${Math.round(bgOpacity * 255)
                    .toString(16)
                    .padStart(2, '0')}`,
                  borderColor: `${tileColor}40`,
                },
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.8 },
              ]}
              onPress={() => onSectorPress(sector)}
              accessibilityRole="button"
              accessibilityLabel={`${sector} sector, win rate ${avgWinRate.toFixed(0)}%`}
            >
              <Text style={[s.heatmapSector, { color: colors.textPrimary }]} numberOfLines={1}>
                {sector}
              </Text>
              <Text style={[s.heatmapWr, { color: tileColor }]}>{avgWinRate.toFixed(0)}%</Text>
              <Text style={[s.heatmapChange, { color: getDirectionColor(avgChange, colors) }]}>
                {avgChange >= 0 ? '+' : ''}
                {avgChange.toFixed(1)}%
              </Text>
              <Text style={s.heatmapCount}>{total} stocks</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xs },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    sectionDot: { width: 6, height: 6, borderRadius: 3 },
    sectionLabel: {
      color: c.textTertiary,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      flex: 1,
      textTransform: 'uppercase',
    },
    heatmapGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    heatmapTile: {
      flexBasis: '30%' as any,
      flexGrow: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
      borderWidth: 1,
      alignItems: 'center' as const,
      minWidth: 90,
      maxWidth: '48%' as any,
    },
    heatmapSector: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
    heatmapWr: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    heatmapChange: { fontSize: 10, fontWeight: '600', marginTop: 1 },
    heatmapCount: { color: c.textMuted, fontSize: 10, fontWeight: '500', marginTop: 2 },
  });

export default React.memo(SectorHeatmap);

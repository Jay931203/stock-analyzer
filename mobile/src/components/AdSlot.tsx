import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { spacing, radius, typography } from '../theme';

type AdSize = 'banner' | 'medium-rect' | 'inline';

interface AdSlotProps {
  size: AdSize;
  style?: ViewStyle;
}

const AD_HEIGHTS: Record<AdSize, number> = {
  banner: 50,
  'medium-rect': 250,
  inline: 100,
};

export default function AdSlot({ size, style }: AdSlotProps) {
  const { colors } = useTheme();
  const { isPremium } = usePremium();

  // Premium users see no ads
  if (isPremium) return null;

  const height = AD_HEIGHTS[size];

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.textMuted }]}>Sponsored</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  label: {
    ...typography.labelSm,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});

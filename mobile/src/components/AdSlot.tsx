import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { spacing, radius, typography } from '../theme';

type AdSize = 'banner' | 'medium-rect' | 'inline';

interface AdSlotProps {
  size: AdSize;
  style?: ViewStyle;
}

const AD_HEIGHTS: Record<AdSize, number> = {
  banner: 90,
  'medium-rect': 250,
  inline: 100,
};

const AD_FORMATS: Record<AdSize, string> = {
  banner: 'horizontal',
  'medium-rect': 'rectangle',
  inline: 'fluid',
};

function WebAdSlot({ size }: { size: AdSize }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      } catch {}
    }
  }, []);

  return (
    <div ref={containerRef} style={{ textAlign: 'center', margin: '8px 16px' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5053429721285857"
        data-ad-slot="REPLACE_WITH_ACTUAL_SLOT_ID" // TODO: Get actual slot ID from AdSense dashboard
        data-ad-format={AD_FORMATS[size]}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function AdSlot({ size, style }: AdSlotProps) {
  const { colors } = useTheme();
  const { isPremium } = usePremium();

  if (isPremium) return null;

  // On web: render actual AdSense
  if (Platform.OS === 'web') {
    return <WebAdSlot size={size} />;
  }

  // On native: placeholder (AdMob integration later)
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
      <Text style={[styles.label, { color: colors.textMuted }]}>Ad</Text>
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

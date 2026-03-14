import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { radius, spacing, typography } from '../theme';

interface Props {
  message?: string;
  compact?: boolean;
}

/**
 * Semi-transparent overlay that covers premium content for free users.
 * Place this as an absolute-positioned child on top of the content to gate.
 */
export default function UpgradeOverlay({ message = 'Upgrade to Pro', compact = false }: Props) {
  const { colors } = useTheme();
  const { showPaywall } = usePremium();

  return (
    <View style={[styles.overlay, compact && styles.overlayCompact]}>
      <View style={[styles.card, { backgroundColor: `${colors.bgCard}ee`, borderColor: colors.border }]}>
        <Text style={[styles.lockIcon, compact && styles.lockIconCompact]}>
          {'\uD83D\uDD12'}
        </Text>
        <Text style={[compact ? styles.messageCompact : styles.message, { color: colors.textPrimary }]}>
          {message}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.upgradeBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={showPaywall}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro"
        >
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    zIndex: 10,
  },
  overlayCompact: {
    borderRadius: radius.sm,
  },
  card: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    maxWidth: 240,
  },
  lockIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  lockIconCompact: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.bodyBold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  messageCompact: {
    ...typography.bodySm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  upgradeBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  upgradeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

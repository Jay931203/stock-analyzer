import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePremium, type PlanType } from '../contexts/PremiumContext';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../theme';

const PLAN_CONFIG: Record<PlanType, { label: string; bgColor: string; textColor: string }> = {
  free: { label: 'Free', bgColor: '#78909c20', textColor: '#78909c' },
  pro: { label: 'Pro', bgColor: '#5c6bc020', textColor: '#7986cb' },
  api: { label: 'API', bgColor: '#9c27b020', textColor: '#ba68c8' },
};

export default function PlanBadge() {
  const { plan, isLoading } = usePremium();
  const { colors } = useTheme();

  if (isLoading) return null;

  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

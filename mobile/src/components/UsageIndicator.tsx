import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePremium } from '../contexts/PremiumContext';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../theme';
import api, { type UsageToday } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function UsageIndicator() {
  const { isPro, plan, isLoading: premiumLoading } = usePremium();
  const { colors } = useTheme();
  const { session } = useAuth();
  const [usage, setUsage] = useState<UsageToday | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const data = await api.getUsageToday();
      setUsage(data);
    } catch {
      // Endpoint may not exist yet
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (premiumLoading) return null;

  if (isPro) {
    return (
      <View style={[styles.container, { backgroundColor: `${colors.accent}15` }]}>
        <Text style={[styles.text, { color: colors.accent }]}>
          {plan === 'api' ? 'API' : 'Pro'} {'\u221E'}
        </Text>
      </View>
    );
  }

  // Free user with usage data
  const analysisUsed = usage?.analysis ?? 0;
  const analysisLimit = usage?.limits?.analysis ?? 3;
  const isNearLimit = analysisUsed >= analysisLimit - 1;

  return (
    <View style={[styles.container, {
      backgroundColor: isNearLimit ? `${colors.warning}15` : `${colors.textMuted}15`,
    }]}>
      <Text style={[styles.text, {
        color: isNearLimit ? colors.warning : colors.textMuted,
      }]}>
        {analysisUsed}/{analysisLimit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'] as any,
  },
});

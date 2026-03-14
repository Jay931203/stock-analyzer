import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, radius, typography, type ThemeColors } from '../theme';

const PRO_FEATURES = [
  'Unlimited analysis',
  'Smart Combined Probability',
  'Full signal scanner',
  '5 custom alerts',
  'All 150+ stocks',
];

const API_FEATURES = [
  'Everything in Pro, plus:',
  'REST API access',
  'API key management',
  'Unlimited alerts',
  'Webhook notifications',
  'Priority support',
];

export default function Paywall() {
  const { colors } = useTheme();
  const { paywallVisible, hidePaywall, openCheckout, refreshSubscription } = usePremium();
  const { user, signInWithGoogle } = useAuth();

  const handlePlanSelect = async (plan: 'pro' | 'api') => {
    if (!user) {
      // Need to sign in first
      if (Platform.OS === 'web') {
        await signInWithGoogle();
      }
      return;
    }
    await openCheckout(plan);
  };

  const handleRestore = async () => {
    await refreshSubscription();
  };

  const s = makeStyles(colors);

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      transparent
      onRequestClose={hidePaywall}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Close button */}
          <Pressable
            style={s.closeBtn}
            onPress={hidePaywall}
            accessibilityRole="button"
            accessibilityLabel="Close paywall"
            hitSlop={12}
          >
            <Text style={s.closeBtnText}>{'\u2715'}</Text>
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
            bounces={false}
          >
            {/* Header */}
            <View style={s.header}>
              <View style={s.logoBadge}>
                <Text style={s.logoText}>S</Text>
              </View>
              <Text style={s.headline}>Unlock Full Analysis Power</Text>
              <Text style={s.subheadline}>
                Get deeper insights with advanced probability analysis
              </Text>
            </View>

            {/* Plan Cards */}
            <View style={s.plansRow}>
              {/* Pro Plan */}
              <View style={s.planCard}>
                <View style={s.planHeader}>
                  <Text style={s.planName}>Pro</Text>
                  <View style={s.priceRow}>
                    <Text style={s.priceAmount}>$9.99</Text>
                    <Text style={s.pricePeriod}>/mo</Text>
                  </View>
                </View>

                <View style={s.featureList}>
                  {PRO_FEATURES.map((feature, idx) => (
                    <View key={idx} style={s.featureRow}>
                      <View style={s.checkCircle}>
                        <Text style={s.checkMark}>{'\u2713'}</Text>
                      </View>
                      <Text style={s.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [s.planBtn, s.planBtnPro, pressed && { opacity: 0.85 }]}
                  onPress={() => handlePlanSelect('pro')}
                  accessibilityRole="button"
                  accessibilityLabel="Start Pro plan at $9.99 per month"
                >
                  <Text style={s.planBtnText}>
                    {!user ? 'Sign in to Start' : 'Start Pro'}
                  </Text>
                </Pressable>
              </View>

              {/* API Plan */}
              <View style={[s.planCard, s.planCardApi]}>
                <View style={s.popularBadge}>
                  <Text style={s.popularBadgeText}>POWER USER</Text>
                </View>

                <View style={s.planHeader}>
                  <Text style={s.planName}>API</Text>
                  <View style={s.priceRow}>
                    <Text style={s.priceAmount}>$49</Text>
                    <Text style={s.pricePeriod}>/mo</Text>
                  </View>
                </View>

                <View style={s.featureList}>
                  {API_FEATURES.map((feature, idx) => (
                    <View key={idx} style={s.featureRow}>
                      <View style={[s.checkCircle, idx === 0 ? s.checkCircleHighlight : null]}>
                        <Text style={[s.checkMark, idx === 0 ? s.checkMarkHighlight : null]}>
                          {idx === 0 ? '\u2b50' : '\u2713'}
                        </Text>
                      </View>
                      <Text style={[s.featureText, idx === 0 && s.featureTextHighlight]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [s.planBtn, s.planBtnApi, pressed && { opacity: 0.85 }]}
                  onPress={() => handlePlanSelect('api')}
                  accessibilityRole="button"
                  accessibilityLabel="Start API plan at $49 per month"
                >
                  <Text style={s.planBtnText}>
                    {!user ? 'Sign in to Start' : 'Start API'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Free plan info */}
            <View style={s.freeInfo}>
              <Text style={s.freeInfoText}>
                Free plan: 3 analyses/day, top 5 signals
              </Text>
            </View>

            {/* Restore Purchase */}
            <Pressable
              style={({ pressed }) => [s.restoreBtn, pressed && { opacity: 0.6 }]}
              onPress={handleRestore}
              accessibilityRole="button"
              accessibilityLabel="Restore purchase"
            >
              <Text style={s.restoreBtnText}>Restore Purchase</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: c.bgOverlay,
  },
  sheet: {
    backgroundColor: c.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.border,
    maxHeight: '92%',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: c.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: c.accent,
  },
  headline: {
    ...typography.h2,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subheadline: {
    ...typography.bodySm,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Plans
  plansRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planCard: {
    flex: 1,
    backgroundColor: c.bg,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  planCardApi: {
    borderColor: `${c.accent}60`,
    backgroundColor: `${c.accent}08`,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: c.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.sm,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  planHeader: {
    marginBottom: spacing.md,
  },
  planName: {
    ...typography.h3,
    color: c.textPrimary,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    ...typography.bodySm,
    color: c.textMuted,
    marginLeft: 2,
  },

  // Features
  featureList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: `${c.bullish}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleHighlight: {
    backgroundColor: `${c.accent}20`,
  },
  checkMark: {
    fontSize: 10,
    fontWeight: '700',
    color: c.bullish,
  },
  checkMarkHighlight: {
    fontSize: 9,
    color: c.accent,
  },
  featureText: {
    ...typography.bodySm,
    color: c.textSecondary,
    flex: 1,
  },
  featureTextHighlight: {
    color: c.accent,
    fontWeight: '600',
  },

  // Buttons
  planBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  planBtnPro: {
    backgroundColor: c.accent,
  },
  planBtnApi: {
    backgroundColor: c.accent,
  },
  planBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Free info
  freeInfo: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: c.bgElevated,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  freeInfoText: {
    ...typography.bodySm,
    color: c.textMuted,
  },

  // Restore
  restoreBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  restoreBtnText: {
    ...typography.bodySm,
    color: c.textMuted,
    textDecorationLine: 'underline',
  },
});

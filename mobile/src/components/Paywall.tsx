import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { spacing, radius, typography } from '../theme';

const BENEFITS = [
  { en: 'Unlimited Time Machine queries', ko: '무제한 타임머신 분석' },
  { en: 'Custom indicator combinations', ko: '맞춤 인디케이터 조합' },
  { en: 'Ad-free experience', ko: '광고 없는 환경' },
  { en: 'Export analysis to CSV', ko: 'CSV 내보내기' },
  { en: 'Email alerts for signal changes', ko: '시그널 변경 이메일 알림' },
];

export default function Paywall() {
  const { colors } = useTheme();
  const { paywallVisible, hidePaywall } = usePremium();

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      transparent
      onRequestClose={hidePaywall}
    >
      <View style={[styles.overlay, { backgroundColor: colors.bgOverlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.logoBadge, { backgroundColor: colors.accentDim }]}>
                <Text style={[styles.logoText, { color: colors.accent }]}>S</Text>
              </View>
              <Text style={[styles.appName, { color: colors.textPrimary }]}>Stock Scanner</Text>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Upgrade to Premium
            </Text>
            <Text style={[styles.titleKo, { color: colors.textSecondary }]}>
              프리미엄으로 업그레이드
            </Text>

            {/* Benefits */}
            <View style={styles.benefitsList}>
              {BENEFITS.map((benefit, idx) => (
                <View key={idx} style={styles.benefitRow}>
                  <View style={[styles.checkCircle, { backgroundColor: `${colors.bullish}20` }]}>
                    <Text style={[styles.checkMark, { color: colors.bullish }]}>{'\u2713'}</Text>
                  </View>
                  <View style={styles.benefitText}>
                    <Text style={[styles.benefitEn, { color: colors.textPrimary }]}>
                      {benefit.en}
                    </Text>
                    <Text style={[styles.benefitKo, { color: colors.textTertiary }]}>
                      {benefit.ko}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Price */}
            <View style={[styles.priceBox, { backgroundColor: colors.bgElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.priceAmount, { color: colors.textPrimary }]}>$9.99</Text>
              <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/month</Text>
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.accent },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                // TODO: integrate with RevenueCat / Stripe
                hidePaywall();
              }}
            >
              <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
              <Text style={styles.ctaSubText}>7일 무료 체험 시작하기</Text>
            </Pressable>

            {/* Dismiss */}
            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}
              onPress={hidePaywall}
            >
              <Text style={[styles.dismissText, { color: colors.textMuted }]}>Maybe later</Text>
            </Pressable>

            <Text style={[styles.legalText, { color: colors.textMuted }]}>
              Cancel anytime. Subscription auto-renews monthly.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
  },
  appName: {
    ...typography.bodySm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: 4,
  },
  titleKo: {
    ...typography.bodySm,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  benefitsList: {
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
  },
  benefitText: {
    flex: 1,
  },
  benefitEn: {
    ...typography.body,
    fontWeight: '600',
  },
  benefitKo: {
    ...typography.bodySm,
    marginTop: 2,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  priceUnit: {
    ...typography.body,
    fontWeight: '600',
    marginLeft: 4,
  },
  ctaBtn: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ctaSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  dismissBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  dismissText: {
    ...typography.body,
    fontWeight: '500',
  },
  legalText: {
    ...typography.labelSm,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});

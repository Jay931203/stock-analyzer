import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  const [notifyState, setNotifyState] = useState<'idle' | 'done'>('idle');

  const handleNotifyMe = () => {
    // For now, mark as subscribed. In the future this will call an API to register interest.
    setNotifyState('done');
  };

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
              Premium Features
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We are building advanced tools for serious investors
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

            {/* Launch info */}
            <View style={[styles.launchCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.launchTitle, { color: colors.textPrimary }]}>
                Launching Soon
              </Text>
              <Text style={[styles.launchDesc, { color: colors.textSecondary }]}>
                Premium features are in development. Get notified when they launch.
              </Text>
            </View>

            {/* CTA */}
            {notifyState === 'done' ? (
              <View style={[styles.ctaBtn, { backgroundColor: `${colors.bullish}15` }]}>
                <Text style={[styles.ctaDoneText, { color: colors.bullish }]}>
                  {user ? 'You will be notified at launch' : 'Subscribed for updates'}
                </Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.ctaBtn,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleNotifyMe}
                accessibilityRole="button"
                accessibilityLabel="Get notified when premium launches"
              >
                <Text style={styles.ctaText}>Notify Me</Text>
                <Text style={styles.ctaSubText}>Get notified at launch</Text>
              </Pressable>
            )}

            {/* Dismiss */}
            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}
              onPress={hidePaywall}
              accessibilityRole="button"
              accessibilityLabel="Close premium info"
            >
              <Text style={[styles.dismissText, { color: colors.textMuted }]}>Close</Text>
            </Pressable>
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
  subtitle: {
    ...typography.bodySm,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
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
  launchCard: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  launchTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  launchDesc: {
    ...typography.bodySm,
    textAlign: 'center',
    lineHeight: 18,
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
  ctaDoneText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  dismissText: {
    ...typography.body,
    fontWeight: '500',
  },
});

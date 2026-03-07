import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../src/theme';
import { ChevronLeftIcon } from '../src/components/ThemeIcons';

const EFFECTIVE_DATE = '2026-03-07';

export default function TermsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const s = useMemo(() => styles(colors), [colors]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          style={({ pressed }) => [s.backButton, pressed && { opacity: 0.6 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ChevronLeftIcon size={14} color={colors.accent} />
            <Text style={s.backText}>Back</Text>
          </View>
        </Pressable>
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* English */}
        <Text style={s.sectionTitle}>Terms of Service</Text>
        <Text style={s.date}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Text style={s.paragraph}>
          Welcome to Stock Scanner ("the App"). By accessing or using the App, you agree to be bound
          by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use
          the App.
        </Text>

        <Text style={s.heading}>1. Service Description</Text>
        <Text style={s.paragraph}>
          Stock Scanner is a stock signal analysis tool that evaluates technical indicators against
          historical market data to generate statistical probability signals for US equities. The App
          provides backtesting features, win rate calculations, and forward return projections based
          on historical patterns.
        </Text>

        <Text style={s.heading}>2. No Investment Advice</Text>
        <Text style={s.paragraph}>
          The signals, win rates, average returns, and all other data provided by the App are
          statistical patterns derived from historical market data. They do NOT constitute financial
          advice, investment recommendations, or solicitation to buy or sell any securities.
        </Text>
        <Text style={s.paragraph}>
          You acknowledge that all investment decisions are made solely at your own risk and
          discretion. You should consult a qualified financial advisor before making any investment
          decisions.
        </Text>

        <Text style={s.heading}>3. Subscription Terms</Text>
        <Text style={s.paragraph}>
          Stock Scanner offers a premium subscription plan at $9.99 per month (USD). Subscriptions
          are billed on a monthly recurring basis and will auto-renew at the end of each billing
          cycle unless cancelled. You may cancel your subscription at any time through your account
          settings. Cancellation takes effect at the end of the current billing period, and you will
          retain access to premium features until then.
        </Text>
        <Text style={s.paragraph}>
          We reserve the right to modify subscription pricing with at least 30 days' advance notice.
          Continued use of the premium service after a price change constitutes acceptance of the
          new pricing.
        </Text>

        <Text style={s.heading}>4. Refund Policy</Text>
        <Text style={s.paragraph}>
          No refunds will be issued for partial months of service. If you cancel your subscription,
          you will continue to have access to premium features until the end of your current billing
          period. To avoid being charged for the next cycle, please cancel before your renewal date.
        </Text>

        <Text style={s.heading}>5. Data Sources</Text>
        <Text style={s.paragraph}>
          The App retrieves publicly available stock market data from Yahoo Finance and other public
          market data providers. We do not guarantee the accuracy, completeness, or timeliness of
          data provided by third-party sources. Market data may be delayed and should not be relied
          upon for real-time trading decisions.
        </Text>

        <Text style={s.heading}>6. Accuracy Disclaimer</Text>
        <Text style={s.paragraph}>
          Past performance does not guarantee future results. Win rates, average returns, and
          probability statistics displayed in the App are based on historical data analysis and
          represent what happened in past market conditions. Market conditions change, and historical
          patterns may not repeat. The App makes no warranty or representation regarding the
          accuracy of its predictions or the profitability of any trading strategy.
        </Text>

        <Text style={s.heading}>7. Account Terms</Text>
        <Text style={s.paragraph}>
          You are responsible for maintaining the security and confidentiality of your account
          credentials. You agree not to share your account with others or allow unauthorized access.
          You are solely responsible for all activity that occurs under your account. If you suspect
          unauthorized use of your account, please contact us immediately.
        </Text>

        <Text style={s.heading}>8. Limitation of Liability</Text>
        <Text style={s.paragraph}>
          To the maximum extent permitted by applicable law, Stock Scanner and its operators shall
          not be liable for any direct, indirect, incidental, special, consequential, or exemplary
          damages, including but not limited to damages for loss of profits, goodwill, data, or
          other intangible losses, resulting from:
        </Text>
        <Text style={s.bullet}>{'\u2022'} Your use of or inability to use the App</Text>
        <Text style={s.bullet}>{'\u2022'} Any investment decisions made based on information provided by the App</Text>
        <Text style={s.bullet}>{'\u2022'} Any unauthorized access to or alteration of your data</Text>
        <Text style={s.bullet}>{'\u2022'} Any interruption or cessation of the service</Text>
        <Text style={s.paragraph}>
          In no event shall our total liability exceed the amount you have paid for the service in
          the twelve (12) months preceding the claim.
        </Text>

        <Text style={s.heading}>9. Modifications to Terms</Text>
        <Text style={s.paragraph}>
          We reserve the right to modify these Terms at any time. Changes will be posted on this
          page with an updated effective date. We will make reasonable efforts to notify users of
          material changes via email or in-app notification. Your continued use of the App after
          any modifications constitutes acceptance of the revised Terms.
        </Text>

        <Text style={s.heading}>10. Contact</Text>
        <Text style={s.paragraph}>
          For questions, concerns, or legal inquiries regarding these Terms of Service, please
          contact us at: stockscanner.app@gmail.com
        </Text>

        {/* Divider */}
        <View style={s.divider} />

        {/* Korean */}
        <Text style={s.sectionTitle}>서비스 이용약관</Text>
        <Text style={s.date}>시행일: {EFFECTIVE_DATE}</Text>

        <Text style={s.paragraph}>
          Stock Scanner("앱")에 오신 것을 환영합니다. 앱에 접속하거나 사용함으로써 본 서비스
          이용약관("약관")에 동의하게 됩니다. 본 약관에 동의하지 않으시면 앱을 사용하지 마십시오.
        </Text>

        <Text style={s.heading}>1. 서비스 설명</Text>
        <Text style={s.paragraph}>
          Stock Scanner는 기술적 지표를 과거 시장 데이터와 비교 분석하여 미국 주식에 대한 통계적
          확률 시그널을 생성하는 주식 시그널 분석 도구입니다. 백테스팅 기능, 승률 계산, 과거 패턴
          기반 선행 수익률 예측 등을 제공합니다.
        </Text>

        <Text style={s.heading}>2. 투자 조언이 아님</Text>
        <Text style={s.paragraph}>
          앱에서 제공하는 시그널, 승률, 평균 수익률 및 기타 모든 데이터는 과거 시장 데이터에서
          도출된 통계적 패턴입니다. 이는 재정적 조언, 투자 권고 또는 증권 매수/매도 권유를 구성하지
          않습니다. 모든 투자 결정은 전적으로 본인의 위험과 판단 하에 이루어짐을 인정합니다.
          투자 결정을 내리기 전에 자격을 갖춘 재무 상담사와 상담하시기 바랍니다.
        </Text>

        <Text style={s.heading}>3. 구독 조건</Text>
        <Text style={s.paragraph}>
          Stock Scanner는 월 $9.99(USD)의 프리미엄 구독 요금제를 제공합니다. 구독은 월 단위로
          자동 갱신되며, 취소하지 않는 한 각 결제 주기 종료 시 자동으로 갱신됩니다. 계정 설정을
          통해 언제든지 구독을 취소할 수 있습니다. 취소는 현재 결제 기간 종료 시 적용되며, 해당
          기간이 끝날 때까지 프리미엄 기능을 계속 이용할 수 있습니다.
        </Text>
        <Text style={s.paragraph}>
          당사는 최소 30일 전 사전 통지를 통해 구독 가격을 변경할 권리를 보유합니다. 가격 변경 후
          프리미엄 서비스를 계속 사용하면 새로운 가격에 동의한 것으로 간주됩니다.
        </Text>

        <Text style={s.heading}>4. 환불 정책</Text>
        <Text style={s.paragraph}>
          서비스의 부분 월에 대한 환불은 제공되지 않습니다. 구독을 취소하면 현재 결제 기간이
          종료될 때까지 프리미엄 기능을 계속 이용할 수 있습니다. 다음 결제 주기에 요금이
          부과되지 않도록 갱신일 전에 취소해 주십시오.
        </Text>

        <Text style={s.heading}>5. 데이터 소스</Text>
        <Text style={s.paragraph}>
          앱은 Yahoo Finance 및 기타 공개 시장 데이터 제공업체에서 공개적으로 이용 가능한 주식
          시장 데이터를 가져옵니다. 제3자 소스에서 제공하는 데이터의 정확성, 완전성 또는
          적시성을 보장하지 않습니다. 시장 데이터는 지연될 수 있으며 실시간 거래 결정에
          의존해서는 안 됩니다.
        </Text>

        <Text style={s.heading}>6. 정확성 면책 조항</Text>
        <Text style={s.paragraph}>
          과거 성과가 미래 결과를 보장하지 않습니다. 앱에 표시되는 승률, 평균 수익률 및 확률
          통계는 과거 데이터 분석을 기반으로 하며, 과거 시장 상황에서 발생한 결과를 나타냅니다.
          시장 상황은 변하며 과거 패턴이 반복되지 않을 수 있습니다. 앱은 예측의 정확성이나 거래
          전략의 수익성에 대해 어떠한 보증이나 보장도 하지 않습니다.
        </Text>

        <Text style={s.heading}>7. 계정 조건</Text>
        <Text style={s.paragraph}>
          계정 자격 증명의 보안 및 기밀성을 유지하는 것은 귀하의 책임입니다. 계정을 타인과
          공유하거나 무단 접근을 허용하지 않는 것에 동의합니다. 귀하의 계정에서 발생하는 모든
          활동에 대해 전적으로 책임을 집니다. 계정의 무단 사용이 의심되는 경우 즉시 연락해
          주십시오.
        </Text>

        <Text style={s.heading}>8. 책임 제한</Text>
        <Text style={s.paragraph}>
          관련 법률이 허용하는 최대 범위 내에서, Stock Scanner 및 그 운영자는 다음으로 인한
          직접적, 간접적, 부수적, 특별, 결과적 또는 징벌적 손해(이익, 영업권, 데이터 또는 기타
          무형 손실에 대한 손해 포함)에 대해 책임을 지지 않습니다:
        </Text>
        <Text style={s.bullet}>{'\u2022'} 앱 사용 또는 사용 불능</Text>
        <Text style={s.bullet}>{'\u2022'} 앱에서 제공한 정보를 기반으로 한 투자 결정</Text>
        <Text style={s.bullet}>{'\u2022'} 데이터에 대한 무단 접근 또는 변경</Text>
        <Text style={s.bullet}>{'\u2022'} 서비스의 중단 또는 중지</Text>
        <Text style={s.paragraph}>
          어떠한 경우에도 당사의 총 책임은 청구 발생 전 12개월 동안 귀하가 서비스에 대해 지불한
          금액을 초과하지 않습니다.
        </Text>

        <Text style={s.heading}>9. 약관 변경</Text>
        <Text style={s.paragraph}>
          당사는 언제든지 본 약관을 수정할 권리를 보유합니다. 변경 사항은 업데이트된 시행일과
          함께 이 페이지에 게시됩니다. 중요한 변경 사항은 이메일 또는 앱 내 알림을 통해 사용자에게
          합리적으로 통지하도록 노력합니다. 약관 변경 후 앱을 계속 사용하면 수정된 약관에
          동의한 것으로 간주됩니다.
        </Text>

        <Text style={s.heading}>10. 문의하기</Text>
        <Text style={s.paragraph}>
          본 서비스 이용약관에 대한 질문, 우려 사항 또는 법적 문의는 다음 이메일로 연락해
          주십시오: stockscanner.app@gmail.com
        </Text>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    backButton: {
      paddingVertical: spacing.xs,
      paddingRight: spacing.md,
    },
    backText: {
      color: colors.accent,
      ...typography.body,
      fontWeight: '600',
    },
    headerTitle: {
      color: colors.textPrimary,
      ...typography.h3,
    },
    content: {
      padding: spacing.xl,
    },
    sectionTitle: {
      color: colors.textPrimary,
      ...typography.h2,
      marginBottom: spacing.xs,
    },
    date: {
      color: colors.textTertiary,
      ...typography.bodySm,
      marginBottom: spacing.xl,
    },
    heading: {
      color: colors.textPrimary,
      ...typography.bodyBold,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    paragraph: {
      color: colors.textSecondary,
      ...typography.body,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    bullet: {
      color: colors.textSecondary,
      ...typography.body,
      lineHeight: 22,
      paddingLeft: spacing.lg,
      marginBottom: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xxl,
    },
  });

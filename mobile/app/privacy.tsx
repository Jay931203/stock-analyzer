import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../src/theme';

const EFFECTIVE_DATE = '2026-03-06';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.backText}>{'<'} Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* English */}
        <Text style={s.sectionTitle}>Privacy Policy</Text>
        <Text style={s.date}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Text style={s.paragraph}>
          Stock Scanner ("the App") is a stock analysis tool that provides technical indicator signals,
          historical probability data, and backtesting features for US equities. This privacy policy
          explains how the App handles your data.
        </Text>

        <Text style={s.heading}>1. Data Collection</Text>
        <Text style={s.paragraph}>
          The App does not collect, store, or transmit any personal information. There is no user
          registration, login, or authentication system. We do not collect names, email addresses,
          phone numbers, or any other personally identifiable information.
        </Text>

        <Text style={s.heading}>2. Local Storage</Text>
        <Text style={s.paragraph}>
          The App uses AsyncStorage (device-local storage) to save the following data on your device only:
        </Text>
        <Text style={s.bullet}>{'\u2022'} Server URL preference</Text>
        <Text style={s.bullet}>{'\u2022'} Watchlist tickers</Text>
        <Text style={s.bullet}>{'\u2022'} Recent search history</Text>
        <Text style={s.bullet}>{'\u2022'} Theme preference (light/dark/system)</Text>
        <Text style={s.paragraph}>
          This data is stored only on your device and is never transmitted to our servers or any third party.
          You can clear this data at any time by clearing the app's storage or uninstalling the App.
        </Text>

        <Text style={s.heading}>3. Third-Party Services</Text>
        <Text style={s.paragraph}>
          The App retrieves stock market data through a backend server that uses the yfinance library to
          fetch publicly available financial data from Yahoo Finance. No personal information is included
          in these requests. The backend is hosted on Vercel.
        </Text>
        <Text style={s.paragraph}>
          The App does not use cookies, tracking pixels, analytics services, or advertising SDKs.
        </Text>

        <Text style={s.heading}>4. Disclaimer</Text>
        <Text style={s.paragraph}>
          The information provided by the App is for educational and informational purposes only. It does
          not constitute financial advice, investment recommendations, or solicitation to buy or sell
          securities. Historical probabilities and win rates are based on past data and do not guarantee
          future results. Always do your own research and consult a qualified financial advisor before
          making investment decisions.
        </Text>

        <Text style={s.heading}>5. Changes to This Policy</Text>
        <Text style={s.paragraph}>
          We may update this privacy policy from time to time. Any changes will be reflected on this page
          with an updated effective date.
        </Text>

        {/* Divider */}
        <View style={s.divider} />

        {/* Korean */}
        <Text style={s.sectionTitle}>개인정보 처리방침</Text>
        <Text style={s.date}>시행일: {EFFECTIVE_DATE}</Text>

        <Text style={s.paragraph}>
          Stock Scanner("앱")은 미국 주식의 기술적 지표 시그널, 과거 확률 데이터, 백테스팅 기능을 제공하는
          주식 분석 도구입니다. 본 개인정보 처리방침은 앱이 데이터를 어떻게 처리하는지 설명합니다.
        </Text>

        <Text style={s.heading}>1. 데이터 수집</Text>
        <Text style={s.paragraph}>
          본 앱은 개인정보를 수집, 저장 또는 전송하지 않습니다. 회원가입, 로그인 또는 인증 시스템이 없습니다.
          이름, 이메일 주소, 전화번호 또는 기타 개인 식별 정보를 수집하지 않습니다.
        </Text>

        <Text style={s.heading}>2. 로컬 저장소</Text>
        <Text style={s.paragraph}>
          앱은 AsyncStorage(기기 내부 저장소)를 사용하여 다음 데이터를 기기에만 저장합니다:
        </Text>
        <Text style={s.bullet}>{'\u2022'} 서버 URL 설정</Text>
        <Text style={s.bullet}>{'\u2022'} 관심 종목(워치리스트)</Text>
        <Text style={s.bullet}>{'\u2022'} 최근 검색 기록</Text>
        <Text style={s.bullet}>{'\u2022'} 테마 설정 (라이트/다크/시스템)</Text>
        <Text style={s.paragraph}>
          이 데이터는 기기에만 저장되며 서버나 제3자에게 전송되지 않습니다. 앱의 저장소를 지우거나 앱을
          삭제하면 언제든지 이 데이터를 삭제할 수 있습니다.
        </Text>

        <Text style={s.heading}>3. 제3자 서비스</Text>
        <Text style={s.paragraph}>
          앱은 yfinance 라이브러리를 사용하는 백엔드 서버를 통해 공개된 주식 시장 데이터를 가져옵니다.
          이 요청에는 개인정보가 포함되지 않습니다. 백엔드는 Vercel에서 호스팅됩니다.
        </Text>
        <Text style={s.paragraph}>
          앱은 쿠키, 추적 픽셀, 분석 서비스 또는 광고 SDK를 사용하지 않습니다.
        </Text>

        <Text style={s.heading}>4. 면책 조항</Text>
        <Text style={s.paragraph}>
          앱이 제공하는 정보는 교육 및 정보 제공 목적으로만 사용됩니다. 이는 재정적 조언, 투자 권고 또는
          증권 매수/매도 권유를 구성하지 않습니다. 과거 확률과 승률은 과거 데이터를 기반으로 하며 미래
          결과를 보장하지 않습니다. 투자 결정을 내리기 전에 반드시 직접 조사하고 자격을 갖춘 재무
          상담사와 상담하시기 바랍니다.
        </Text>

        <Text style={s.heading}>5. 정책 변경</Text>
        <Text style={s.paragraph}>
          본 개인정보 처리방침은 수시로 업데이트될 수 있습니다. 변경 사항은 업데이트된 시행일과 함께
          이 페이지에 반영됩니다.
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

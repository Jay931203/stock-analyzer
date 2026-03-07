import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../src/theme';
import { ChevronLeftIcon } from '../src/components/ThemeIcons';

const EFFECTIVE_DATE = '2026-03-07';

export default function PrivacyScreen() {
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
          explains what data we collect, how we use it, and your rights regarding that data.
        </Text>

        <Text style={s.heading}>1. Information We Collect</Text>
        <Text style={s.paragraph}>
          When you sign in using Google OAuth via Supabase Auth, we receive and store the following
          information from your Google account:
        </Text>
        <Text style={s.bullet}>{'\u2022'} Email address</Text>
        <Text style={s.bullet}>{'\u2022'} Display name</Text>
        <Text style={s.bullet}>{'\u2022'} Profile picture URL</Text>
        <Text style={s.bullet}>{'\u2022'} Google account identifier</Text>
        <Text style={s.paragraph}>
          This information is stored in our Supabase database and is used to manage your account,
          authenticate your sessions, and provide personalized features such as saved watchlists.
        </Text>

        <Text style={s.heading}>2. Data Collected Automatically</Text>
        <Text style={s.paragraph}>
          When you use the App, certain data is sent to our backend server in the course of normal
          operation:
        </Text>
        <Text style={s.bullet}>{'\u2022'} Ticker symbols you search for or analyze</Text>
        <Text style={s.bullet}>{'\u2022'} Analysis parameters (indicators, time periods)</Text>
        <Text style={s.bullet}>{'\u2022'} Request timestamps and IP addresses (via standard server logs)</Text>
        <Text style={s.paragraph}>
          Search queries and analysis results may be cached on the server to improve performance.
          Server logs are retained for operational and debugging purposes.
        </Text>

        <Text style={s.heading}>3. Local Storage</Text>
        <Text style={s.paragraph}>
          The App uses AsyncStorage (device-local storage) to save the following data on your device:
        </Text>
        <Text style={s.bullet}>{'\u2022'} Authentication session tokens (Supabase Auth)</Text>
        <Text style={s.bullet}>{'\u2022'} Theme preference (light/dark/system)</Text>
        <Text style={s.bullet}>{'\u2022'} Analysis period settings</Text>
        <Text style={s.bullet}>{'\u2022'} Watchlist tickers</Text>
        <Text style={s.bullet}>{'\u2022'} Recent search history</Text>
        <Text style={s.paragraph}>
          Session tokens are used to keep you signed in between app launches. You can clear all
          locally stored data at any time by signing out, clearing the app's storage, or
          uninstalling the App.
        </Text>

        <Text style={s.heading}>4. Third-Party Services</Text>
        <Text style={s.paragraph}>
          The App integrates the following third-party services:
        </Text>
        <Text style={s.paragraph}>
          Google OAuth (via Supabase Auth): Used for user authentication. Google receives standard
          OAuth data during the sign-in flow. Google's privacy policy applies to data processed
          by Google: https://policies.google.com/privacy
        </Text>
        <Text style={s.paragraph}>
          Google AdSense (Publisher ID: ca-pub-5053429721285857): The App displays advertisements
          served by Google AdSense. Google AdSense uses cookies, web beacons, and similar tracking
          technologies to serve personalized ads based on your browsing activity across websites
          and apps. You can opt out of personalized advertising by visiting Google's Ad Settings
          at https://adssettings.google.com or by using the DAA opt-out at
          https://optout.aboutads.info. For more information, see Google's advertising privacy
          policy: https://policies.google.com/technologies/ads
        </Text>
        <Text style={s.paragraph}>
          Supabase: Used for authentication and database services. Your account data (email,
          profile) is stored in Supabase's infrastructure. Supabase's privacy policy:
          https://supabase.com/privacy
        </Text>
        <Text style={s.paragraph}>
          The backend server retrieves publicly available stock market data. The backend is hosted
          on Vercel, which may collect standard infrastructure-level data (IP addresses, request
          metadata) as described in Vercel's privacy policy: https://vercel.com/legal/privacy-policy
        </Text>

        <Text style={s.heading}>5. Cookies and Tracking</Text>
        <Text style={s.paragraph}>
          The App itself does not set first-party cookies. However, Google AdSense sets third-party
          cookies and uses tracking technologies to serve and measure advertisements. These cookies
          may track your activity across other websites and services that participate in Google's
          advertising network. You can manage cookie preferences through your browser or device
          settings.
        </Text>

        <Text style={s.heading}>6. Data Sharing and Sale</Text>
        <Text style={s.paragraph}>
          We do not sell, rent, or trade your personal information to third parties. We share data
          only with the third-party service providers listed above (Google, Supabase, Vercel) as
          necessary to operate the App. We may disclose information if required by law, legal
          process, or to protect our rights or the safety of our users.
        </Text>

        <Text style={s.heading}>7. Data Retention</Text>
        <Text style={s.paragraph}>
          Account data is retained in Supabase as long as your account is active. Server-side
          cached analysis data is retained temporarily for performance purposes. You may request
          deletion of your account and associated data by contacting us at the email address below.
        </Text>

        <Text style={s.heading}>8. Children's Privacy</Text>
        <Text style={s.paragraph}>
          The App is not directed at children under the age of 13. We do not knowingly collect
          personal information from children under 13. If you believe a child under 13 has provided
          us with personal information, please contact us so we can delete that information.
        </Text>

        <Text style={s.heading}>9. Disclaimer</Text>
        <Text style={s.paragraph}>
          The information provided by the App is for educational and informational purposes only.
          It does not constitute financial advice, investment recommendations, or solicitation to
          buy or sell securities. Historical probabilities and win rates are based on past data and
          do not guarantee future results. Always do your own research and consult a qualified
          financial advisor before making investment decisions.
        </Text>

        <Text style={s.heading}>10. Changes to This Policy</Text>
        <Text style={s.paragraph}>
          We may update this privacy policy from time to time. Any changes will be reflected on
          this page with an updated effective date. Continued use of the App after changes
          constitutes acceptance of the revised policy.
        </Text>

        <Text style={s.heading}>11. Contact Us</Text>
        <Text style={s.paragraph}>
          If you have questions about this privacy policy or wish to request deletion of your data,
          please contact us at: stockscanner.app@gmail.com
        </Text>

        {/* Divider */}
        <View style={s.divider} />

        {/* Korean */}
        <Text style={s.sectionTitle}>개인정보 처리방침</Text>
        <Text style={s.date}>시행일: {EFFECTIVE_DATE}</Text>

        <Text style={s.paragraph}>
          Stock Scanner("앱")은 미국 주식의 기술적 지표 시그널, 과거 확률 데이터, 백테스팅 기능을
          제공하는 주식 분석 도구입니다. 본 개인정보 처리방침은 수집하는 데이터, 사용 방법, 그리고
          귀하의 데이터에 대한 권리를 설명합니다.
        </Text>

        <Text style={s.heading}>1. 수집하는 정보</Text>
        <Text style={s.paragraph}>
          Supabase Auth를 통한 Google OAuth로 로그인하시면, Google 계정에서 다음 정보를
          수신하여 저장합니다:
        </Text>
        <Text style={s.bullet}>{'\u2022'} 이메일 주소</Text>
        <Text style={s.bullet}>{'\u2022'} 표시 이름</Text>
        <Text style={s.bullet}>{'\u2022'} 프로필 사진 URL</Text>
        <Text style={s.bullet}>{'\u2022'} Google 계정 식별자</Text>
        <Text style={s.paragraph}>
          이 정보는 Supabase 데이터베이스에 저장되며, 계정 관리, 세션 인증, 관심 종목 저장 등
          맞춤형 기능 제공을 위해 사용됩니다.
        </Text>

        <Text style={s.heading}>2. 자동 수집 데이터</Text>
        <Text style={s.paragraph}>
          앱 사용 시 정상적인 운영 과정에서 다음 데이터가 백엔드 서버로 전송됩니다:
        </Text>
        <Text style={s.bullet}>{'\u2022'} 검색하거나 분석하는 종목 코드(티커)</Text>
        <Text style={s.bullet}>{'\u2022'} 분석 매개변수 (지표, 기간)</Text>
        <Text style={s.bullet}>{'\u2022'} 요청 시간 및 IP 주소 (표준 서버 로그)</Text>
        <Text style={s.paragraph}>
          검색 쿼리와 분석 결과는 성능 향상을 위해 서버에 캐시될 수 있습니다. 서버 로그는
          운영 및 디버깅 목적으로 보관됩니다.
        </Text>

        <Text style={s.heading}>3. 로컬 저장소</Text>
        <Text style={s.paragraph}>
          앱은 AsyncStorage(기기 내부 저장소)를 사용하여 다음 데이터를 기기에 저장합니다:
        </Text>
        <Text style={s.bullet}>{'\u2022'} 인증 세션 토큰 (Supabase Auth)</Text>
        <Text style={s.bullet}>{'\u2022'} 테마 설정 (라이트/다크/시스템)</Text>
        <Text style={s.bullet}>{'\u2022'} 분석 기간 설정</Text>
        <Text style={s.bullet}>{'\u2022'} 관심 종목(워치리스트)</Text>
        <Text style={s.bullet}>{'\u2022'} 최근 검색 기록</Text>
        <Text style={s.paragraph}>
          세션 토큰은 앱 재실행 시 로그인 상태를 유지하는 데 사용됩니다. 로그아웃하거나 앱의
          저장소를 지우거나 앱을 삭제하면 언제든지 로컬 데이터를 삭제할 수 있습니다.
        </Text>

        <Text style={s.heading}>4. 제3자 서비스</Text>
        <Text style={s.paragraph}>
          앱은 다음 제3자 서비스를 연동합니다:
        </Text>
        <Text style={s.paragraph}>
          Google OAuth (Supabase Auth 경유): 사용자 인증에 사용됩니다. 로그인 과정에서 Google에
          표준 OAuth 데이터가 전달됩니다. Google의 개인정보 처리방침:
          https://policies.google.com/privacy
        </Text>
        <Text style={s.paragraph}>
          Google AdSense (게시자 ID: ca-pub-5053429721285857): 앱은 Google AdSense가 제공하는
          광고를 표시합니다. Google AdSense는 쿠키, 웹 비콘 및 유사한 추적 기술을 사용하여
          웹사이트 및 앱에서의 브라우징 활동을 기반으로 맞춤형 광고를 제공합니다.
          https://adssettings.google.com 에서 맞춤 광고를 거부하거나,
          https://optout.aboutads.info 에서 DAA 옵트아웃을 할 수 있습니다.
          Google 광고 개인정보 처리방침: https://policies.google.com/technologies/ads
        </Text>
        <Text style={s.paragraph}>
          Supabase: 인증 및 데이터베이스 서비스에 사용됩니다. 계정 데이터(이메일, 프로필)는
          Supabase 인프라에 저장됩니다. Supabase 개인정보 처리방침:
          https://supabase.com/privacy
        </Text>
        <Text style={s.paragraph}>
          백엔드 서버는 공개된 주식 시장 데이터를 가져옵니다. 백엔드는 Vercel에서 호스팅되며,
          Vercel은 표준 인프라 수준의 데이터(IP 주소, 요청 메타데이터)를 수집할 수 있습니다.
          Vercel 개인정보 처리방침: https://vercel.com/legal/privacy-policy
        </Text>

        <Text style={s.heading}>5. 쿠키 및 추적</Text>
        <Text style={s.paragraph}>
          앱 자체는 자체 쿠키(퍼스트파티 쿠키)를 설정하지 않습니다. 그러나 Google AdSense는
          제3자 쿠키를 설정하고 추적 기술을 사용하여 광고를 제공하고 측정합니다. 이러한 쿠키는
          Google 광고 네트워크에 참여하는 다른 웹사이트 및 서비스에서의 활동을 추적할 수
          있습니다. 브라우저 또는 기기 설정을 통해 쿠키 환경설정을 관리할 수 있습니다.
        </Text>

        <Text style={s.heading}>6. 데이터 공유 및 판매</Text>
        <Text style={s.paragraph}>
          당사는 귀하의 개인정보를 제3자에게 판매, 임대 또는 거래하지 않습니다. 앱 운영에
          필요한 경우에만 위에 나열된 제3자 서비스 제공업체(Google, Supabase, Vercel)와
          데이터를 공유합니다. 법률, 법적 절차에 의해 요구되거나 당사의 권리 또는 사용자의
          안전을 보호하기 위해 필요한 경우 정보를 공개할 수 있습니다.
        </Text>

        <Text style={s.heading}>7. 데이터 보존</Text>
        <Text style={s.paragraph}>
          계정 데이터는 계정이 활성 상태인 동안 Supabase에 보관됩니다. 서버 측 캐시된 분석
          데이터는 성능 목적으로 일시적으로 보관됩니다. 아래 이메일 주소로 연락하여 계정 및
          관련 데이터의 삭제를 요청할 수 있습니다.
        </Text>

        <Text style={s.heading}>8. 아동 개인정보 보호</Text>
        <Text style={s.paragraph}>
          본 앱은 13세 미만 아동을 대상으로 하지 않습니다. 13세 미만 아동의 개인정보를
          고의로 수집하지 않습니다. 13세 미만 아동이 개인정보를 제공했다고 판단되는 경우
          해당 정보를 삭제할 수 있도록 연락해 주시기 바랍니다.
        </Text>

        <Text style={s.heading}>9. 면책 조항</Text>
        <Text style={s.paragraph}>
          앱이 제공하는 정보는 교육 및 정보 제공 목적으로만 사용됩니다. 이는 재정적 조언,
          투자 권고 또는 증권 매수/매도 권유를 구성하지 않습니다. 과거 확률과 승률은 과거
          데이터를 기반으로 하며 미래 결과를 보장하지 않습니다. 투자 결정을 내리기 전에
          반드시 직접 조사하고 자격을 갖춘 재무 상담사와 상담하시기 바랍니다.
        </Text>

        <Text style={s.heading}>10. 정책 변경</Text>
        <Text style={s.paragraph}>
          본 개인정보 처리방침은 수시로 업데이트될 수 있습니다. 변경 사항은 업데이트된
          시행일과 함께 이 페이지에 반영됩니다. 변경 후 앱을 계속 사용하면 수정된 정책에
          동의한 것으로 간주됩니다.
        </Text>

        <Text style={s.heading}>11. 문의하기</Text>
        <Text style={s.paragraph}>
          본 개인정보 처리방침에 대한 질문이 있거나 데이터 삭제를 요청하려면 다음 이메일로
          연락해 주십시오: stockscanner.app@gmail.com
        </Text>

        {/* Terms of Service link */}
        <View style={s.divider} />
        <Pressable onPress={() => router.push('/terms')}>
          <Text style={[s.paragraph, { color: colors.accent, textDecorationLine: 'underline', textAlign: 'center' }]}>
            Terms of Service / 서비스 이용약관
          </Text>
        </Pressable>

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

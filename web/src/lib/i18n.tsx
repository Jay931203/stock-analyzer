"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Locale = "en" | "ko";

const translations = {
  en: {
    // Navigation
    "nav.scanner": "Scanner",
    "nav.analyze": "Analyze",
    "nav.timeMachine": "Time Machine",
    "nav.alerts": "Alerts",
    "nav.settings": "Settings",
    "nav.analysis": "Analysis",

    // Dashboard
    "dashboard.title": "Signal Scanner",
    "dashboard.signals": "signals found",
    "dashboard.scanned": "tickers scanned",
    "dashboard.bullish": "Bullish",
    "dashboard.bearish": "Bearish",
    "dashboard.avgWinRate": "Avg WR",
    "dashboard.strongest": "Strongest",
    "dashboard.refreshing": "Signal scanner is refreshing",
    "dashboard.refreshingDesc":
      "Data updates every day at market close. If this is your first visit, the scan may take a moment to complete.",
    "dashboard.noData": "No data yet. Signals refresh every 15 minutes.",
    "dashboard.marketClosed": "Market Closed",
    "dashboard.marketOpen": "Market Open",
    "dashboard.marketPre": "Pre-Market",
    "dashboard.loadingSignals": "Loading signals...",
    "dashboard.loadingDesc": "Fetching the latest scanner results.",
    "dashboard.refreshingSignals": "Refreshing signals...",
    "dashboard.refresh": "Refresh",
    "dashboard.refreshingBtn": "Refreshing...",
    "dashboard.topSignal": "Top Signal",
    "dashboard.scannedSuffix": "scanned",

    // Sectors
    "sector.all": "All",
    "sector.technology": "Technology",
    "sector.healthcare": "Healthcare",
    "sector.energy": "Energy",
    "sector.finance": "Finance",
    "sector.consumer": "Consumer",
    "sector.industrial": "Industrial",
    "sector.etfs": "ETFs",

    // Analysis
    "analysis.combinedSignal": "Combined Signal",
    "analysis.indicators": "Individual Indicators",
    "analysis.expandAll": "Expand All",
    "analysis.collapseAll": "Collapse All",
    "analysis.matches": "historical matches",
    "analysis.winRate": "Win Rate",
    "analysis.avgReturn": "Avg Return",
    "analysis.strict": "Strict",
    "analysis.normal": "Normal",
    "analysis.relaxed": "Relaxed",
    "analysis.recommended": "Recommended",
    "analysis.insufficientData": "Insufficient data",

    // Time Machine
    "tm.title": "Signal Replay",
    "tm.subtitle":
      "Explore what happened when similar conditions occurred",
    "tm.patternsFound": "similar patterns found",
    "tm.outOf": "out of",
    "tm.tradingDays": "trading days analyzed",
    "tm.matchingConditions": "Matching conditions",
    "tm.outcomeDistribution": "Outcome Distribution",
    "tm.wentUp": "went up",
    "tm.wentDown": "went down",
    "tm.whatHappened": "What Actually Happened",
    "tm.betterThan": "Better than",
    "tm.ofSimilarCases": "of similar cases",
    "tm.signalEdge": "Signal Edge",
    "tm.withSignal": "With Signal",
    "tm.randomEntry": "Random Entry",
    "tm.edge": "Edge",
    "tm.presetDates": "Preset Historical Dates",

    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Manage your account and preferences",
    "settings.account": "Account",
    "settings.accountDesc":
      "Sign in to manage your account settings, subscription, and alerts.",
    "settings.subscription": "Subscription",
    "settings.currentPlan": "Current Plan",
    "settings.freePlanDesc": "Free — 5 analyses/day, top 5 signals",
    "settings.upgradePro": "Upgrade to Pro",
    "settings.alertPreferences": "Alert Preferences",
    "settings.alertDesc":
      "Configure email notifications for signal alerts. Requires Pro plan.",
    "settings.legal": "Legal",
    "settings.legalDesc":
      "Stock Scanner is a screening and analysis tool. It does not provide investment advice. Past performance does not guarantee future results.",
    "settings.language": "Language",
    "settings.languageDesc": "Choose your preferred display language.",
    "settings.english": "English",
    "settings.korean": "한국어",

    // Header / User menu
    "header.profile": "Profile",
    "header.signOut": "Sign Out",

    // Common
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.retry": "Retry",
    "common.price": "Price",
    "common.change": "Change",
    "common.strength": "Strength",
    "common.search": "Search tickers...",
    "common.free": "Free",
    "common.pro": "Pro",
    "common.api": "API",
  },
  ko: {
    // Navigation
    "nav.scanner": "스캐너",
    "nav.analyze": "분석",
    "nav.timeMachine": "타임머신",
    "nav.alerts": "알림",
    "nav.settings": "설정",
    "nav.analysis": "분석",

    // Dashboard
    "dashboard.title": "시그널 스캐너",
    "dashboard.signals": "시그널 발견",
    "dashboard.scanned": "종목 스캔",
    "dashboard.bullish": "상승",
    "dashboard.bearish": "하락",
    "dashboard.avgWinRate": "평균 승률",
    "dashboard.strongest": "최강",
    "dashboard.refreshing": "시그널 스캐너 새로고침 중",
    "dashboard.refreshingDesc":
      "매 장 마감 후 데이터가 갱신됩니다. 첫 방문이라면 스캔 완료까지 잠시 걸릴 수 있습니다.",
    "dashboard.noData": "데이터 없음. 15분마다 새로고침됩니다.",
    "dashboard.marketClosed": "장 마감",
    "dashboard.marketOpen": "장 개장",
    "dashboard.marketPre": "프리마켓",
    "dashboard.loadingSignals": "시그널 로딩 중...",
    "dashboard.loadingDesc": "최신 스캔 결과를 가져오는 중입니다.",
    "dashboard.refreshingSignals": "시그널 갱신 중...",
    "dashboard.refresh": "새로고침",
    "dashboard.refreshingBtn": "갱신 중...",
    "dashboard.topSignal": "최강 시그널",
    "dashboard.scannedSuffix": "스캔",

    // Sectors
    "sector.all": "전체",
    "sector.technology": "기술",
    "sector.healthcare": "헬스케어",
    "sector.energy": "에너지",
    "sector.finance": "금융",
    "sector.consumer": "소비재",
    "sector.industrial": "산업",
    "sector.etfs": "ETF",

    // Analysis
    "analysis.combinedSignal": "종합 시그널",
    "analysis.indicators": "개별 지표",
    "analysis.expandAll": "모두 펼치기",
    "analysis.collapseAll": "모두 접기",
    "analysis.matches": "과거 유사 사례",
    "analysis.winRate": "승률",
    "analysis.avgReturn": "평균 수익률",
    "analysis.strict": "엄격",
    "analysis.normal": "보통",
    "analysis.relaxed": "완화",
    "analysis.recommended": "추천",
    "analysis.insufficientData": "데이터 부족",

    // Time Machine
    "tm.title": "시그널 리플레이",
    "tm.subtitle": "과거 유사한 조건에서 무슨 일이 일어났는지 탐색",
    "tm.patternsFound": "유사 패턴 발견",
    "tm.outOf": "/",
    "tm.tradingDays": "거래일 분석",
    "tm.matchingConditions": "매칭 조건",
    "tm.outcomeDistribution": "결과 분포",
    "tm.wentUp": "상승",
    "tm.wentDown": "하락",
    "tm.whatHappened": "실제 결과",
    "tm.betterThan": "상위",
    "tm.ofSimilarCases": "유사 사례 대비",
    "tm.signalEdge": "시그널 우위",
    "tm.withSignal": "시그널 진입",
    "tm.randomEntry": "랜덤 진입",
    "tm.edge": "우위",
    "tm.presetDates": "주요 과거 날짜",

    // Settings
    "settings.title": "설정",
    "settings.subtitle": "계정 및 환경설정을 관리하세요",
    "settings.account": "계정",
    "settings.accountDesc":
      "로그인하여 계정 설정, 구독, 알림을 관리하세요.",
    "settings.subscription": "구독",
    "settings.currentPlan": "현재 플랜",
    "settings.freePlanDesc": "무료 — 일 5회 분석, 상위 5개 시그널",
    "settings.upgradePro": "Pro 업그레이드",
    "settings.alertPreferences": "알림 설정",
    "settings.alertDesc":
      "시그널 알림 이메일 설정. Pro 플랜 필요.",
    "settings.legal": "법적 고지",
    "settings.legalDesc":
      "Stock Scanner는 스크리닝 및 분석 도구입니다. 투자 조언을 제공하지 않습니다. 과거 성과가 미래 결과를 보장하지 않습니다.",
    "settings.language": "언어",
    "settings.languageDesc": "표시 언어를 선택하세요.",
    "settings.english": "English",
    "settings.korean": "한국어",

    // Header / User menu
    "header.profile": "프로필",
    "header.signOut": "로그아웃",

    // Common
    "common.loading": "로딩 중...",
    "common.error": "오류가 발생했습니다",
    "common.retry": "다시 시도",
    "common.price": "가격",
    "common.change": "변동",
    "common.strength": "강도",
    "common.search": "종목 검색...",
    "common.free": "무료",
    "common.pro": "Pro",
    "common.api": "API",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("locale") as Locale) || "en";
    }
    return "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[locale][key] || translations.en[key] || key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export type { Locale, TranslationKey };

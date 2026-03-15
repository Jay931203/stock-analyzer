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
    "dashboard.justNow": "just now",

    // Sectors
    "sector.all": "All",
    "sector.technology": "Technology",
    "sector.healthcare": "Healthcare",
    "sector.energy": "Energy",
    "sector.finance": "Finance",
    "sector.consumer": "Consumer",
    "sector.industrial": "Industrial",
    "sector.etfs": "ETFs",

    // Analysis page
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
    "analysis.stockAnalysis": "Stock Analysis",
    "analysis.stockAnalysisDesc":
      "Deep-dive into any stock with 12 technical indicators and probability-based signals.",
    "analysis.enterTicker": "Enter a ticker to analyze",
    "analysis.analyze": "Analyze",
    "analysis.orPickPopular": "Or pick a popular stock",
    "analysis.tipCtrlK":
      "Tip: Press {key} anywhere to quickly search for any ticker",
    "analysis.backToScanner": "Back to Scanner",
    "analysis.selectIndicators":
      "Select indicators to customize the combined probability",
    "analysis.minIndicators": "Minimum 2 indicators required",
    "analysis.removeIndicator": "Remove {key} from combined signal",
    "analysis.addIndicator": "Add {key} to combined signal",
    "analysis.active": "active",
    "analysis.collapse": "Collapse",
    "analysis.showProbabilities": "Show probabilities for:",
    "analysis.noMatchesTier":
      "No historical matches for the {tier} tier. Try a different tier or adjust your indicator selection.",
    "analysis.noSmartData":
      "No combined signal data available. The smart analysis is loading...",
    "analysis.dataUnavailable": "Data unavailable",
    "analysis.viewDetails": "View details",
    "analysis.patterns": "patterns",
    "analysis.wentUp": "went up",
    "analysis.timeMachineHighlights": "Time Machine Highlights",
    "analysis.exploreMoreDates": "Explore more dates",
    "analysis.strictDesc":
      "Tightest conditions, fewest matches, most specific",
    "analysis.normalDesc": "Balanced conditions (recommended)",
    "analysis.relaxedDesc":
      "Widest conditions, most matches, less specific",
    "analysis.direction.bullish": "Bullish",
    "analysis.direction.bearish": "Bearish",
    "analysis.direction.neutral": "Neutral",

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
    "tm.signalTimeMachine": "Signal Time Machine",
    "tm.timeMachineDesc":
      "Go back to any date. See what the signal said. See what actually happened.",
    "tm.enterTicker": "Enter a ticker to explore",
    "tm.explore": "Explore",
    "tm.orPickPopular": "Or pick a popular stock",
    "tm.selectDate": "Select Date",
    "tm.keyMarketDates": "Key Market Dates",
    "tm.timeMachine": "Time Machine",
    "tm.explorePatterns":
      "Explore historical signal patterns and their outcomes",
    "tm.backToAnalysis": "Back to analysis",
    "tm.similarPatternsFound": "similar pattern{s} found",
    "tm.outOfDays": "out of {days} trading days analyzed",
    "tm.afterDays": "After {days}",
    "tm.up": "up",
    "tm.occurrences": "Occurrences",
    "tm.tier": "Tier",
    "tm.direction": "Direction",
    "tm.noDataPeriod": "No data available for this period.",
    "tm.returned": "{ticker} returned:",
    "tm.inDays": "in {days}",
    "tm.betterThanPct": "This was better than",
    "tm.ofHistoricalCases": "of similar historical cases",
    "tm.allForwardReturns": "All Forward Returns",
    "tm.winRateAdvantage": "win rate advantage",
    "tm.individualBreakdown": "Individual Indicator Breakdown",
    "tm.condition": "Condition",
    "tm.state": "State",
    "tm.value": "Value",
    "tm.priceContext": "Price Context",
    "tm.priceOn": "Price on {date}",
    "tm.currentPrice": "Current Price",
    "tm.totalReturn": "Total Return",
    "tm.highlights": "Highlights",
    "tm.selectDateExplore": "Select a date to explore historical patterns",
    "tm.timeMachineExplain":
      "The Time Machine finds similar technical indicator patterns from history and shows you the distribution of outcomes -- not predictions, but what happened when similar conditions occurred.",
    "tm.worst": "Worst",
    "tm.best": "Best",
    "tm.winRate": "win rate",
    "tm.avgReturn": "avg return",
    "tm.covidBottom": "COVID Bottom",
    "tm.rateShock": "Rate Shock",
    "tm.aiRallyStart": "AI Rally Start",
    "tm.svbCrisis": "SVB Crisis",
    "tm.oct2023Low": "Oct 2023 Low",
    "tm.election2024": "2024 Election",
    "tm.covidDesc": "Market crash low",
    "tm.rateShockDesc": "Fed hawkish pivot",
    "tm.aiRallyDesc": "ChatGPT momentum",
    "tm.svbDesc": "Bank run panic",
    "tm.oct2023Desc": "Bond yield peak",
    "tm.electionDesc": "US presidential",

    // Alerts
    "alerts.title": "Alerts",
    "alerts.subtitle": "Get notified when your conditions are met",
    "alerts.newAlert": "New Alert",
    "alerts.noAlerts": "No alerts yet",
    "alerts.noAlertsDesc":
      "Create alerts to get notified when a stock enters an oversold bounce signal, crosses a price level, or meets your custom conditions.",
    "alerts.signalAlert": "Signal Alert",
    "alerts.signalAlertDesc":
      '"Notify me when AAPL enters an Oversold Bounce signal with 60%+ win rate"',
    "alerts.probabilityAlert": "Probability Alert",
    "alerts.probabilityAlertDesc":
      '"Notify me when any stock has combined win rate above 80% (20d)"',
    "alerts.requirePro": "Alerts require a Pro subscription",

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
    "header.opensIn": "Opens in",
    "header.closesIn": "Closes in",

    // Signal Table
    "table.ticker": "Ticker",
    "table.sector": "Sector",
    "table.price": "Price",
    "table.changePct": "Change%",
    "table.changePctShort": "Chg%",
    "table.strength": "Strength",
    "table.signalsFound": "signals found",
    "table.signalFound": "signal found",
    "table.scannedTickers": "scanned {count} tickers",
    "table.showing": "showing {count}",
    "table.displayPeriod": "Display period:",
    "table.view": "View",
    "table.noSignals": "No signals found for this filter.",
    "table.signalCondition": "Signal Condition",

    // Search
    "search.searchTicker": "Search ticker...",
    "search.search": "Search...",
    "search.searchPlaceholder": "Search by ticker or company name...",
    "search.recent": "Recent",
    "search.noResults": "No results for",
    "search.pressEnter": "Press Enter to search",
    "search.directly": "directly",
    "search.navigate": "navigate",
    "search.select": "select",
    "search.close": "close",

    // Chart
    "chart.loadingChart": "Loading chart...",
    "chart.noData": "No chart data available",

    // Indicator Card
    "indicator.winRate": "Win Rate",
    "indicator.avgReturn": "Avg Return:",
    "indicator.oversold": "Oversold",
    "indicator.overbought": "Overbought",
    "indicator.unusual": "Unusual",
    "indicator.neutral": "Neutral",

    // Loading page
    "loading.signals": "Loading signals...",
    "loading.firstVisit":
      "This may take up to 30 seconds on first visit while the scanner runs.",

    // Error page
    "error.title": "Something went wrong",
    "error.unexpected":
      "An unexpected error occurred. Please try again.",
    "error.errorId": "Error ID:",
    "error.tryAgain": "Try Again",
    "error.goToScanner": "Go to Scanner",
    "error.persistContact":
      "If this problem persists, please contact support.",

    // 404 page
    "notFound.title": "Page Not Found",
    "notFound.description":
      "The page you're looking for doesn't exist or has been moved.",
    "notFound.goToScanner": "Go to Scanner",
    "notFound.backToHome": "Back to Home",
    "notFound.tagline": "Stock Scanner — AI-Powered Signal Analysis",

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

    // Relative time
    "time.justNow": "just now",
    "time.minsAgo": "{n} min{s} ago",
    "time.hrsAgo": "{n} hr{s} ago",
    "time.daysAgo": "{n} day{s} ago",

    // Market state
    "market.closed": "Closed",
    "market.open": "Market Open",
    "market.pre": "Pre-Market",
    "market.afterHours": "After Hours",

    // Period descriptions
    "period.1y": "1 Year",
    "period.2y": "2 Years",
    "period.3y": "3 Years",
    "period.5y": "5 Years",
    "period.10y": "10 Years",

    // Time Machine [ticker] page
    "tm.whatIfBought": "What if you had bought ",
    "tm.on": " on ",
    "tm.pickDateSubtitle": "Pick a date. See what the signals said. Discover what actually happened.",
    "tm.selectADate": "Select a Date",
    "tm.keyMarketMoments": "Key Market Moments",
    "tm.showFewer": "Show fewer",
    "tm.showMoreYears": "Show {n} more years",
    "tm.indicators": "Indicators",
    "tm.nSelected": "{n} selected",
    "tm.filterDesc": "Filter which indicator conditions are shown in the results below.",
    "tm.retry": "Retry",
    "tm.signalsOnDate": "The signals on ",
    "tm.similarPatternsInDays": "{count} similar pattern{s} found in {days} trading days",
    "tm.revealWhatHappened": "Reveal What Happened",
    "tm.forwardReturns": "Forward Returns",
    "tm.current": "Current",
    "tm.signalStrength": "Signal Strength",
    "tm.cases": "Cases",
    "tm.bias": "Bias",
    "tm.noDataForPeriod": "No data for this period.",
    "tm.noEdgeData": "No edge data for this period.",
    "tm.howThisRanked": "How This Ranked",
    "tm.outcomeWasBetterThan": "This outcome was better than",
    "tm.ofSimilarHistorical": "of similar historical cases",
    "tm.shareThisDiscovery": "Share This Discovery",
    "tm.copied": "Copied!",
    "tm.tryAnotherDate": "Try Another Date",
    "tm.pickDateFromHistory": "Pick a date from history",
    "tm.pickDateDesc": "Discover what the signals would have told you, and what actually happened next. Not predictions -- just patterns from the past.",
    "tm.mostInteresting": "Most interesting dates",
    "tm.pctWentUp": "{pct}% went up",
    "tm.gaugeStrong": "Strong",
    "tm.gaugeNeutral": "Neutral",
    "tm.gaugeWeak": "Weak",
    "tm.removeFromFilter": "Remove {key} from filter",
    "tm.addToFilter": "Add {key} to filter",
    "tm.minIndicators": "Minimum 2 indicators required",
    "tm.shareWhatIf": "What if you bought ${ticker} on {date}?",
    "tm.shareSignal": "Signal: {conditions} ({winRate}% win rate)",
    "tm.shareResult": "Result: {returnPct} in {label}",
    "tm.shareExplored": "Explored with Stock Scanner",

    // Time Machine preset labels
    "tm.preset.trumpElection": "Trump Election 2016",
    "tm.preset.volmageddon": "Volmageddon",
    "tm.preset.christmasEveCrash": "Christmas Eve Crash",
    "tm.preset.tradeWarLow": "Trade War Low",
    "tm.preset.preCovidHigh": "Pre-COVID High",
    "tm.preset.covidBottom": "COVID Bottom",
    "tm.preset.techBubblePop": "Tech Bubble Pop",
    "tm.preset.vaccineDay": "Vaccine Day",
    "tm.preset.gamestopSqueeze": "GameStop Squeeze",
    "tm.preset.evergrandePanic": "Evergrande Panic",
    "tm.preset.2021MarketPeak": "2021 Market Peak",
    "tm.preset.rateShock": "Rate Shock",
    "tm.preset.2022BearMarket": "2022 Bear Market",
    "tm.preset.cpiReversal": "CPI Reversal",
    "tm.preset.aiRallyStart": "AI Rally Start",
    "tm.preset.svbCrisis": "SVB Crisis",
    "tm.preset.oct2023Low": "Oct 2023 Low",
    "tm.preset.iranIsrael": "Iran-Israel Scare",
    "tm.preset.rotationDay": "Rotation Day",
    "tm.preset.yenCarry": "Yen Carry Unwind",
    "tm.preset.2024Election": "2024 Election",
    "tm.preset.deepseekCrash": "DeepSeek Crash",
    "tm.preset.tariffShock": "Tariff Shock",
    "tm.presetDesc.trumpElection": "Post-election rally",
    "tm.presetDesc.volmageddon": "VIX spike, XIV collapse",
    "tm.presetDesc.christmasEveCrash": "Fed tightening panic",
    "tm.presetDesc.tradeWarLow": "US-China tariffs escalate",
    "tm.presetDesc.preCovidHigh": "Market peak before crash",
    "tm.presetDesc.covidBottom": "Market crash to decade lows",
    "tm.presetDesc.techBubblePop": "Post-COVID tech peak",
    "tm.presetDesc.vaccineDay": "Pfizer vaccine announcement",
    "tm.presetDesc.gamestopSqueeze": "Meme stock mania peak",
    "tm.presetDesc.evergrandePanic": "China property crisis",
    "tm.presetDesc.2021MarketPeak": "NASDAQ all-time high",
    "tm.presetDesc.rateShock": "Fed hawkish pivot",
    "tm.presetDesc.2022BearMarket": "S&P enters bear territory",
    "tm.presetDesc.cpiReversal": "Hot CPI, massive intraday reversal",
    "tm.presetDesc.aiRallyStart": "ChatGPT sparks AI momentum",
    "tm.presetDesc.svbCrisis": "Bank run sends shockwaves",
    "tm.presetDesc.oct2023Low": "Bond yield peak rattles stocks",
    "tm.presetDesc.iranIsrael": "Geopolitical risk spike",
    "tm.presetDesc.rotationDay": "Small caps surge, tech drops",
    "tm.presetDesc.yenCarry": "Japan rate hike shock",
    "tm.presetDesc.2024Election": "US presidential election day",
    "tm.presetDesc.deepseekCrash": "AI chip stocks sell-off",
    "tm.presetDesc.tariffShock": "Liberation Day tariffs",

    // Analyze [ticker] page
    "analysis.viewHistoricalCases": "View {n} historical cases",
    "analysis.individualIndicators": "Individual Indicators",
    "analysis.noHistoricalMatches": "No historical matches for the {tier} tier. Try a different tier or adjust your indicator selection.",
    "analysis.noSmartDataFallback": "No combined signal data available. The smart analysis is loading...",
    "analysis.historicalMatches": "historical matches",
    "analysis.date": "Date",
    "analysis.entryPrice": "Entry Price",
    "analysis.timeMachineLink": "Time Machine",
    "analysis.direction.unusual": "Unusual",

    // Indicator Card extras
    "indicator.bestReturn": "Best return",
    "indicator.worstReturn": "Worst return",
    "indicator.samples": "Samples",
    "indicator.stdDev": "Std dev",

    // Sidebar
    "sidebar.plan": "{plan} plan",

    // Header market badges
    "header.live": "Live",
    "header.pre": "Pre",
    "header.afterHours": "AH",
    "header.closed": "Closed",
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
    "dashboard.justNow": "방금",

    // Sectors
    "sector.all": "전체",
    "sector.technology": "기술",
    "sector.healthcare": "헬스케어",
    "sector.energy": "에너지",
    "sector.finance": "금융",
    "sector.consumer": "소비재",
    "sector.industrial": "산업",
    "sector.etfs": "ETF",

    // Analysis page
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
    "analysis.stockAnalysis": "종목 분석",
    "analysis.stockAnalysisDesc":
      "12개 기술 지표와 확률 기반 시그널로 모든 종목을 심층 분석합니다.",
    "analysis.enterTicker": "분석할 종목을 입력하세요",
    "analysis.analyze": "분석",
    "analysis.orPickPopular": "인기 종목 바로가기",
    "analysis.tipCtrlK":
      "팁: 어디서든 {key}를 누르면 종목을 빠르게 검색할 수 있습니다",
    "analysis.backToScanner": "스캐너로 돌아가기",
    "analysis.selectIndicators":
      "지표를 선택하여 종합 확률을 커스터마이즈하세요",
    "analysis.minIndicators": "최소 2개 지표 필요",
    "analysis.removeIndicator": "종합 시그널에서 {key} 제거",
    "analysis.addIndicator": "종합 시그널에 {key} 추가",
    "analysis.active": "활성",
    "analysis.collapse": "접기",
    "analysis.showProbabilities": "확률 기간:",
    "analysis.noMatchesTier":
      "{tier} 티어에 해당하는 과거 사례가 없습니다. 다른 티어를 선택하거나 지표 조합을 변경해 보세요.",
    "analysis.noSmartData":
      "종합 시그널 데이터 없음. 스마트 분석을 로딩 중입니다...",
    "analysis.dataUnavailable": "데이터 없음",
    "analysis.viewDetails": "상세 보기",
    "analysis.patterns": "패턴",
    "analysis.wentUp": "상승",
    "analysis.timeMachineHighlights": "타임머신 하이라이트",
    "analysis.exploreMoreDates": "더 많은 날짜 탐색",
    "analysis.strictDesc":
      "가장 엄격한 조건, 적은 매칭, 높은 정밀도",
    "analysis.normalDesc": "균형 잡힌 조건 (추천)",
    "analysis.relaxedDesc":
      "가장 넓은 조건, 많은 매칭, 낮은 정밀도",
    "analysis.direction.bullish": "상승",
    "analysis.direction.bearish": "하락",
    "analysis.direction.neutral": "중립",

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
    "tm.signalTimeMachine": "시그널 타임머신",
    "tm.timeMachineDesc":
      "과거 어느 날짜로든 돌아가 보세요. 시그널이 무엇을 말했는지, 실제로 무슨 일이 일어났는지 확인하세요.",
    "tm.enterTicker": "탐색할 종목을 입력하세요",
    "tm.explore": "탐색",
    "tm.orPickPopular": "인기 종목 바로가기",
    "tm.selectDate": "날짜 선택",
    "tm.keyMarketDates": "주요 시장 이벤트",
    "tm.timeMachine": "타임머신",
    "tm.explorePatterns":
      "과거 시그널 패턴과 그 결과를 탐색합니다",
    "tm.backToAnalysis": "분석으로 돌아가기",
    "tm.similarPatternsFound": "유사 패턴 발견",
    "tm.outOfDays": "{days}거래일 중",
    "tm.afterDays": "{days} 후",
    "tm.up": "상승",
    "tm.occurrences": "발생 횟수",
    "tm.tier": "티어",
    "tm.direction": "방향",
    "tm.noDataPeriod": "이 기간에 대한 데이터가 없습니다.",
    "tm.returned": "{ticker} 수익률:",
    "tm.inDays": "{days} 동안",
    "tm.betterThanPct": "상위",
    "tm.ofHistoricalCases": "유사 과거 사례 대비",
    "tm.allForwardReturns": "전체 향후 수익률",
    "tm.winRateAdvantage": "승률 우위",
    "tm.individualBreakdown": "개별 지표 상세",
    "tm.condition": "조건",
    "tm.state": "상태",
    "tm.value": "값",
    "tm.priceContext": "가격 맥락",
    "tm.priceOn": "{date} 가격",
    "tm.currentPrice": "현재 가격",
    "tm.totalReturn": "총 수익률",
    "tm.highlights": "하이라이트",
    "tm.selectDateExplore": "날짜를 선택하여 과거 패턴을 탐색하세요",
    "tm.timeMachineExplain":
      "타임머신은 과거에서 유사한 기술 지표 패턴을 찾아 결과 분포를 보여줍니다. 예측이 아닌, 유사한 조건에서 실제로 일어난 일을 확인하세요.",
    "tm.worst": "최악",
    "tm.best": "최선",
    "tm.winRate": "승률",
    "tm.avgReturn": "평균 수익률",
    "tm.covidBottom": "코로나 바닥",
    "tm.rateShock": "금리 충격",
    "tm.aiRallyStart": "AI 랠리 시작",
    "tm.svbCrisis": "SVB 사태",
    "tm.oct2023Low": "2023년 10월 저점",
    "tm.election2024": "2024 대선",
    "tm.covidDesc": "시장 폭락 저점",
    "tm.rateShockDesc": "연준 매파 전환",
    "tm.aiRallyDesc": "ChatGPT 모멘텀",
    "tm.svbDesc": "뱅크런 패닉",
    "tm.oct2023Desc": "채권 금리 고점",
    "tm.electionDesc": "미국 대통령 선거",

    // Alerts
    "alerts.title": "알림",
    "alerts.subtitle": "설정한 조건 충족 시 알림을 받으세요",
    "alerts.newAlert": "새 알림",
    "alerts.noAlerts": "알림이 없습니다",
    "alerts.noAlertsDesc":
      "과매도 반등 시그널 진입, 가격 레벨 돌파, 사용자 지정 조건 충족 시 알림을 받을 수 있습니다.",
    "alerts.signalAlert": "시그널 알림",
    "alerts.signalAlertDesc":
      '"AAPL이 승률 60% 이상의 과매도 반등 시그널에 진입하면 알림"',
    "alerts.probabilityAlert": "확률 알림",
    "alerts.probabilityAlertDesc":
      '"20일 종합 승률이 80%를 넘는 종목이 있으면 알림"',
    "alerts.requirePro": "알림은 Pro 구독이 필요합니다",

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
    "header.opensIn": "개장까지",
    "header.closesIn": "마감까지",

    // Signal Table
    "table.ticker": "종목",
    "table.sector": "섹터",
    "table.price": "가격",
    "table.changePct": "변동%",
    "table.changePctShort": "변동%",
    "table.strength": "강도",
    "table.signalsFound": "시그널 발견",
    "table.signalFound": "시그널 발견",
    "table.scannedTickers": "{count}개 종목 스캔",
    "table.showing": "{count}개 표시",
    "table.displayPeriod": "표시 기간:",
    "table.view": "보기",
    "table.noSignals": "이 필터에 해당하는 시그널이 없습니다.",
    "table.signalCondition": "시그널 조건",

    // Search
    "search.searchTicker": "종목 검색...",
    "search.search": "검색...",
    "search.searchPlaceholder": "종목 코드 또는 회사명으로 검색...",
    "search.recent": "최근 검색",
    "search.noResults": "검색 결과 없음:",
    "search.pressEnter": "Enter를 눌러 검색",
    "search.directly": "바로 이동",
    "search.navigate": "이동",
    "search.select": "선택",
    "search.close": "닫기",

    // Chart
    "chart.loadingChart": "차트 로딩 중...",
    "chart.noData": "차트 데이터 없음",

    // Indicator Card
    "indicator.winRate": "승률",
    "indicator.avgReturn": "평균 수익률:",
    "indicator.oversold": "과매도",
    "indicator.overbought": "과매수",
    "indicator.unusual": "이상",
    "indicator.neutral": "중립",

    // Loading page
    "loading.signals": "시그널 로딩 중...",
    "loading.firstVisit":
      "첫 방문 시 스캐너 실행으로 최대 30초가 소요될 수 있습니다.",

    // Error page
    "error.title": "오류가 발생했습니다",
    "error.unexpected":
      "예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.",
    "error.errorId": "오류 ID:",
    "error.tryAgain": "다시 시도",
    "error.goToScanner": "스캐너로 이동",
    "error.persistContact":
      "문제가 지속되면 고객 지원에 문의해 주세요.",

    // 404 page
    "notFound.title": "페이지를 찾을 수 없습니다",
    "notFound.description":
      "찾으시는 페이지가 존재하지 않거나 이동되었습니다.",
    "notFound.goToScanner": "스캐너로 이동",
    "notFound.backToHome": "홈으로 돌아가기",
    "notFound.tagline": "Stock Scanner — AI 기반 시그널 분석",

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

    // Relative time
    "time.justNow": "방금",
    "time.minsAgo": "{n}분 전",
    "time.hrsAgo": "{n}시간 전",
    "time.daysAgo": "{n}일 전",

    // Market state
    "market.closed": "장 마감",
    "market.open": "장 개장",
    "market.pre": "프리마켓",
    "market.afterHours": "시간 외 거래",

    // Period descriptions
    "period.1y": "1년",
    "period.2y": "2년",
    "period.3y": "3년",
    "period.5y": "5년",
    "period.10y": "10년",

    // Time Machine [ticker] page
    "tm.whatIfBought": "만약 ",
    "tm.on": "에 ",
    "tm.pickDateSubtitle": "날짜를 선택하세요. 시그널이 무엇을 말했는지, 실제로 어떤 일이 일어났는지 확인하세요.",
    "tm.selectADate": "날짜 선택",
    "tm.keyMarketMoments": "주요 시장 이벤트",
    "tm.showFewer": "접기",
    "tm.showMoreYears": "{n}개 연도 더 보기",
    "tm.indicators": "지표",
    "tm.nSelected": "{n}개 선택",
    "tm.filterDesc": "아래 결과에 표시할 지표 조건을 필터링합니다.",
    "tm.retry": "다시 시도",
    "tm.signalsOnDate": "",
    "tm.similarPatternsInDays": "{days}거래일 중 {count}개 유사 패턴 발견",
    "tm.revealWhatHappened": "결과 보기",
    "tm.forwardReturns": "향후 수익률",
    "tm.current": "현재",
    "tm.signalStrength": "시그널 강도",
    "tm.cases": "사례",
    "tm.bias": "방향",
    "tm.noDataForPeriod": "이 기간에 대한 데이터가 없습니다.",
    "tm.noEdgeData": "이 기간에 대한 우위 데이터가 없습니다.",
    "tm.howThisRanked": "순위",
    "tm.outcomeWasBetterThan": "이 결과는 상위",
    "tm.ofSimilarHistorical": "유사 과거 사례 대비",
    "tm.shareThisDiscovery": "공유하기",
    "tm.copied": "복사됨!",
    "tm.tryAnotherDate": "다른 날짜 탐색",
    "tm.pickDateFromHistory": "과거 날짜를 선택하세요",
    "tm.pickDateDesc": "시그널이 무엇을 알려줬을지, 그 후에 실제로 무슨 일이 일어났는지 확인하세요. 예측이 아닌, 과거 패턴입니다.",
    "tm.mostInteresting": "주요 날짜",
    "tm.pctWentUp": "{pct}% 상승",
    "tm.gaugeStrong": "강함",
    "tm.gaugeNeutral": "중립",
    "tm.gaugeWeak": "약함",
    "tm.removeFromFilter": "필터에서 {key} 제거",
    "tm.addToFilter": "필터에 {key} 추가",
    "tm.minIndicators": "최소 2개 지표 필요",
    "tm.shareWhatIf": "만약 {date}에 ${ticker}를 매수했다면?",
    "tm.shareSignal": "시그널: {conditions} (승률 {winRate}%)",
    "tm.shareResult": "결과: {label} 동안 {returnPct}",
    "tm.shareExplored": "Stock Scanner로 탐색",

    // Time Machine preset labels
    "tm.preset.trumpElection": "트럼프 당선 2016",
    "tm.preset.volmageddon": "볼마겟돈",
    "tm.preset.christmasEveCrash": "크리스마스 이브 폭락",
    "tm.preset.tradeWarLow": "무역전쟁 저점",
    "tm.preset.preCovidHigh": "코로나 직전 고점",
    "tm.preset.covidBottom": "코로나 바닥",
    "tm.preset.techBubblePop": "기술주 버블 붕괴",
    "tm.preset.vaccineDay": "백신 발표일",
    "tm.preset.gamestopSqueeze": "게임스탑 스퀴즈",
    "tm.preset.evergrandePanic": "헝다 패닉",
    "tm.preset.2021MarketPeak": "2021년 시장 고점",
    "tm.preset.rateShock": "금리 충격",
    "tm.preset.2022BearMarket": "2022년 약세장",
    "tm.preset.cpiReversal": "CPI 반전",
    "tm.preset.aiRallyStart": "AI 랠리 시작",
    "tm.preset.svbCrisis": "SVB 사태",
    "tm.preset.oct2023Low": "2023년 10월 저점",
    "tm.preset.iranIsrael": "이란-이스라엘 위기",
    "tm.preset.rotationDay": "로테이션 데이",
    "tm.preset.yenCarry": "엔캐리 청산",
    "tm.preset.2024Election": "2024 대선",
    "tm.preset.deepseekCrash": "딥시크 폭락",
    "tm.preset.tariffShock": "관세 충격",
    "tm.presetDesc.trumpElection": "대선 후 랠리",
    "tm.presetDesc.volmageddon": "VIX 급등, XIV 붕괴",
    "tm.presetDesc.christmasEveCrash": "연준 긴축 패닉",
    "tm.presetDesc.tradeWarLow": "미중 관세 확대",
    "tm.presetDesc.preCovidHigh": "폭락 직전 고점",
    "tm.presetDesc.covidBottom": "시장 폭락 저점",
    "tm.presetDesc.techBubblePop": "코로나 후 기술주 고점",
    "tm.presetDesc.vaccineDay": "화이자 백신 발표",
    "tm.presetDesc.gamestopSqueeze": "밈 주식 광풍 고점",
    "tm.presetDesc.evergrandePanic": "중국 부동산 위기",
    "tm.presetDesc.2021MarketPeak": "나스닥 사상 최고",
    "tm.presetDesc.rateShock": "연준 매파 전환",
    "tm.presetDesc.2022BearMarket": "S&P 약세장 진입",
    "tm.presetDesc.cpiReversal": "CPI 쇼크, 장중 대반전",
    "tm.presetDesc.aiRallyStart": "ChatGPT 모멘텀",
    "tm.presetDesc.svbCrisis": "뱅크런 충격",
    "tm.presetDesc.oct2023Low": "채권 금리 고점",
    "tm.presetDesc.iranIsrael": "지정학 리스크 급등",
    "tm.presetDesc.rotationDay": "소형주 급등, 기술주 하락",
    "tm.presetDesc.yenCarry": "일본 금리 인상 충격",
    "tm.presetDesc.2024Election": "미국 대통령 선거일",
    "tm.presetDesc.deepseekCrash": "AI 반도체주 매도",
    "tm.presetDesc.tariffShock": "해방의 날 관세",

    // Analyze [ticker] page
    "analysis.viewHistoricalCases": "과거 {n}개 사례 보기",
    "analysis.individualIndicators": "개별 지표",
    "analysis.noHistoricalMatches": "{tier} 티어에 해당하는 과거 사례가 없습니다. 다른 티어를 선택하거나 지표 조합을 변경해 보세요.",
    "analysis.noSmartDataFallback": "종합 시그널 데이터 없음. 스마트 분석을 로딩 중입니다...",
    "analysis.historicalMatches": "과거 유사 사례",
    "analysis.date": "날짜",
    "analysis.entryPrice": "진입 가격",
    "analysis.timeMachineLink": "타임머신",
    "analysis.direction.unusual": "이상",

    // Indicator Card extras
    "indicator.bestReturn": "최대 수익률",
    "indicator.worstReturn": "최대 손실률",
    "indicator.samples": "표본 수",
    "indicator.stdDev": "표준편차",

    // Sidebar
    "sidebar.plan": "{plan} 플랜",

    // Header market badges
    "header.live": "실시간",
    "header.pre": "프리",
    "header.afterHours": "시간외",
    "header.closed": "마감",
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

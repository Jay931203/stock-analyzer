export interface PeriodStats {
  samples: number;
  win_rate: number;
  avg_return: number;
  median_return: number;
  best: number;
  worst: number;
  std_dev: number;
}

export interface CaseRecord {
  date: string;
  entry_price: number;
  returns: Record<string, number>;
}

export interface ProbabilityData {
  condition: string;
  occurrences: number;
  periods: Record<string, PeriodStats>;
  cases?: CaseRecord[];
  warning?: string;
}

export interface RSIData {
  value: number | null;
  window: number;
  probability?: ProbabilityData;
}

export interface MACDData {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  event?: string;
  probability?: ProbabilityData;
}

export interface MAData {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  price: number;
  alignment: string;
  probability?: ProbabilityData;
}

export interface BBData {
  upper: number | null;
  middle: number | null;
  lower: number | null;
  width: number | null;
  position: number | null;
  price: number;
  zone?: string;
  probability?: ProbabilityData;
}

export interface VolumeData {
  current: number;
  avg20: number | null;
  ratio: number | null;
  probability?: ProbabilityData;
}

export interface StochasticData {
  k: number | null;
  d: number | null;
  probability?: ProbabilityData;
}

// ── NEW indicator types ──

export interface DrawdownData {
  from_20d_high: number | null;
  from_60d_high: number | null;
  from_252d_high: number | null;
  high_20d: number | null;
  high_60d: number | null;
  high_252d: number | null;
  probability?: ProbabilityData;
}

export interface ADXData {
  adx: number | null;
  plus_di: number | null;
  minus_di: number | null;
  trend_strength: string | null;
  probability?: ProbabilityData;
}

export interface ATRData {
  atr: number | null;
  atr_pct: number | null;
  probability?: ProbabilityData;
}

export interface MADistanceData {
  from_sma20: number | null;
  from_sma50: number | null;
  from_sma200: number | null;
  probability?: ProbabilityData;
}

export interface ConsecutiveData {
  days: number;
  streak_type: string;
  probability?: ProbabilityData;
}

export interface PriceDistBin {
  price_low: number;
  price_high: number;
  days: number;
  pct: number;
}

export interface Week52Data {
  position_pct: number | null;
  high: number | null;
  low: number | null;
  probability?: ProbabilityData;
  price_distribution?: PriceDistBin[];
}

export interface PriceInfo {
  current: number;
  change: number;
  change_pct: number;
  high_52w?: number;
  low_52w?: number;
}

export interface TickerInfo {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  currency: string;
}

export interface CombinedProbability {
  conditions: string[];
  probability: ProbabilityData;
}

export interface AnalysisResponse {
  ticker_info: TickerInfo;
  price: PriceInfo;
  indicators: {
    rsi: RSIData;
    macd: MACDData;
    ma: MAData;
    bb: BBData;
    volume: VolumeData;
    stochastic: StochasticData;
    drawdown: DrawdownData;
    adx: ADXData;
    atr: ATRData;
    ma_distance: MADistanceData;
    consecutive: ConsecutiveData;
    week52: Week52Data;
  };
  combined?: CombinedProbability;
  analysis_date: string;
  data_range?: string;
}

export interface SmartProbabilityResult {
  tiers: Record<string, ProbabilityData>;
  best_tier: string;
  individuals: Record<string, ProbabilityData>;
  impact: Record<string, ProbabilityData>;
  selected: string[];
  data_days: number;
  current_values: Record<string, number | string | null>;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

export interface TrendingStock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market_cap: number;
  week_return: number;
  month_return: number;
  sector: string;
  market_state?: string;
}

export interface SignalItem {
  ticker: string;
  name?: string;
  price: number;
  change_pct: number;
  sector: string;
  market_cap_b?: number;
  win_rate_5d: number;
  win_rate_20d: number;
  win_rate_60d: number;
  avg_return_5d?: number;
  avg_return_20d: number;
  avg_return_60d?: number;
  occurrences: number;
  condition: string;
  indicators_used: number;
  strength: number;
  tier: string;
  volume_ratio?: number;
  volume_level?: string;
}

export interface EarningsItem {
  ticker: string;
  name: string;
  earnings_date: string;
  days_until: number;
  time_of_day: string;
  price?: number;
  change_pct?: number;
}

export interface FlipItem {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  sector: string;
  prev_win_rate: number;
  curr_win_rate: number;
  direction: 'bullish' | 'bearish';
  delta: number;
}

export interface CalendarEvent {
  date: string;
  type: 'FOMC' | 'CPI' | 'PPI' | 'PMI' | 'NFP' | 'EARNINGS';
  label: string;
  impact: 'high' | 'medium' | 'low';
  days_until: number;
  ticker?: string;
  name?: string;
  time_of_day?: string;
  avg_move?: number;
  bullish_pct?: number;
  desc?: string;
}

export interface SignalsResponse {
  signals: SignalItem[];
  scanned: number;
  updated: string;
  market_state: string;
}

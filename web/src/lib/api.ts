// ---------------------------------------------------------------------------
// API Types – matched to REAL backend responses
// ---------------------------------------------------------------------------

export interface Signal {
  ticker: string;
  name?: string;
  price: number;
  change_pct: number;
  sector: string;
  market_cap_b?: number;
  win_rate_5d: number;
  win_rate_20d: number;
  win_rate_60d: number;
  win_rate_120d?: number;
  win_rate_252d?: number;
  avg_return_5d?: number;
  avg_return_20d: number;
  avg_return_60d?: number;
  avg_return_120d?: number;
  avg_return_252d?: number;
  occurrences: number;
  condition: string;
  indicators_used: number;
  strength: number;
  tier: string;
  volume_ratio?: number;
  volume_level?: string;
}

export interface FlipItem {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  sector: string;
  prev_win_rate: number;
  curr_win_rate: number;
  direction: "bullish" | "bearish";
  delta: number;
}

export interface CalendarEvent {
  date: string;
  type: string;
  label: string;
  impact: string;
  ticker?: string;
  desc?: string;
}

export interface SignalsResponse {
  signals: Signal[];
  scanned: number;
  updated: string;
  market_state: string;
  total_signals?: number;
  is_truncated?: boolean;
  calendar?: CalendarEvent[];
  flips?: { flips: FlipItem[]; updated: string; count: number };
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  candles: ChartDataPoint[];
  ticker: string;
  period: string;
}

export interface LivePriceData {
  price: number;
  change: number;
  change_pct: number;
  market_state: string;
}

export interface LivePricesResponse {
  prices: Record<string, LivePriceData>;
  updated: string;
}

// Search – client-side only, no API endpoint
export interface SearchResult {
  symbol: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Analysis types (from actual /api/analyze/{ticker} response)
// ---------------------------------------------------------------------------

export interface PeriodStats {
  samples: number;
  win_rate: number;
  avg_return: number;
  median_return: number;
  best: number;
  worst: number;
  std_dev: number;
}

export interface ProbabilityData {
  condition: string;
  occurrences: number;
  periods: Record<string, PeriodStats>;
  warning?: string;
  data_period?: string;
}

export interface TickerInfo {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  currency: string;
}

export interface PriceInfo {
  current: number;
  change: number;
  change_pct: number;
  high_52w?: number;
  low_52w?: number;
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

export interface Week52Data {
  position_pct: number | null;
  high: number | null;
  low: number | null;
  probability?: ProbabilityData;
}

export interface IndicatorsData {
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
}

export interface CombinedProbability {
  conditions: string[];
  probability: ProbabilityData;
}

export interface AnalysisResponse {
  ticker_info: TickerInfo;
  price: PriceInfo;
  indicators: IndicatorsData;
  combined?: CombinedProbability;
  analysis_date: string;
  data_range?: string;
}

// ---------------------------------------------------------------------------
// Time Machine types
// ---------------------------------------------------------------------------

export interface TimeMachineActual {
  return_pct: number;
  end_price: number;
  went_up: boolean;
}

export interface TimeMachineResponse {
  ticker: string;
  date: string;
  price_at_date: number;
  current_price: number;
  signal: {
    direction: string;
    win_rate_20d: number;
    win_rates?: Record<string, number>;
    occurrences: number;
    conditions: { indicator: string; state: string }[];
  };
  actual: Record<string, TimeMachineActual>;
  accuracy: {
    predicted_direction: string;
    actual_direction: string;
    was_correct: boolean;
  };
  indicators_at_date: Record<string, unknown>;
  highlights: { text: string; type: string }[];
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const API_BASE = "/api";

class StockAPI {
  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: HeadersInit = { "Content-Type": "application/json" };

    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg =
        typeof err.detail === "string"
          ? err.detail
          : (err.detail?.message ?? res.statusText);
      throw new Error(msg);
    }

    return res.json();
  }

  // Signals
  async getSignals(period = "3y", limit = 101) {
    return this.fetch<SignalsResponse>(
      `/signals?data_period=${period}&limit=${limit}&include_calendar=true&include_flips=true`,
    );
  }

  // Analysis
  async getAnalysis(ticker: string, period = "10y") {
    return this.fetch<AnalysisResponse>(
      `/analyze/${ticker}?period=${period}`,
    );
  }

  // Chart data
  async getChart(ticker: string, period = "1y") {
    return this.fetch<ChartResponse>(`/chart/${ticker}?period=${period}`);
  }

  // Smart probability
  async getSmartProbability(
    ticker: string,
    indicators: string[],
    period = "10y",
  ) {
    return this.fetch<Record<string, unknown>>(
      `/smart-probability/${ticker}?period=${period}`,
      {
        method: "POST",
        body: JSON.stringify({ selected_indicators: indicators }),
      },
    );
  }

  // Time Machine
  async getTimeMachine(ticker: string, date: string, period = "3y") {
    return this.fetch<TimeMachineResponse>(
      `/time-machine/${ticker}?date=${date}&period=${period}`,
    );
  }

  // Live prices
  async getLivePrices(tickers: string[]) {
    return this.fetch<LivePricesResponse>(
      `/live-prices?tickers=${tickers.join(",")}`,
    );
  }
}

export const api = new StockAPI();

// ---------------------------------------------------------------------------
// Client-side ticker database for search (no /api/search endpoint)
// ---------------------------------------------------------------------------

export const TICKER_DB: Record<string, string> = {
  // Technology: Mega-cap
  AAPL: "Apple Inc.", AMZN: "Amazon.com Inc.", GOOGL: "Alphabet Inc.",
  META: "Meta Platforms Inc.", MSFT: "Microsoft Corporation",
  NVDA: "NVIDIA Corporation", TSLA: "Tesla Inc.",
  // Technology: Semiconductors
  AMAT: "Applied Materials Inc.", AMD: "Advanced Micro Devices Inc.",
  ARM: "Arm Holdings plc", ASML: "ASML Holding NV",
  AVGO: "Broadcom Inc.", INTC: "Intel Corporation",
  KLAC: "KLA Corporation", LRCX: "Lam Research Corp.",
  MRVL: "Marvell Technology Inc.", MU: "Micron Technology Inc.",
  QCOM: "Qualcomm Inc.", SMCI: "Super Micro Computer Inc.",
  TSM: "Taiwan Semiconductor",
  // Technology: Enterprise / Cloud / Cyber
  ADBE: "Adobe Inc.", CRM: "Salesforce Inc.",
  CRWD: "CrowdStrike Holdings Inc.", DDOG: "Datadog Inc.",
  NET: "Cloudflare Inc.", OKTA: "Okta Inc.",
  ORCL: "Oracle Corporation", PANW: "Palo Alto Networks Inc.",
  PLTR: "Palantir Technologies Inc.", SHOP: "Shopify Inc.",
  SNOW: "Snowflake Inc.", ZS: "Zscaler Inc.",
  // Technology: Fintech / Payments
  AXP: "American Express Company", COIN: "Coinbase Global Inc.",
  MA: "Mastercard Inc.", MSTR: "MicroStrategy Inc.",
  PYPL: "PayPal Holdings Inc.", SQ: "Block Inc.", V: "Visa Inc.",
  // Consumer Discretionary
  ABNB: "Airbnb Inc.", BKNG: "Booking Holdings Inc.",
  CMG: "Chipotle Mexican Grill Inc.", COST: "Costco Wholesale Corp.",
  DASH: "DoorDash Inc.", HD: "The Home Depot Inc.",
  LOW: "Lowe's Companies Inc.", LULU: "Lululemon Athletica Inc.",
  MAR: "Marriott International Inc.", MCD: "McDonald's Corporation",
  NKE: "Nike Inc.", SBUX: "Starbucks Corp.",
  TGT: "Target Corporation", UBER: "Uber Technologies Inc.",
  WMT: "Walmart Inc.", YUM: "Yum! Brands Inc.",
  // Consumer Staples
  KO: "The Coca-Cola Company", PEP: "PepsiCo Inc.",
  PG: "Procter & Gamble Co.",
  // Communication / Media
  CHTR: "Charter Communications Inc.", CMCSA: "Comcast Corporation",
  DIS: "The Walt Disney Company", NFLX: "Netflix Inc.",
  PINS: "Pinterest Inc.", SNAP: "Snap Inc.",
  SPOT: "Spotify Technology SA", TMUS: "T-Mobile US Inc.",
  // Telecom
  T: "AT&T Inc.", VZ: "Verizon Communications Inc.",
  // Financial Services
  BAC: "Bank of America Corp.", BLK: "BlackRock Inc.",
  "BRK-B": "Berkshire Hathaway Inc.", C: "Citigroup Inc.",
  CME: "CME Group Inc.", GS: "Goldman Sachs Group Inc.",
  ICE: "Intercontinental Exchange Inc.", JPM: "JPMorgan Chase & Co.",
  MCO: "Moody's Corporation", MS: "Morgan Stanley",
  PNC: "PNC Financial Services Group Inc.", SCHW: "Charles Schwab Corp.",
  SPGI: "S&P Global Inc.", TFC: "Truist Financial Corp.",
  UNH: "UnitedHealth Group Inc.", USB: "U.S. Bancorp",
  WFC: "Wells Fargo & Company",
  // Healthcare
  ABBV: "AbbVie Inc.", AMGN: "Amgen Inc.",
  BDX: "Becton Dickinson and Co.", BMY: "Bristol-Myers Squibb Co.",
  DHR: "Danaher Corporation", DXCM: "DexCom Inc.",
  EW: "Edwards Lifesciences Corp.", GILD: "Gilead Sciences Inc.",
  IDXX: "IDEXX Laboratories Inc.", ISRG: "Intuitive Surgical Inc.",
  JNJ: "Johnson & Johnson", LLY: "Eli Lilly and Company",
  MDT: "Medtronic plc", MRK: "Merck & Co. Inc.",
  PFE: "Pfizer Inc.", REGN: "Regeneron Pharmaceuticals Inc.",
  SYK: "Stryker Corporation", TMO: "Thermo Fisher Scientific Inc.",
  VRTX: "Vertex Pharmaceuticals Inc.", ZTS: "Zoetis Inc.",
  // Energy
  COP: "ConocoPhillips", CVX: "Chevron Corporation",
  EOG: "EOG Resources Inc.", OXY: "Occidental Petroleum Corp.",
  PSX: "Phillips 66", SLB: "Schlumberger Ltd.",
  VLO: "Valero Energy Corporation", XOM: "Exxon Mobil Corporation",
  // Industrials / Defense
  BA: "The Boeing Company", CAT: "Caterpillar Inc.",
  DE: "Deere & Company", EMR: "Emerson Electric Co.",
  FDX: "FedEx Corporation", GE: "GE Aerospace",
  HON: "Honeywell International Inc.", ITW: "Illinois Tool Works Inc.",
  LMT: "Lockheed Martin Corp.", MMM: "3M Company",
  RTX: "RTX Corporation", UNP: "Union Pacific Corp.",
  UPS: "United Parcel Service Inc.",
  // Utilities
  AEP: "American Electric Power Co.", DUK: "Duke Energy Corporation",
  NEE: "NextEra Energy Inc.", SO: "The Southern Company",
  // Real Estate
  AMT: "American Tower Corp.", CCI: "Crown Castle Inc.",
  EQIX: "Equinix Inc.", PLD: "Prologis Inc.",
  // Materials
  APD: "Air Products and Chemicals Inc.", ECL: "Ecolab Inc.",
  FCX: "Freeport-McMoRan Inc.", LIN: "Linde plc",
  NEM: "Newmont Corporation", SHW: "Sherwin-Williams Co.",
  // Other / Growth
  BABA: "Alibaba Group", LCID: "Lucid Group Inc.",
  NIO: "NIO Inc.", RBLX: "Roblox Corporation",
  RIVN: "Rivian Automotive Inc.", SOFI: "SoFi Technologies Inc.",
  // ETFs
  ARKK: "ARK Innovation ETF", DIA: "SPDR Dow Jones ETF",
  IWM: "iShares Russell 2000 ETF", QQQ: "Invesco QQQ Trust",
  SPY: "SPDR S&P 500 ETF",
};

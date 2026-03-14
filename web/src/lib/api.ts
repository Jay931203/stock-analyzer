// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

export interface Signal {
  ticker: string;
  price: number;
  signal: string;
  direction: "bullish" | "bearish" | "neutral";
  win_rate_5d: number;
  win_rate_20d: number;
  avg_return_5d: number;
  avg_return_20d: number;
  strength: number;
  occurrences: number;
}

export interface MarketRegime {
  label: string;
  color: string;
  description: string;
}

export interface CalendarEvent {
  date: string;
  title: string;
  type: string;
}

export interface SignalFlip {
  ticker: string;
  from: string;
  to: string;
  date: string;
}

export interface SignalsResponse {
  signals: Signal[];
  market_regime: MarketRegime;
  calendar: CalendarEvent[];
  flips: SignalFlip[];
  generated_at: string;
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartIndicator {
  name: string;
  values: { time: string; value: number }[];
}

export interface ChartResponse {
  candles: ChartDataPoint[];
  indicators: ChartIndicator[];
  ticker: string;
  period: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface SubscriptionStatus {
  plan: "free" | "pro" | "api";
  active: boolean;
  expires_at: string | null;
  analyses_today: number;
  analyses_limit: number;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const API_BASE = "/api";

class StockAPI {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

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
    return this.fetch<Record<string, unknown>>(
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
  async getTimeMachine(ticker: string, date: string, period = "10y") {
    return this.fetch<Record<string, unknown>>(
      `/time-machine/${ticker}?date=${date}&period=${period}`,
    );
  }

  // Search
  async search(query: string) {
    return this.fetch<SearchResult[]>(
      `/search?q=${encodeURIComponent(query)}`,
    );
  }

  // Live prices
  async getLivePrices(tickers: string[]) {
    return this.fetch<Record<string, unknown>>(
      `/live-prices?tickers=${tickers.join(",")}`,
    );
  }

  // Billing
  async getSubscriptionStatus() {
    return this.fetch<SubscriptionStatus>("/billing/status");
  }

  async createCheckout(plan: string) {
    return this.fetch<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  }

  async getBillingPortal() {
    return this.fetch<{ url: string }>("/billing/portal");
  }
}

export const api = new StockAPI();

import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalysisResponse, EarningsItem, ProbabilityData, SearchResult, SignalsResponse, SmartProbabilityResult, TrendingStock } from '../types/analysis';

// Simple in-memory cache for analysis results (avoids redundant server calls)
const _cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): any | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  _cache.set(key, { data, ts: Date.now() });
  // Evict old entries if cache grows too large
  if (_cache.size > 50) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < 10; i++) _cache.delete(oldest[i][0]);
  }
}

const STORAGE_KEY = 'stock_analyzer_server_url';

// Smart default: deployed web uses same origin, local dev uses localhost:8000
function getDefaultUrl(): string {
  if (Platform.OS === 'web') {
    // On deployed Vercel/web: API is on same domain (e.g. https://myapp.vercel.app)
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return window.location.origin;
    }
    return 'http://localhost:8000';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000'; // iOS simulator
}

let BASE_URL = getDefaultUrl();
let initialized = false;

export async function initServerUrl() {
  if (initialized) return;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) BASE_URL = saved;
  } catch {}
  initialized = true;
}

export function setBaseUrl(url: string) {
  BASE_URL = url;
  AsyncStorage.setItem(STORAGE_KEY, url).catch(() => {});
}

export function getBaseUrl() {
  return BASE_URL;
}

const api = {
  async analyze(ticker: string, period = '10y'): Promise<AnalysisResponse> {
    const cacheKey = `analyze:${ticker}:${period}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await axios.get(`${BASE_URL}/api/analyze/${ticker}`, {
      params: { period },
      timeout: 30000,
    });
    setCache(cacheKey, res.data);
    return res.data;
  },

  async search(query: string): Promise<SearchResult[]> {
    const res = await axios.get(`${BASE_URL}/api/search/${query}`, {
      timeout: 10000,
    });
    return res.data.results;
  },

  async getPresets(): Promise<any[]> {
    const res = await axios.get(`${BASE_URL}/api/presets`, { timeout: 10000 });
    return res.data;
  },

  async runPreset(presetId: string, ticker: string): Promise<{ preset: string; description: string; probability: ProbabilityData }> {
    const res = await axios.get(`${BASE_URL}/api/presets/${presetId}/${ticker}`, {
      timeout: 30000,
    });
    return res.data;
  },

  async getConditions(): Promise<Record<string, { label: string; states: string[] }>> {
    const res = await axios.get(`${BASE_URL}/api/conditions`, { timeout: 10000 });
    return res.data;
  },

  async customProbability(ticker: string, conditions: { indicator: string; state: string }[]): Promise<ProbabilityData> {
    const res = await axios.post(
      `${BASE_URL}/api/probability/${ticker}/custom`,
      { conditions },
      { timeout: 30000 },
    );
    return res.data;
  },

  async trending(sort = 'change_pct', limit = 10, sector = 'All', order = 'desc'): Promise<{ stocks: TrendingStock[]; updated: string }> {
    const res = await axios.get(`${BASE_URL}/api/trending`, {
      params: { sort, limit, sector, order },
      timeout: 30000,
    });
    return res.data;
  },

  async sectors(): Promise<{ sectors: string[] }> {
    const res = await axios.get(`${BASE_URL}/api/sectors`, { timeout: 10000 });
    return res.data;
  },

  async signals(limit = 20): Promise<SignalsResponse> {
    const res = await axios.get(`${BASE_URL}/api/signals`, {
      params: { limit },
      timeout: 120000,
    });
    return res.data;
  },

  async livePrices(tickers: string[]): Promise<{ prices: Record<string, { price: number; change: number; change_pct: number; market_state: string }>; market_state: string }> {
    const res = await axios.get(`${BASE_URL}/api/live-prices`, {
      params: { tickers: tickers.join(',') },
      timeout: 10000,
    });
    return res.data;
  },

  async similar(ticker: string): Promise<{ ticker: string; sector: string; similar: string[] }> {
    const res = await axios.get(`${BASE_URL}/api/similar/${ticker}`, { timeout: 10000 });
    return res.data;
  },

  async smartProbability(ticker: string, selectedIndicators: string[]): Promise<SmartProbabilityResult> {
    const cacheKey = `smart:${ticker}:${[...selectedIndicators].sort().join(',')}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await axios.post(
      `${BASE_URL}/api/smart-probability/${ticker}`,
      { selected_indicators: selectedIndicators },
      { timeout: 60000 },
    );
    setCache(cacheKey, res.data);
    return res.data;
  },

  async earningsCalendar(): Promise<{ earnings: EarningsItem[]; updated: string }> {
    const cacheKey = 'earnings-calendar';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await axios.get(`${BASE_URL}/api/earnings-calendar`, {
      timeout: 15000,
    });
    setCache(cacheKey, res.data);
    return res.data;
  },

  async recentSearches(limit = 15): Promise<string[]> {
    const res = await axios.get(`${BASE_URL}/api/recent-searches`, {
      params: { limit },
      timeout: 5000,
    });
    return res.data.tickers;
  },

  async health(): Promise<boolean> {
    try {
      const res = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      return res.data.status === 'ok';
    } catch {
      return false;
    }
  },
};

export function clearAnalysisCache(ticker?: string) {
  if (ticker) {
    for (const key of _cache.keys()) {
      if (key.includes(ticker)) _cache.delete(key);
    }
  } else {
    _cache.clear();
  }
}

export default api;

import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalysisResponse, ProbabilityData, SearchResult, SmartProbabilityResult, TrendingStock } from '../types/analysis';

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
    const res = await axios.get(`${BASE_URL}/api/analyze/${ticker}`, {
      params: { period },
      timeout: 30000,
    });
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

  async similar(ticker: string): Promise<{ ticker: string; sector: string; similar: string[] }> {
    const res = await axios.get(`${BASE_URL}/api/similar/${ticker}`, { timeout: 10000 });
    return res.data;
  },

  async smartProbability(ticker: string, selectedIndicators: string[]): Promise<SmartProbabilityResult> {
    const res = await axios.post(
      `${BASE_URL}/api/smart-probability/${ticker}`,
      { selected_indicators: selectedIndicators },
      { timeout: 60000 },
    );
    return res.data;
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

export default api;

/**
 * Watchlist store with AsyncStorage persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'stock_analyzer_watchlist';
const DEFAULTS = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'];

let watchlist: string[] = DEFAULTS;
let loaded = false;
let listeners: Array<() => void> = [];

async function load() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) watchlist = JSON.parse(raw);
  } catch {}
  loaded = true;
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  } catch {}
}

export async function initWatchlist() {
  await load();
  notify();
}

export function getWatchlist(): string[] {
  return [...watchlist];
}

export function addToWatchlist(ticker: string) {
  const t = ticker.toUpperCase();
  if (!watchlist.includes(t)) {
    watchlist = [t, ...watchlist];
    notify();
    persist();
  }
}

export function removeFromWatchlist(ticker: string) {
  const t = ticker.toUpperCase();
  watchlist = watchlist.filter(w => w !== t);
  notify();
  persist();
}

export function isInWatchlist(ticker: string): boolean {
  return watchlist.includes(ticker.toUpperCase());
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notify() {
  listeners.forEach(l => l());
}

-- Signal Cache table for Stock Scanner
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS signal_cache (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  change_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  sector TEXT DEFAULT '',
  win_rate_5d DOUBLE PRECISION NOT NULL DEFAULT 50,
  win_rate_20d DOUBLE PRECISION NOT NULL DEFAULT 50,
  win_rate_60d DOUBLE PRECISION NOT NULL DEFAULT 50,
  avg_return_20d DOUBLE PRECISION DEFAULT 0,
  occurrences INTEGER NOT NULL DEFAULT 0,
  condition TEXT DEFAULT '',
  indicators_used INTEGER DEFAULT 0,
  strength DOUBLE PRECISION NOT NULL DEFAULT 0,
  tier TEXT DEFAULT 'normal',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for simplicity (public cache data)
ALTER TABLE signal_cache DISABLE ROW LEVEL SECURITY;

-- Index for fast reads
CREATE INDEX IF NOT EXISTS idx_signal_cache_strength ON signal_cache(strength DESC);
CREATE INDEX IF NOT EXISTS idx_signal_cache_ticker ON signal_cache(ticker);

-- Analysis Cache table for individual ticker analysis results
-- Stores the full JSON response to avoid recomputing indicators on every page load

CREATE TABLE IF NOT EXISTS analysis_cache (
  ticker TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for simplicity (public cache data)
ALTER TABLE analysis_cache DISABLE ROW LEVEL SECURITY;

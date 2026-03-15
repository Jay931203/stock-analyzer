-- Add missing columns to signal_cache for full win_rate/avg_return persistence
-- across all periods (5d, 20d, 60d, 120d, 252d) plus volume data.
--
-- Run in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor → paste & run

ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS win_rate_120d FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS win_rate_252d FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS avg_return_5d FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS avg_return_60d FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS avg_return_120d FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS avg_return_252d FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS volume_ratio FLOAT;
ALTER TABLE signal_cache ADD COLUMN IF NOT EXISTS volume_level TEXT;

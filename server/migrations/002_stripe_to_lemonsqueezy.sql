-- 002_stripe_to_lemonsqueezy.sql
-- Migrate billing columns from Stripe to Lemon Squeezy.
-- Run against Supabase SQL Editor or via CLI: supabase db push

-- ─── Rename columns ──────────────────────────────────────────────────────────
ALTER TABLE subscriptions RENAME COLUMN stripe_customer_id TO ls_customer_id;
ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO ls_subscription_id;

-- ─── Drop old indexes and create new ones ─────────────────────────────────────
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer;
DROP INDEX IF EXISTS idx_subscriptions_stripe_sub;

CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_customer ON subscriptions(ls_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_sub ON subscriptions(ls_subscription_id);

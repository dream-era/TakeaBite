-- ============================================================
-- MIGRATION 012: Subscription & Billing System
-- Introduces 14-day trial logic, new subscription plans, 
-- and subscription status tracking.
-- ============================================================

-- Create new ENUM types
CREATE TYPE subscription_plan AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');

-- Alter restaurants table
ALTER TABLE restaurants
  ADD COLUMN current_plan subscription_plan NOT NULL DEFAULT 'starter',
  ADD COLUMN sub_status subscription_status NOT NULL DEFAULT 'trial',
  ADD COLUMN trial_start_date TIMESTAMPTZ,
  ADD COLUMN trial_end_date TIMESTAMPTZ,
  ADD COLUMN billing_start_date TIMESTAMPTZ,
  ADD COLUMN billing_end_date TIMESTAMPTZ;

-- Migrate existing data
-- Map old plans to new plans
UPDATE restaurants 
SET 
  current_plan = CASE 
    WHEN plan = 'enterprise' THEN 'pro'::subscription_plan
    WHEN plan = 'pro' THEN 'growth'::subscription_plan
    ELSE 'starter'::subscription_plan
  END,
  -- All existing users get an active status to not lock them out
  sub_status = 'active'::subscription_status;

-- Note: We do NOT drop the old `plan` column immediately to ensure 
-- no zero-downtime breaking changes during deployment, but new code 
-- will only rely on `current_plan` and `sub_status`.

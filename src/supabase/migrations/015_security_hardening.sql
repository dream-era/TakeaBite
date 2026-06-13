-- 1. Webhook idempotency table
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Security audit log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  restaurant_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_restaurant
  ON security_audit_log (restaurant_id, created_at DESC);

-- 3. Staff session columns
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_fingerprint TEXT;

-- 4. Verify anon cannot access sensitive tables
-- DROP POLICY IF EXISTS orders_anon_select ON orders;
-- DROP POLICY IF EXISTS staff_anon_select ON staff;

-- 5. Auto-cleanup old webhook events (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. Add policy: anon can only read active restaurants
DROP POLICY IF EXISTS restaurants_public_select ON restaurants;
CREATE POLICY restaurants_public_select ON restaurants
  FOR SELECT TO anon
  USING (
    is_active = TRUE
    AND status = 'active'
    AND onboarding_complete = TRUE
  );

-- 7. Add policy: anon can only read available menu items
DROP POLICY IF EXISTS menu_items_public_select ON menu_items;
CREATE POLICY menu_items_public_select ON menu_items
  FOR SELECT TO anon
  USING (is_available = TRUE);

-- 8. Add policy: anon can only read active tables
DROP POLICY IF EXISTS tables_public_select ON tables;
CREATE POLICY tables_public_select ON tables
  FOR SELECT TO anon
  USING (is_active = TRUE);

-- 9. Create a secure view that hides the secret (optional but recommended)
CREATE OR REPLACE VIEW restaurants_public AS
SELECT
  id, owner_id, name, slug, type,
  logo_url, address, city, phone,
  description, working_hours,
  is_active, status, plan,
  payment_enabled,
  razorpay_key_id,
  commission_percent,
  onboarding_complete,
  created_at, updated_at
FROM restaurants;

GRANT SELECT ON restaurants_public TO anon;

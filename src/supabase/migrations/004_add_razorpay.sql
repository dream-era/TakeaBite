ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_account_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_connected_at TIMESTAMPTZ;

-- ============================================================
-- MIGRATION 013: Comprehensive Database Repair
-- Safely repairs and enforces all enums, tables, columns, indexes,
-- triggers, policies, and realtime publications.
-- ============================================================

-- 1. Idempotent ENUM Creation
DO $$ BEGIN
    CREATE TYPE restaurant_plan AS ENUM ('basic', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE restaurant_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('online', 'cash');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('pending', 'preparing', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE station_type AS ENUM ('food', 'juice', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE staff_role AS ENUM ('owner', 'chef', 'juice', 'server');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE table_status AS ENUM ('available', 'occupied', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE business_type AS ENUM ('individual', 'proprietorship', 'partnership', 'private_limited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('starter', 'growth', 'pro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Functions
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Tables
CREATE TABLE IF NOT EXISTS restaurants (
  -- Identity
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info (set in onboarding Step 1)
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,  -- URL-safe name e.g. "sree-juice-tiruppur"
  type                  TEXT NOT NULL,         -- 'juice_shop' | 'restaurant' | 'cafe' etc.
  logo_url              TEXT,
  address               TEXT,
  city                  TEXT,
  phone                 TEXT,
  description           TEXT,
  working_hours         JSONB,                 -- { open: '09:00', close: '22:00', days: [...] }

  -- Status flags
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  status                restaurant_status NOT NULL DEFAULT 'active',
  universal_qr_url      TEXT,                  -- MODE 1: Universal Shop QR
  
  -- Business details (set in onboarding Step 3)
  business_type         business_type,
  gst_number            TEXT,
  fssai_number          TEXT,
  pan_number            TEXT,
  bank_account_number   TEXT,
  bank_ifsc             TEXT,
  bank_holder_name      TEXT,

  -- Payment config (set in onboarding Step 4)
  -- razorpay_account_id is the linked account ID from Razorpay Route
  -- Used by create-order/route.ts to split payments
  razorpay_account_id   TEXT,
  payment_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  commission_percent    NUMERIC(5,2) NOT NULL DEFAULT 3.00,

  -- Plan + onboarding
  plan                  restaurant_plan NOT NULL DEFAULT 'basic',
  onboarding_complete   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  -- Identity
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Item details
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,       -- 'food' | 'juice' | 'snacks' | custom
  price           NUMERIC(10,2) NOT NULL CHECK (price > 0),
  image_url       TEXT,
  is_veg          BOOLEAN NOT NULL DEFAULT TRUE,
  description     TEXT,

  -- Kitchen routing — which station prepares this item
  -- Matches Station type: 'food' | 'juice' | 'both'
  -- Used by create-order to set order_items.station
  -- Used by kitchen dashboards to filter visible orders
  station         station_type NOT NULL DEFAULT 'food',

  -- Availability toggle — owner can disable items temporarily
  -- create-order/route.ts rejects orders containing unavailable items
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,

  -- Display ordering within category (drag-to-reorder in menu manager)
  display_order   INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  -- Identity
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Table info
  table_number    INTEGER NOT NULL,
  table_name      TEXT,               -- Optional friendly name e.g. "Window Seat"

  -- Current occupancy status
  -- available: no active orders
  -- occupied: has confirmed/preparing/ready orders
  -- inactive: removed from service (not shown on floor map)
  status          table_status NOT NULL DEFAULT 'available',

  -- QR code image URL in Supabase Storage
  -- Path: qr-codes/{restaurant_id}/{table_id}.png
  -- Set by generate-qr/route.ts after upload
  qr_code_url     TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each table number must be unique per restaurant
  UNIQUE(restaurant_id, table_number)
);

CREATE TABLE IF NOT EXISTS staff (
  -- Identity
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- user_id is NULL for PIN-only staff (most kitchen workers)
  -- Only set if owner creates a Supabase Auth account for them
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Staff info
  name            TEXT NOT NULL,

  -- Role determines which kitchen dashboard they see
  -- 'chef'   → /kitchen/chef   (food station)
  -- 'juice'  → /kitchen/juice  (beverage station)
  -- 'server' → /kitchen/server (all orders, serve tracking)
  -- 'owner'  → /dashboard      (should not use PIN login)
  role            staff_role NOT NULL,

  -- bcrypt hash of the 4-digit PIN
  -- Plain PIN is NEVER stored — only the hash
  -- verify-pin/route.ts compares submitted PIN with bcrypt.compare()
  pin_hash        TEXT NOT NULL,

  phone           TEXT,
  email           TEXT,

  -- If FALSE: verify-pin rejects this staff member even if PIN is correct
  -- Owners can deactivate staff without deleting their record
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Updated by verify-pin/route.ts (non-blocking fire-and-forget)
  last_login      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  -- Identity
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id           UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id                UUID REFERENCES tables(id) ON DELETE RESTRICT,

  -- Order lifecycle status
  -- pending   → created, online payment not yet confirmed
  -- confirmed → payment confirmed (or cash order placed)
  --             KITCHEN SEES ORDER FROM THIS STATE
  -- preparing → at least one item being prepared
  -- ready     → all items done, waiting for server
  -- served    → server delivered to table
  -- cancelled → payment failed or manually cancelled
  status                  order_status NOT NULL DEFAULT 'pending',

  -- Financials
  total_amount            NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  payment_method          payment_method NOT NULL,
  payment_status          payment_status NOT NULL DEFAULT 'pending',

  -- Razorpay identifiers
  -- razorpay_order_id: set by create-order/route.ts when creating payment
  -- razorpay_payment_id: set by razorpay-webhook/route.ts on capture
  -- Both NULL for cash orders
  razorpay_order_id       TEXT UNIQUE,   -- UNIQUE prevents duplicate webhook processing
  razorpay_payment_id     TEXT,

  -- Optional customer note (max 300 chars enforced by create-order Zod schema)
  special_instructions    TEXT,

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  -- Identity
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,

  -- Quantity and price locked at order time
  -- Price is copied from menu_items at order creation
  -- so a later price change doesn't affect existing orders
  quantity        INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 20),
  price           NUMERIC(10,2) NOT NULL CHECK (price > 0),

  -- Station routing — copied from menu_items.station at order time
  -- Chef dashboard:  WHERE station IN ('food', 'both')
  -- Juice dashboard: WHERE station IN ('juice', 'both')
  -- Server dashboard: shows all items regardless of station
  station         station_type NOT NULL,

  -- Item-level kitchen progress
  -- pending   → waiting for chef to start
  -- preparing → chef has started
  -- done      → ready on the pass for server to collect
  -- Transitions managed by update-order-status/route.ts
  status          item_status NOT NULL DEFAULT 'pending',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- Note: no updated_at here — status changes are the only
  -- mutation and the created_at gives enough audit trail
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

-- 4. Alter Tables (Subscription Columns)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS current_plan subscription_plan NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS sub_status subscription_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_station ON menu_items(restaurant_id, station);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(restaurant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_restaurant_id ON staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(restaurant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_station ON order_items(order_id, station);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(order_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_daily_number ON orders(restaurant_id, DATE(created_at AT TIME ZONE 'Asia/Kolkata'));

-- 6. Triggers
DROP TRIGGER IF EXISTS set_restaurants_updated_at ON restaurants;
CREATE TRIGGER set_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_menu_items_updated_at ON menu_items;
CREATE TRIGGER set_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER set_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 7. RLS Policies
DROP POLICY IF EXISTS restaurants_owner_select ON restaurants;
CREATE POLICY restaurants_owner_select ON restaurants
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS restaurants_owner_insert ON restaurants;
CREATE POLICY restaurants_owner_insert ON restaurants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS restaurants_owner_update ON restaurants;
CREATE POLICY restaurants_owner_update ON restaurants
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS restaurants_public_select ON restaurants;
CREATE POLICY restaurants_public_select ON restaurants
  FOR SELECT TO anon
  USING (is_active = TRUE AND status = 'active');

DROP POLICY IF EXISTS menu_items_owner_all ON menu_items;
CREATE POLICY menu_items_owner_all ON menu_items
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS menu_items_public_select ON menu_items;
CREATE POLICY menu_items_public_select ON menu_items
  FOR SELECT TO anon
  USING (is_available = TRUE);

DROP POLICY IF EXISTS tables_owner_all ON tables;
CREATE POLICY tables_owner_all ON tables
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tables_public_select ON tables;
CREATE POLICY tables_public_select ON tables
  FOR SELECT TO anon
  USING (is_active = TRUE);

DROP POLICY IF EXISTS staff_owner_all ON staff;
CREATE POLICY staff_owner_all ON staff
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS orders_owner_select ON orders;
CREATE POLICY orders_owner_select ON orders
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS orders_owner_update ON orders;
CREATE POLICY orders_owner_update ON orders
  FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS order_items_owner_select ON order_items;
CREATE POLICY order_items_owner_select ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS qr_codes_owner_upload ON storage.objects;
CREATE POLICY qr_codes_owner_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS qr_codes_public_read ON storage.objects;
CREATE POLICY qr_codes_public_read ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS qr_codes_owner_delete ON storage.objects;
CREATE POLICY qr_codes_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- 8. Realtime Publications
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE orders; 
    END IF; 
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items; 
    END IF; 
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'tables'
    ) THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE tables; 
    END IF; 
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'menu_items'
    ) THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE menu_items; 
    END IF; 
END $$;

-- 9. Storage Buckets (Safe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-codes',
  'qr-codes',
  TRUE,
  1048576,
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 10. Data Migrations
UPDATE restaurants 
SET 
  current_plan = CASE 
    WHEN plan = 'enterprise' THEN 'pro'::subscription_plan
    WHEN plan = 'pro' THEN 'growth'::subscription_plan
    ELSE 'starter'::subscription_plan
  END,
  sub_status = 'active'::subscription_status
WHERE current_plan = 'starter' AND sub_status = 'trial';


-- ============================================================
-- MENUQR — COMPLETE DATABASE SCHEMA
-- File: src/supabase/migrations/001_initial.sql
--
-- HOW TO USE:
--   Paste this entire file into the Supabase SQL Editor
--   (Dashboard → SQL Editor → New query → Run).
--   Run it once on a fresh project. Every table, enum,
--   index, RLS policy, trigger, and storage bucket
--   the application needs is created here.
--
-- WHAT THIS FILE CREATES:
--   1.  Custom ENUM types (matching types/database.ts exactly)
--   2.  Core tables (6): restaurants, menu_items, tables,
--       staff, orders, order_items
--   3.  updated_at auto-trigger (runs on every UPDATE)
--   4.  Performance indexes (on every FK + filter column)
--   5.  Row Level Security (RLS) policies per table
--       — owners see only their restaurant's data
--       — staff see only their restaurant's orders
--       — customers can read menus without auth
--       — service role bypasses all (for API routes)
--   6.  Supabase Storage bucket for QR code images
--
-- ENUM TYPES match types/database.ts exactly:
--   restaurant_plan    → RestaurantPlan
--   restaurant_status  → RestaurantStatus
--   order_status       → OrderStatus
--   payment_status     → PaymentStatus
--   payment_method     → PaymentMethod
--   item_status        → ItemStatus
--   station_type       → Station
--   staff_role         → StaffRole
--   table_status       → TableStatus
--   business_type      → BusinessType
--
-- TABLES reference each other in this dependency order:
--   auth.users (Supabase built-in)
--     └── restaurants (owner_id → auth.users.id)
--           ├── menu_items (restaurant_id → restaurants.id)
--           ├── tables (restaurant_id → restaurants.id)
--           ├── staff (restaurant_id → restaurants.id)
--           └── orders (restaurant_id → restaurants.id)
--                 ├── (table_id → tables.id)
--                 └── order_items (order_id → orders.id)
--                       └── (menu_item_id → menu_items.id)
-- ============================================================


-- ============================================================
-- SECTION 1 — ENUM TYPES
-- These MUST match the TypeScript union types in
-- src/types/database.ts exactly. Any mismatch between
-- SQL enums and TS types causes runtime insert failures.
-- ============================================================

-- Drop existing enums if re-running (safe for fresh setup)
DROP TYPE IF EXISTS restaurant_plan    CASCADE;
DROP TYPE IF EXISTS restaurant_status  CASCADE;
DROP TYPE IF EXISTS order_status       CASCADE;
DROP TYPE IF EXISTS payment_status     CASCADE;
DROP TYPE IF EXISTS payment_method     CASCADE;
DROP TYPE IF EXISTS item_status        CASCADE;
DROP TYPE IF EXISTS station_type       CASCADE;
DROP TYPE IF EXISTS staff_role         CASCADE;
DROP TYPE IF EXISTS table_status       CASCADE;
DROP TYPE IF EXISTS business_type      CASCADE;

-- Matches: RestaurantPlan = 'basic' | 'pro' | 'enterprise'
CREATE TYPE restaurant_plan AS ENUM (
  'basic',
  'pro',
  'enterprise'
);

-- Matches: RestaurantStatus = 'active' | 'inactive' | 'suspended'
CREATE TYPE restaurant_status AS ENUM (
  'active',
  'inactive',
  'suspended'
);

-- Matches: OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'
-- Flow: pending → confirmed → preparing → ready → served
--       pending → cancelled (payment failed)
-- See: create-order/route.ts, razorpay-webhook/route.ts,
--      update-order-status/route.ts
CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled'
);

-- Matches: PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
-- Set by: create-order (pending), razorpay-webhook (paid/failed)
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

-- Matches: PaymentMethod = 'online' | 'cash'
-- Set by: create-order/route.ts based on customer choice
CREATE TYPE payment_method AS ENUM (
  'online',
  'cash'
);

-- Matches: ItemStatus = 'pending' | 'preparing' | 'done'
-- Flow: pending → preparing → done
-- Set by: update-order-status/route.ts (start_item, complete_item)
CREATE TYPE item_status AS ENUM (
  'pending',
  'preparing',
  'done'
);

-- Matches: Station = 'food' | 'juice' | 'both'
-- Used by: menu_items (which station handles this item)
--          order_items (inherited from menu_item at order time)
--          Kitchen dashboards filter orders by station
CREATE TYPE station_type AS ENUM (
  'food',
  'juice',
  'both'
);

-- Matches: StaffRole = 'owner' | 'chef' | 'juice' | 'server'
-- Used by: verify-pin/route.ts to redirect to correct dashboard
--          update-order-status/route.ts for permission checks
CREATE TYPE staff_role AS ENUM (
  'owner',
  'chef',
  'juice',
  'server'
);

-- Matches: TableStatus = 'available' | 'occupied' | 'inactive'
-- Set by: create-order (occupied), update-order-status serve_order (available)
--         generate-qr does NOT change status
CREATE TYPE table_status AS ENUM (
  'available',
  'occupied',
  'inactive'
);

-- Matches: BusinessType = 'individual' | 'proprietorship' | 'partnership' | 'private_limited'
-- Set during onboarding Step 3 (business setup)
-- Used by: Razorpay linked account creation
CREATE TYPE business_type AS ENUM (
  'individual',
  'proprietorship',
  'partnership',
  'private_limited'
);


-- ============================================================
-- SECTION 2 — HELPER FUNCTION: updated_at trigger
-- Automatically sets updated_at = NOW() on every UPDATE.
-- Applied to: restaurants, menu_items, orders
-- Means API routes never need to manually set updated_at.
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SECTION 3 — TABLE: restaurants
-- One row per registered restaurant/shop.
-- Every other table references this via restaurant_id.
-- Owner is linked to auth.users via owner_id.
-- ============================================================

DROP TABLE IF EXISTS restaurants CASCADE;

CREATE TABLE restaurants (
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

-- Trigger: auto-update updated_at on every change
CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes
-- owner_id: used by getRestaurantByOwnerId() in supabase.ts
--           and by middleware.ts onboarding check
CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);

-- slug: used by getRestaurantBySlug() — called on EVERY customer page load
--       This is the most queried index in the whole system
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- status: used by create-order/route.ts to block suspended restaurants
CREATE INDEX idx_restaurants_status ON restaurants(status);


-- ============================================================
-- SECTION 4 — TABLE: menu_items
-- All food/drink items for a restaurant.
-- Queried by: customer ordering page (public read),
--             owner menu manager, create-order validation.
-- ============================================================

DROP TABLE IF EXISTS menu_items CASCADE;

CREATE TABLE menu_items (
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

CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes
-- restaurant_id + is_available: the exact filter used in
-- getMenuByRestaurantId() — every customer page load hits this
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, is_available);

-- station: kitchen dashboards filter by station constantly
CREATE INDEX idx_menu_items_station ON menu_items(restaurant_id, station);

-- display_order: ORDER BY display_order on every menu fetch
CREATE INDEX idx_menu_items_display_order ON menu_items(restaurant_id, display_order);


-- ============================================================
-- SECTION 5 — TABLE: tables
-- Physical tables in the restaurant. Each gets a QR code.
-- generate-qr/route.ts writes qr_code_url here.
-- update-order-status/route.ts updates status here.
-- ============================================================

DROP TABLE IF EXISTS tables CASCADE;

CREATE TABLE tables (
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

-- Indexes
-- restaurant_id: getTablesByRestaurantId() and verifyTableOwnership()
CREATE INDEX idx_tables_restaurant_id ON tables(restaurant_id);

-- status: owner dashboard "active tables" metric filters by status
CREATE INDEX idx_tables_status ON tables(restaurant_id, status);


-- ============================================================
-- SECTION 6 — TABLE: staff
-- Kitchen staff accounts. Authentication via PIN (not email).
-- verify-pin/route.ts reads pin_hash from here.
-- update-order-status/route.ts reads is_active for session check.
-- ============================================================

DROP TABLE IF EXISTS staff CASCADE;

CREATE TABLE staff (
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

-- Indexes
-- restaurant_id + is_active: verify-pin fetches all active staff
-- for a restaurant to compare PINs
CREATE INDEX idx_staff_restaurant_id ON staff(restaurant_id);
CREATE INDEX idx_staff_active ON staff(restaurant_id, is_active);


-- ============================================================
-- SECTION 7 — TABLE: orders
-- One row per customer order session.
-- Created by: create-order/route.ts
-- Updated by: razorpay-webhook/route.ts (payment status)
--             update-order-status/route.ts (kitchen progress)
-- ============================================================

DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
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

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes
-- restaurant_id + status: getActiveOrdersByRestaurantId() excludes
-- 'served' and 'cancelled' — this composite index covers that filter
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);

-- table_id: update-order-status checks remaining orders per table
-- before freeing it (serve_order handler)
CREATE INDEX idx_orders_table_id ON orders(table_id);

-- razorpay_order_id: razorpay-webhook looks up order by this field
-- on EVERY payment event — must be fast
CREATE INDEX idx_orders_razorpay_order_id ON orders(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- created_at: owner dashboard order history sorted by time
CREATE INDEX idx_orders_created_at ON orders(restaurant_id, created_at DESC);

-- payment_status: owner dashboard filters pending cash collections
CREATE INDEX idx_orders_payment_status ON orders(restaurant_id, payment_status);


-- ============================================================
-- SECTION 8 — TABLE: order_items
-- One row per menu item in an order.
-- Status is updated independently per item by kitchen staff.
-- station determines which kitchen dashboard shows it.
-- ============================================================

DROP TABLE IF EXISTS order_items CASCADE;

CREATE TABLE order_items (
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

-- Indexes
-- order_id: recalculateOrderStatus() fetches all items by order_id
-- on every start_item and complete_item action — most frequent query
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- order_id + station: kitchen dashboards join order_items filtered
-- by station to show only their relevant items
CREATE INDEX idx_order_items_station ON order_items(order_id, station);

-- status: recalculateOrderStatus checks item statuses frequently
CREATE INDEX idx_order_items_status ON order_items(order_id, status);


-- ============================================================
-- SECTION 9 — ROW LEVEL SECURITY (RLS)
--
-- RLS is the database-level security layer.
-- Even if application code has a bug, RLS prevents data leaks.
-- The admin/service role (createAdminSupabase) bypasses ALL RLS.
-- The anon role (customer ordering page) gets read-only public access.
-- Authenticated users (owners) can only see their own restaurant.
--
-- Policy naming convention:
--   {table}_{role}_{operation}
--   e.g. "restaurants_owner_select"
-- ============================================================

-- Enable RLS on every table
ALTER TABLE restaurants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;


-- ── RESTAURANTS ────────────────────────────────────────────

-- Owners can read their own restaurant only
CREATE POLICY restaurants_owner_select ON restaurants
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- Owners can create their own restaurant (one per owner)
CREATE POLICY restaurants_owner_insert ON restaurants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own restaurant only
CREATE POLICY restaurants_owner_update ON restaurants
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public can read active restaurants by slug
-- Needed by: getRestaurantBySlug() — called on every customer page load
-- Only exposes: name, slug, logo, description (customer-safe fields)
CREATE POLICY restaurants_public_select ON restaurants
  FOR SELECT TO anon
  USING (is_active = TRUE AND status = 'active');


-- ── MENU ITEMS ─────────────────────────────────────────────

-- Owners can do everything with their restaurant's menu items
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

-- Public (customers) can read available menu items
-- Needed by: customer ordering page — completely public, no login
CREATE POLICY menu_items_public_select ON menu_items
  FOR SELECT TO anon
  USING (is_available = TRUE);


-- ── TABLES ─────────────────────────────────────────────────

-- Owners can do everything with their restaurant's tables
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

-- Public can read active tables (needed for QR page to verify table exists)
CREATE POLICY tables_public_select ON tables
  FOR SELECT TO anon
  USING (is_active = TRUE);


-- ── STAFF ──────────────────────────────────────────────────

-- Owners can manage staff for their restaurant
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

-- Note: NO public policy on staff table
-- Staff login is handled server-side via admin client (bypasses RLS)
-- in verify-pin/route.ts — pin_hash is never exposed to the browser


-- ── ORDERS ─────────────────────────────────────────────────

-- Owners can read all orders for their restaurant
CREATE POLICY orders_owner_select ON orders
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Owners can update orders (e.g. manually cancel)
CREATE POLICY orders_owner_update ON orders
  FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Note: INSERT and kitchen updates use admin client (bypasses RLS)
-- create-order/route.ts and update-order-status/route.ts both
-- use createAdminSupabase() for writes


-- ── ORDER ITEMS ────────────────────────────────────────────

-- Owners can read all order items for their restaurant's orders
CREATE POLICY order_items_owner_select ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

-- Note: All order_items writes go through admin client
-- (create-order inserts, update-order-status updates)


-- ============================================================
-- SECTION 10 — SUPABASE REALTIME
--
-- Enable Realtime publication for tables that kitchen
-- dashboards subscribe to. This is what makes orders
-- appear instantly on the kitchen display without polling.
--
-- orders table:
--   INSERT → new order confirmed (from webhook or cash)
--           → chef/juice/server dashboards receive it
--   UPDATE → status change (preparing/ready/served)
--           → server dashboard updates live
--
-- order_items table:
--   UPDATE → item status change (preparing/done)
--           → kitchen display updates card state live
--
-- tables table:
--   UPDATE → occupied/available status
--           → owner dashboard table map updates live
-- ============================================================

-- Add tables to the Supabase Realtime publication
-- 'supabase_realtime' is the default publication name
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;

-- Note: restaurants, menu_items, staff do NOT need Realtime
-- They change infrequently (owner config) and don't need
-- live push to any dashboard.


-- ============================================================
-- SECTION 11 — SUPABASE STORAGE BUCKET
--
-- 'qr-codes' bucket stores QR code PNG images.
-- generate-qr/route.ts uploads here.
-- tables.qr_code_url stores the public URL.
-- ============================================================

-- Create public bucket for QR codes
-- Public = images accessible without auth (QR codes are intentionally public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-codes',
  'qr-codes',
  TRUE,                    -- Public bucket — no signed URLs needed
  1048576,                 -- 1MB max per file (QR PNGs are ~20KB)
  ARRAY['image/png']       -- Only PNG files allowed
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: owners can upload to their own folder
-- Path structure: qr-codes/{restaurant_id}/{table_id}.png
CREATE POLICY qr_codes_owner_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Public can read all QR code images (they are meant to be scanned)
CREATE POLICY qr_codes_public_read ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'qr-codes');

-- Owners can delete/replace their own QR codes (regeneration)
CREATE POLICY qr_codes_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM restaurants WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- SECTION 12 — USEFUL VIEWS (optional, for owner dashboard)
--
-- These views simplify complex queries in the owner dashboard.
-- They are not required by any API route (those use raw queries)
-- but help if you query Supabase directly from server components.
-- ============================================================

-- Daily order summary per restaurant
-- Used by owner dashboard metric cards (today's revenue, order count)
CREATE OR REPLACE VIEW daily_order_summary AS
SELECT
  restaurant_id,
  DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS order_date,
  COUNT(*)                                      AS total_orders,
  SUM(total_amount)                             AS total_revenue,
  AVG(total_amount)                             AS avg_order_value,
  COUNT(*) FILTER (WHERE payment_method = 'online') AS online_orders,
  COUNT(*) FILTER (WHERE payment_method = 'cash')   AS cash_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled_orders
FROM orders
WHERE status != 'cancelled' OR payment_status = 'paid'
GROUP BY restaurant_id, DATE(created_at AT TIME ZONE 'Asia/Kolkata');

-- Peak hours view — orders per hour per restaurant
-- Used by owner dashboard peak hours bar chart
CREATE OR REPLACE VIEW hourly_order_volume AS
SELECT
  restaurant_id,
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')::INTEGER AS hour,
  DATE(created_at AT TIME ZONE 'Asia/Kolkata')                       AS order_date,
  COUNT(*)                                                            AS order_count,
  SUM(total_amount)                                                   AS hour_revenue
FROM orders
WHERE status NOT IN ('pending', 'cancelled')
GROUP BY restaurant_id,
         EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata'),
         DATE(created_at AT TIME ZONE 'Asia/Kolkata');

-- Top selling items — count and revenue per item
-- Used by owner dashboard "Top items today" section
CREATE OR REPLACE VIEW top_menu_items AS
SELECT
  oi.menu_item_id,
  mi.restaurant_id,
  mi.name         AS item_name,
  mi.category,
  mi.station,
  COUNT(*)        AS times_ordered,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.price * oi.quantity) AS total_revenue
FROM order_items oi
JOIN menu_items mi ON mi.id = oi.menu_item_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY oi.menu_item_id, mi.restaurant_id, mi.name, mi.category, mi.station;


-- ============================================================
-- MIGRATION COMPLETE
-- All tables, indexes, RLS policies, triggers,
-- Realtime subscriptions, and storage bucket are ready.
--
-- NEXT STEPS:
--   1. Run this SQL in Supabase SQL Editor
--   2. Set NEXT_PUBLIC_SUPABASE_URL in .env.local
--   3. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
--   4. Set SUPABASE_SERVICE_ROLE_KEY in .env.local
--   5. Run: npx supabase gen types typescript > src/types/supabase.ts
--      (auto-generates types from this schema — keep in sync)
-- ============================================================

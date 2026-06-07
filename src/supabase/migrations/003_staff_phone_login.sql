-- ==========================================
-- Migration 003: Staff Phone + PIN Login
-- ==========================================

-- 1. Add new role types to staff_role ENUM (if they don't exist)
-- Note: Postgres doesn't allow dropping ENUM values easily, so we add new ones
-- and we'll deprecate 'chef', 'juice', 'server' in code if needed.
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'cook';
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'juice_maker';
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'cashier';

-- 2. Add new status column and invite_token to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'disabled'));
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS invite_token TEXT;

-- 3. Migrate existing is_active flag to status (optional, but good practice for consistency)
UPDATE public.staff SET status = 'active' WHERE is_active = true;
UPDATE public.staff SET status = 'disabled' WHERE is_active = false;

-- 4. Add unique constraint for phone number per workspace/restaurant
-- Wait, the requirement is Phone + PIN. Phone number should be unique per restaurant.
-- Ensure we don't fail if there are null phones.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_restaurant_phone ON public.staff(restaurant_id, phone) WHERE phone IS NOT NULL;

-- ============================================================
-- Migration: 022_cook_assignment.sql
-- Description: Add cook assignment columns to orders table
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- We don't add an index since this is mainly accessed dynamically via realtime tracking.

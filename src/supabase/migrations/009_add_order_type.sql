-- Migration: 009_add_order_type.sql
-- Description: Add order_type column to orders table

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway'));

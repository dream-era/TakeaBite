-- Create customer profiles table
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer_id to orders
ALTER TABLE public.orders
ADD COLUMN customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL;

-- Enable RLS on customer_profiles
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- No standard RLS policies needed because this table will be accessed exclusively
-- via server actions and API routes using the Admin client (createAdminSupabase).

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON public.customer_profiles(phone);

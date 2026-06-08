import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminSupabase() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("SUPABASE_URL:", SUPABASE_URL)
  console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!SUPABASE_SERVICE_ROLE_KEY)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase client not initialized: Missing environment variables')
  }

  const client = createClient<any>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  if (!client) {
    throw new Error('Supabase admin client failed to initialize')
  }

  return client
}

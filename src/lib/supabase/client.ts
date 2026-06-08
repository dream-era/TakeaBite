import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let _browserInstance: ReturnType<typeof createBrowserClient<any>> | null = null

export function createBrowserSupabase() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("SUPABASE_URL:", SUPABASE_URL)
  console.log("SUPABASE_ANON_KEY exists:", !!SUPABASE_ANON_KEY)

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase client not initialized: Missing environment variables')
  }

  if (_browserInstance) return _browserInstance
  _browserInstance = createBrowserClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY)

  if (!_browserInstance) {
    throw new Error('Supabase client failed to initialize')
  }

  return _browserInstance
}

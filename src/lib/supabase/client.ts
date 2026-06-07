import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL) console.warn('[MenuQR] Missing NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_ANON_KEY) console.warn('[MenuQR] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

let _browserInstance: ReturnType<typeof createBrowserClient<any>> | null = null

export function createBrowserSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null as any
  if (_browserInstance) return _browserInstance
  _browserInstance = createBrowserClient<any>(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  return _browserInstance
}

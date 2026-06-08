import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createServerSupabase() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("SUPABASE_URL:", SUPABASE_URL)
  console.log("SUPABASE_ANON_KEY exists:", !!SUPABASE_ANON_KEY)

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_URL.startsWith('http')) {
    throw new Error('Supabase server client not initialized: Missing or invalid environment variables')
  }

  const cookieStore = cookies()

  const client = createServerClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Ignore in Server Components
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Ignore in Server Components
        }
      },
    },
  })

  if (!client) {
    throw new Error('Supabase client failed to initialize')
  }

  return client
}

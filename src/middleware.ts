/**
 * ============================================================
 * MENUQR — ROUTE PROTECTION MIDDLEWARE
 * File: src/middleware.ts
 *
 * This is the SECOND most important backend file.
 * It runs on EVERY request before any page or API route loads.
 * Think of it as the security gate of the entire application.
 *
 * WHAT IT DOES:
 *  1. Refreshes the Supabase auth session on every request
 *     so tokens never expire mid-session for owners
 *  2. Protects /dashboard/* — redirects unauthenticated
 *     owners to /login before the page even renders
 *  3. Protects /onboarding/* — same auth requirement
 *  4. Redirects already-logged-in owners away from /login
 *     back to /dashboard (no need to see login again)
 *  5. Allows /order/* and /kitchen/* to pass through freely
 *     — customers need no auth, kitchen uses PIN (handled
 *     client-side in the kitchen layout component)
 *  6. Allows all /api/* routes to handle their own auth
 *     internally (each API route validates independently)
 *
 * WHY MIDDLEWARE AND NOT PAGE-LEVEL CHECKS:
 *  - Runs at the Vercel EDGE — before the server even
 *    processes the request. Zero page flash for unauth users.
 *  - One place to manage all auth redirects. If you add a
 *    new protected route, add it to the matcher below.
 *  - Refreshes the auth token automatically — owners stay
 *    logged in across long dashboard sessions without
 *    needing to manually refresh.
 *
 * ROUTE MAP:
 *  /dashboard/*   → owner only    → redirect to /login if no session
 *  /onboarding/*  → owner only    → redirect to /login if no session
 *  /login         → public        → redirect to /dashboard if session exists
 *  /order/*       → public        → no auth check, pass through
 *  /kitchen/*     → pass through  → PIN auth handled in layout
 *  /api/*         → pass through  → each route handles own auth
 * ============================================================
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const { pathname } = request.nextUrl

    // Safe environment variable validation (Task 5 & 6)
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Middleware] CRITICAL: Missing Supabase environment variables')
      // If environment variables are missing: redirect gracefully, never throw errors
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'missing_env')
        return NextResponse.redirect(loginUrl)
      }
      return NextResponse.next()
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...(options as object) })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...(options as object) })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...(options as object) })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...(options as object) })
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (pathname.startsWith('/dashboard')) {
      if (!user || authError) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    if (pathname.startsWith('/onboarding')) {
      if (!user || authError) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', '/onboarding')
        return NextResponse.redirect(loginUrl)
      }
    }

    if (pathname === '/login' && user && !authError) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard') && user) {
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('is_active')
        .eq('owner_id', user.id)
        .single()
        
      if (workspaceError && workspaceError.code !== 'PGRST116') {
        console.error('[Middleware] Workspace query error:', workspaceError)
      }

      if (!workspace && pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      if (workspace && !workspace.is_active) {
        return NextResponse.redirect(new URL('/suspended', request.url))
      }
    }

    return response
  } catch (error) {
    // Add logging: console.error() for every middleware failure (Task 7)
    console.error('[Middleware] Invocation Failed:', error)
    
    // Graceful redirect on critical failure (Task 6)
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return NextResponse.next()
  }
}

// ─────────────────────────────────────────────
// MATCHER CONFIG
//
// Tells Next.js which routes this middleware runs on.
// We EXCLUDE:
//   - _next/static  → static assets (JS, CSS, images)
//   - _next/image   → Next.js image optimization
//   - favicon.ico   → browser favicon request
//   - /order/*      → customer page is fully public,
//                     no auth overhead needed
//
// We INCLUDE everything else — all page routes and API
// routes go through this middleware so session refresh
// always happens.
// ─────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (png, jpg, svg, etc.)
     * - /order/* (customer pages — fully public, no auth needed)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|order/).*)',
  ],
}

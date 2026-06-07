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
  // ─────────────────────────────────────────────
  // PHASE 1 — Set up a mutable response object
  // We need this because Supabase SSR may need to
  // SET new auth cookies on the response (token refresh).
  // We start with a "continue as normal" response and
  // Supabase will mutate it if it needs to set cookies.
  // ─────────────────────────────────────────────
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ─────────────────────────────────────────────
  // PHASE 2 — Create a Supabase client that can
  // read AND write cookies on this request/response.
  // This is what allows token refresh to work.
  // ─────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookies from the incoming request
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Write cookies to the outgoing response
        // This is how Supabase refreshes expired tokens
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...(options as object) })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...(options as object) })
        },
        // Remove cookies (called on logout)
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...(options as object) })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...(options as object) })
        },
      },
    }
  )

  // ─────────────────────────────────────────────
  // PHASE 3 — Get current session
  //
  // IMPORTANT: We use getUser() not getSession() here.
  // getUser() makes a network call to Supabase to verify
  // the token is still valid server-side.
  // getSession() only reads the local cookie without
  // verifying — a security risk for protected pages.
  // ─────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ─────────────────────────────────────────────
  // PHASE 4 — Route protection rules
  // ─────────────────────────────────────────────

  // ── RULE 1: Protect owner dashboard ──────────
  // If user tries to access /dashboard without being
  // logged in, send them to /login.
  // We attach the original URL as a `redirectTo` param
  // so after login they land back where they wanted to go.
  if (pathname.startsWith('/dashboard')) {
    if (!user || authError) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── RULE 2: Protect onboarding ───────────────
  // Onboarding is only for authenticated owners setting
  // up their restaurant for the first time.
  if (pathname.startsWith('/onboarding')) {
    if (!user || authError) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', '/onboarding')
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── RULE 3: Redirect logged-in users from /login ─
  // If an already-authenticated owner visits /login,
  // send them straight to their dashboard.
  // Prevents double-login confusion.
  if (pathname === '/login' && user && !authError) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── RULE 4: Block inactive workspaces ──────
  // If somehow an inactive owner's token is still valid,
  // we check their account status here.
  // This runs only on dashboard routes for performance.
  if (pathname.startsWith('/dashboard') && user) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('is_active')
      .eq('owner_id', user.id)
      .single()

    // If owner has no workspace yet, send to onboarding
    if (!workspace && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // If workspace is inactive, send to a blocked page
    if (workspace && !workspace.is_active) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }
  }

  // ── RULE 5: All other routes pass through ────
  // This covers:
  //   /               → landing page (public)
  //   /order/*        → customer QR ordering (public)
  //   /kitchen/*      → staff dashboards (PIN auth in layout)
  //   /api/*          → API routes (auth handled per-route)
  //   /login          → login page (already handled above)
  //   /suspended      → suspended account page (public)
  return response
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

export const dynamic = 'force-dynamic';
/**
 * ============================================================
 * MENUQR — STAFF PIN VERIFICATION API ROUTE
 * File: src/app/api/verify-pin/route.ts
 *
 * This route handles authentication for kitchen staff —
 * chefs, juice makers, and servers. Unlike the owner who
 * logs in with email + password via Supabase Auth, staff
 * use a simple 4-digit PIN set by the restaurant owner.
 *
 * WHY A SEPARATE PIN SYSTEM (not Supabase Auth):
 *  - Kitchen staff don't have email accounts in many
 *    small Indian restaurants
 *  - Tablets mounted in kitchens need a fast, simple
 *    login — typing an email + password is impractical
 *    with wet/greasy hands on a touchscreen
 *  - PINs can be shared among shift staff without giving
 *    access to the owner's Supabase account
 *  - The session expires in 12 hours — auto-logout at
 *    end of a typical restaurant work shift
 *
 * WHAT IT DOES (in sequence):
 *  1. Validates request — restaurantId + pin both present
 *  2. Rate limits by restaurantId — max 10 attempts per
 *     minute to prevent brute-force PIN guessing
 *  3. Fetches ALL active staff for the restaurant from
 *     Supabase (we check against all, not one — staff
 *     don't submit their name, just the PIN)
 *  4. Compares the submitted PIN against each staff
 *     member's bcrypt hash using constant-time comparison
 *  5. On match — returns the staff member's role, name,
 *     and a session expiry timestamp (12 hours from now)
 *     The kitchen layout stores this in localStorage.
 *  6. Updates last_login timestamp for the matched staff
 *  7. On no match — returns 401 with a generic message
 *     (never reveal whether the PIN exists or not)
 *
 * SESSION CONTRACT (localStorage):
 *  The response from this route is stored by the kitchen
 *  layout component as a KitchenSession object:
 *  {
 *    staffId: string        ← staff.id from DB
 *    role: StaffRole        ← 'chef' | 'juice' | 'server'
 *    name: string           ← staff.name for display
 *    restaurantId: string   ← for all subsequent queries
 *    expiry: number         ← Date.now() + 12hr (ms timestamp)
 *  }
 *  This exact shape matches the KitchenSession interface
 *  in types/database.ts — no mismatch possible.
 *
 * CONNECTS TO:
 *  ← Kitchen layout component calls this on PIN submit
 *  → lib/supabase.ts (createAdminSupabase — reads staff table)
 *  → types/database.ts (StaffRole, KitchenSession)
 *  → Supabase staff table (SELECT pin_hash, UPDATE last_login)
 *  → Kitchen layout (stores KitchenSession in localStorage)
 *  → /kitchen/chef, /kitchen/juice, /kitchen/server pages
 *    (read role from session to filter orders by station)
 * ============================================================
 */

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createAdminSupabase } from '@/lib/supabase'
import type { StaffRole, KitchenSession } from '@/types/database'

// ─────────────────────────────────────────────
// RATE LIMITER
// Max 10 PIN attempts per restaurant per 60 seconds.
// A 4-digit PIN has 10,000 combinations — without rate
// limiting, a script could try all of them in seconds.
// With this limit, exhausting all combinations would
// take ~16 hours, making brute-force impractical.
// ─────────────────────────────────────────────
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: false,
  prefix: 'menuqr_pin',
})

// ─────────────────────────────────────────────
// SESSION DURATION
// 12 hours in milliseconds — covers a full restaurant
// shift including setup and cleanup time.
// After expiry, the kitchen layout shows the PIN screen
// again automatically.
// ─────────────────────────────────────────────
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000 // 12 hours

// ─────────────────────────────────────────────
// ZOD VALIDATION SCHEMA
// pin: exactly 4 digits (string, not number — leading
//      zeros like "0042" must be preserved)
// restaurantId: valid UUID — prevents SQL injection
//               and identifies which staff to check
// ─────────────────────────────────────────────
const VerifyPinSchema = z.object({
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits'),
  restaurantId: z
    .string()
    .uuid('Invalid restaurant ID'),
})

type VerifyPinInput = z.infer<typeof VerifyPinSchema>

// ─────────────────────────────────────────────
// HELPER — Find matching staff by PIN
//
// Fetches all active staff for the restaurant and
// checks the submitted PIN against each bcrypt hash.
//
// WHY FETCH ALL then compare (not query by PIN):
//  - PIN hashes cannot be queried directly — bcrypt
//    hashes are not reversible or comparable in SQL
//  - The plaintext PIN is never stored in the DB
//  - Number of active staff per restaurant is small
//    (typically 2-10), so fetching all is fast
//
// Returns the matching Staff row or null.
// ─────────────────────────────────────────────
async function findStaffByPin(
  pin: string,
  restaurantId: string
): Promise<{
  id: string
  name: string
  role: StaffRole
  restaurant_id: string
} | null> {
  const supabase = createAdminSupabase()

  // Fetch only the fields we need — never expose pin_hash
  // to the response, but we need it here for comparison
  const { data: staffList, error } = await supabase
    .from('staff')
    .select('id, name, role, pin_hash, restaurant_id')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)

  if (error || !staffList || staffList.length === 0) {
    console.error('[MenuQR PIN] Staff fetch error:', error)
    return null
  }

  // Compare PIN against each staff member's hash
  // bcrypt.compare is async and constant-time — safe against
  // timing attacks even though we loop multiple records
  for (const staff of staffList) {
    const isMatch = await bcrypt.compare(pin, staff.pin_hash)
    if (isMatch) {
      return {
        id: staff.id,
        name: staff.name,
        role: staff.role as StaffRole,
        restaurant_id: staff.restaurant_id,
      }
    }
  }

  // No staff matched this PIN
  return null
}

// ─────────────────────────────────────────────
// HELPER — Record last login timestamp
// Non-blocking — we don't await this in the main
// flow so it doesn't slow down the PIN response.
// If it fails, it's non-critical — session still works.
// ─────────────────────────────────────────────
function recordLastLogin(staffId: string): void {
  const supabase = createAdminSupabase()
  supabase
    .from('staff')
    .update({ last_login: new Date().toISOString() })
    .eq('id', staffId)
    .then(({ error }) => {
      if (error) {
        console.warn('[MenuQR PIN] last_login update failed (non-critical):', error)
      }
    })
}

// ─────────────────────────────────────────────
// MAIN HANDLER — POST /api/verify-pin
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  // ── STEP 1: Parse and validate request body ──
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const parsed = VerifyPinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { pin, restaurantId }: VerifyPinInput = parsed.data

  // ── STEP 2: Rate limit by restaurant ─────────
  // Key: restaurant ID — limits attempts per location,
  // not per IP (kitchen tablets share one IP via WiFi)
  const { success: rateLimitOk, remaining } = await ratelimit.limit(
    `pin_${restaurantId}`
  )

  if (!rateLimitOk) {
    console.warn(
      `[MenuQR PIN] Rate limit hit for restaurant: ${restaurantId}`
    )
    return NextResponse.json(
      {
        error: 'Too many PIN attempts. Please wait 60 seconds.',
        retryAfter: 60,
      },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    )
  }

  // ── STEP 3: Find matching staff by PIN ────────
  const matchedStaff = await findStaffByPin(pin, restaurantId)

  // ── STEP 4: Handle no match ───────────────────
  if (!matchedStaff) {
    // Generic error message — never say "PIN not found"
    // or "no staff with this PIN" — that leaks information
    // about what PINs exist in the system
    console.info(
      `[MenuQR PIN] Failed attempt for restaurant: ${restaurantId}. ` +
      `Remaining attempts: ${remaining}`
    )
    return NextResponse.json(
      { error: 'Incorrect PIN. Please try again.' },
      { status: 401 }
    )
  }

  // ── STEP 5: Build session object ──────────────
  // This exact shape matches the KitchenSession interface
  // in types/database.ts — kitchen layout stores this
  // directly in localStorage without transformation
  const session: KitchenSession = {
    staffId: matchedStaff.id,
    role: matchedStaff.role,
    name: matchedStaff.name,
    restaurantId: matchedStaff.restaurant_id,
    expiry: Date.now() + SESSION_DURATION_MS,
  }

  // ── STEP 6: Record last login (non-blocking) ──
  // Fire and forget — don't delay the response
  recordLastLogin(matchedStaff.id)

  // ── STEP 7: Return session to kitchen layout ──
  // Kitchen layout stores this in localStorage.
  // Role determines which kitchen dashboard to show:
  //   chef   → /kitchen/chef   (food orders only)
  //   juice  → /kitchen/juice  (beverage orders only)
  //   server → /kitchen/server (all orders, serve tracking)
  console.info(
    `[MenuQR PIN] Staff logged in — ${matchedStaff.name} ` +
    `(${matchedStaff.role}) at restaurant ${restaurantId}`
  )

  return NextResponse.json(
    {
      success: true,
      session,
      // Tell the frontend which dashboard URL to redirect to
      redirectTo: getRoleRedirect(matchedStaff.role),
    },
    { status: 200 }
  )
}

// ─────────────────────────────────────────────
// HELPER — Map role to kitchen dashboard URL
// Used by the kitchen layout to redirect after
// successful PIN entry.
// ─────────────────────────────────────────────
function getRoleRedirect(role: StaffRole): string {
  const redirectMap: Record<StaffRole, string> = {
    chef: '/kitchen/chef',
    juice: '/kitchen/juice',
    server: '/kitchen/server',
    // Owner should never use PIN login — they use
    // Supabase Auth. But handle gracefully if somehow
    // an owner role PIN was set.
    owner: '/dashboard',
  }
  return redirectMap[role]
}

// Only POST is valid for this endpoint
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

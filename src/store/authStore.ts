/**
 * ============================================================
 * MENUQR — OWNER AUTH STORE
 * File: src/store/authStore.ts
 *
 * Holds the authenticated owner's session context across
 * all dashboard pages. Every dashboard component reads
 * restaurantId, plan, and owner details from here instead
 * of making repeated Supabase auth calls per component.
 *
 * WHY THIS STORE EXISTS (not just Supabase auth hooks):
 *  - Supabase's useUser() gives you the auth user but NOT
 *    the restaurant data (name, plan, slug, payment status).
 *    Every dashboard component needs both together.
 *  - Without this store, each dashboard page would make
 *    two round trips (getUser + getRestaurant) on every
 *    mount — 10+ components = 20+ redundant DB calls.
 *  - This store initialises ONCE when the dashboard layout
 *    mounts, then every child component reads from memory.
 *
 * WHAT IT HOLDS:
 *  1. Supabase Auth user (id, email, metadata)
 *  2. Full Restaurant row (id, name, slug, plan, status,
 *     payment_enabled, onboarding_complete, logo_url, etc.)
 *  3. Loading + error state for the initialisation fetch
 *  4. Derived permission flags (canUseOnlinePayments,
 *     isOnboardingComplete, isPro, isSuspended)
 *
 * LIFECYCLE:
 *  1. Dashboard layout mounts → calls initialize()
 *  2. initialize() calls supabase.auth.getUser()
 *     then fetches the restaurant row
 *  3. All dashboard child components read from store
 *     (no additional DB calls)
 *  4. Supabase auth state listener updates the store
 *     if session expires or user logs out
 *  5. logout() clears store + redirects to /login
 *  6. updateRestaurant() used by Settings page to
 *     reflect changes without a full page reload
 *
 * CONNECTS TO:
 *  ← Dashboard layout (/dashboard/layout.tsx) calls initialize()
 *  ← All /dashboard/* pages read restaurantId, plan, etc.
 *  ← Settings page calls updateRestaurant() after saves
 *  ← Onboarding wizard calls setOnboardingComplete()
 *  → lib/supabase.ts (createBrowserSupabase)
 *  → types/database.ts (Restaurant, RestaurantPlan,
 *                        RestaurantStatus)
 *  → middleware.ts (middleware checks onboarding_complete +
 *    status — this store mirrors those checks client-side
 *    so the UI stays in sync without extra redirects)
 * ============================================================
 */

'use client'

import { create } from 'zustand'
import { createBrowserSupabase } from '@/lib/supabase/client'
import type {
  Restaurant,
  SubscriptionPlan,
  SubscriptionStatus,
  RestaurantStatus,
} from '@/types/database'
import type { User } from '@supabase/supabase-js'
import { isTrialExpired, getTrialDaysRemaining, getLimit, hasFeatureAccess } from '@/config/plans'

// ─────────────────────────────────────────────
// OWNER PROFILE
// Subset of the Supabase Auth user fields
// that the dashboard UI needs. Keeps the store
// lean — we don't need the full User object everywhere.
// ─────────────────────────────────────────────
export interface OwnerProfile {
  id: string              // Supabase auth user ID
  email: string           // Login email
  fullName: string | null // From user_metadata.full_name
  avatarUrl: string | null
}

// ─────────────────────────────────────────────
// PERMISSION FLAGS
// Derived from the Restaurant row — computed once
// in initialize() and stored for fast reads.
// Avoids repeated conditional logic scattered across
// dashboard components.
// ─────────────────────────────────────────────
export interface OwnerPermissions {
  canUseOnlinePayments: boolean
  isOnboardingComplete: boolean
  isSuspended: boolean
  canAddMoreItems: boolean
  isTrialExpired: boolean
  trialDaysRemaining: number
  hasLiveKitchen: boolean
  hasAdvancedAnalytics: boolean
  hasCustomDomain: boolean
}

// ─────────────────────────────────────────────
// STORE INIT STATE
// Tracks the initialisation lifecycle so the
// dashboard layout can show a skeleton while loading.
// ─────────────────────────────────────────────
type InitState = 'idle' | 'loading' | 'ready' | 'error' | 'unauthenticated'

// ─────────────────────────────────────────────
// FULL STORE STATE TYPE
// ─────────────────────────────────────────────
interface AuthState {
  // ── Core data ──────────────────────────────
  owner: OwnerProfile | null
  restaurant: Restaurant | null
  permissions: OwnerPermissions | null

  // ── Init state ─────────────────────────────
  initState: InitState
  initError: string | null

  // ── Actions ────────────────────────────────
  initialize: () => Promise<void>
  logout: () => Promise<void>
  updateRestaurant: (updates: Partial<Restaurant>) => void
  setOnboardingComplete: () => void
  refreshRestaurant: () => Promise<void>
  clear: () => void
}

// ─────────────────────────────────────────────
// HELPER — Build OwnerProfile from Supabase User
// Normalises the Supabase User object into our
// lean OwnerProfile shape. Handles missing metadata.
// ─────────────────────────────────────────────
function buildOwnerProfile(user: User): OwnerProfile {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  }
}

// ─────────────────────────────────────────────
// HELPER — Compute permission flags from Restaurant
// Called once after loading the restaurant row.
// Centralises all plan/status logic in one place.
// ─────────────────────────────────────────────
function computePermissions(
  restaurant: Restaurant,
  menuItemCount?: number
): OwnerPermissions {
  const maxItems = getLimit(restaurant, 'menuItems')
  const canAddMoreItems = (menuItemCount ?? 0) < maxItems

  return {
    canUseOnlinePayments:
      restaurant.payment_enabled &&
      !!restaurant.razorpay_account_id,
    isOnboardingComplete: restaurant.onboarding_complete,
    isSuspended: restaurant.status === 'suspended',
    canAddMoreItems,
    isTrialExpired: isTrialExpired(restaurant),
    trialDaysRemaining: getTrialDaysRemaining(restaurant),
    hasLiveKitchen: hasFeatureAccess(restaurant, 'hasLiveKitchen'),
    hasAdvancedAnalytics: hasFeatureAccess(restaurant, 'hasAdvancedAnalytics'),
    hasCustomDomain: hasFeatureAccess(restaurant, 'hasCustomDomain'),
  }
}

// ─────────────────────────────────────────────
// HELPER — Fetch restaurant for owner
// Uses browser client (anon key + auth cookie).
// RLS ensures owners only see their own restaurant.
// Matches the query pattern in middleware.ts Rule 4.
// ─────────────────────────────────────────────
async function fetchOwnerRestaurant(
  ownerId: string
): Promise<Restaurant | null> {
  const supabase = createBrowserSupabase()

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', ownerId)
    .single()

  if (error || !data) return null
  return data as Restaurant
}

// ─────────────────────────────────────────────
// ZUSTAND STORE
// NOT persisted — owner session comes from
// Supabase cookies (handled by middleware.ts).
// The store is rebuilt on every page load from
// the live Supabase session. This ensures the
// dashboard always reflects the latest DB state.
// ─────────────────────────────────────────────
export const useAuthStore = create<AuthState>()((set, get) => ({
  // ── Initial state ─────────────────────────
  owner: null,
  restaurant: null,
  permissions: null,
  initState: 'idle',
  initError: null,

  // ── initialize ────────────────────────────
  // Called once by the dashboard layout on mount.
  // Idempotent — if already 'ready', returns immediately.
  // Sequence:
  //   1. getUser() — verifies session server-side
  //   2. fetchOwnerRestaurant() — loads full restaurant row
  //   3. Computes permissions
  //   4. Sets up auth state change listener for logout detection
  initialize: async () => {
    // Prevent duplicate initialisation
    const current = get().initState
    if (current === 'loading' || current === 'ready') return

    set({ initState: 'loading', initError: null })

    const supabase = createBrowserSupabase()

    try {
      // Step 1: Verify auth session
      // getUser() makes a live network call — same as middleware.ts
      // Slower than getSession() but secure
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        set({ initState: 'unauthenticated', owner: null })
        return
      }

      // Step 2: Build owner profile
      const owner = buildOwnerProfile(user)

      // Step 3: Fetch restaurant data
      const restaurant = await fetchOwnerRestaurant(user.id)

      if (!restaurant) {
        // Owner exists but has no restaurant — onboarding not started
        set({
          initState: 'ready',
          owner,
          restaurant: null,
          permissions: null,
        })
        return
      }

      // Step 4: Compute permissions
      const permissions = computePermissions(restaurant)

      set({
        initState: 'ready',
        owner,
        restaurant,
        permissions,
        initError: null,
      })

      // Step 5: Listen for auth state changes
      // Handles logout from another tab, token expiry, etc.
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          get().clear()
        } else if (event === 'TOKEN_REFRESHED' && session.user) {
          // Update owner profile if metadata changed
          set({ owner: buildOwnerProfile(session.user) })
        }
      })

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load session'
      console.error('[MenuQR Auth] Initialize error:', err)
      set({
        initState: 'error',
        initError: message,
        owner: null,
        restaurant: null,
      })
    }
  },

  // ── logout ─────────────────────────────────
  // Signs out from Supabase + clears store.
  // The redirect to /login happens in the component
  // that calls this (so it can use Next.js router).
  logout: async () => {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    get().clear()
  },

  // ── updateRestaurant ───────────────────────
  // Called by Settings page after saving changes.
  // Merges updates into the existing restaurant object
  // and recomputes permissions — no DB re-fetch needed.
  // Keeps dashboard header (logo, name) in sync instantly.
  updateRestaurant: (updates: Partial<Restaurant>) => {
    const current = get().restaurant
    if (!current) return

    const updated = { ...current, ...updates }
    set({
      restaurant: updated,
      permissions: computePermissions(updated),
    })
  },

  // ── setOnboardingComplete ──────────────────
  // Called by onboarding Step 6 ("All set") screen
  // after the owner finishes setup.
  // Updates the flag without re-fetching the full
  // restaurant — the DB was already updated by the
  // onboarding server action.
  setOnboardingComplete: () => {
    const current = get().restaurant
    if (!current) return

    const updated = { ...current, onboarding_complete: true }
    set({
      restaurant: updated,
      permissions: computePermissions(updated),
    })
  },

  // ── refreshRestaurant ──────────────────────
  // Forces a full re-fetch of the restaurant row.
  // Called after:
  //   - Razorpay account connection (payment_enabled changes)
  //   - Plan upgrade (plan changes)
  //   - Any settings change that affects permissions
  refreshRestaurant: async () => {
    const owner = get().owner
    if (!owner) return

    const restaurant = await fetchOwnerRestaurant(owner.id)
    if (!restaurant) return

    set({
      restaurant,
      permissions: computePermissions(restaurant),
    })
  },

  // ── clear ──────────────────────────────────
  // Resets store to initial state.
  // Called by logout() and auth state listener.
  clear: () =>
    set({
      owner: null,
      restaurant: null,
      permissions: null,
      initState: 'idle',
      initError: null,
    }),
}))

// ─────────────────────────────────────────────
// CONVENIENCE SELECTOR HOOKS
// Import these in dashboard components instead of
// the full store to get scoped re-renders.
// ─────────────────────────────────────────────

import { useShallow } from 'zustand/react/shallow'

export const useRestaurantProfile = () =>
  useAuthStore(useShallow((s) => ({
    name: s.restaurant?.name ?? '',
    logoUrl: s.restaurant?.logo_url ?? null,
    plan: s.restaurant?.current_plan as SubscriptionPlan | undefined,
    subStatus: s.restaurant?.sub_status as SubscriptionStatus | undefined,
    slug: s.restaurant?.slug ?? '',
    status: s.restaurant?.status as RestaurantStatus | undefined,
  })))

// Most dashboard pages just need the restaurantId
// to scope their data queries
export const useRestaurantId = () =>
  useAuthStore((s) => s.restaurant?.id ?? null)

// Owner info for the sidebar bottom section
export const useOwnerProfile = () =>
  useAuthStore((s) => s.owner)

// Permission gates — used by feature-gated UI elements
// e.g. "Connect bank account" CTA shown when !canUseOnlinePayments
export const usePermissions = () =>
  useAuthStore((s) => s.permissions)

// Loading state — dashboard layout shows skeleton
export const useAuthReady = () =>
  useAuthStore(useShallow((s) => ({
    isLoading: s.initState === 'loading' || s.initState === 'idle',
    isReady: s.initState === 'ready',
    isError: s.initState === 'error',
    isUnauthenticated: s.initState === 'unauthenticated',
    error: s.initError,
  })))

export const usePlan = () =>
  useAuthStore(useShallow((s) => ({
    plan: s.restaurant?.current_plan as SubscriptionPlan | undefined,
    subStatus: s.restaurant?.sub_status as SubscriptionStatus | undefined,
    isTrialExpired: s.permissions?.isTrialExpired ?? false,
    trialDaysRemaining: s.permissions?.trialDaysRemaining ?? 0,
    hasLiveKitchen: s.permissions?.hasLiveKitchen ?? false,
    hasAdvancedAnalytics: s.permissions?.hasAdvancedAnalytics ?? false,
    canAddMoreItems: s.permissions?.canAddMoreItems ?? true,
    canUseOnlinePayments: s.permissions?.canUseOnlinePayments ?? false,
  })))

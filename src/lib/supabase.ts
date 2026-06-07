/**
 * ============================================================
 * MENUQR — UNIFIED SUPABASE BACKEND CORE
 * File: src/lib/supabase.ts
 *
 * This is the single most important backend file in the project.
 * Every other backend file (API routes, server actions, hooks)
 * imports from here. It exports three things:
 *
 *  1. createBrowserClient()  — for React Client Components
 *  2. createServerClient()   — for Server Components + API routes
 *  3. createAdminClient()    — for privileged ops (webhooks, PIN verify)
 *
 * WHY ONE FILE:
 *  - Single source of truth for Supabase connection config
 *  - Prevents duplicate client instances (memory leak risk)
 *  - Type-safe via Database generic — every query is auto-typed
 *  - Environment validation happens here — app crashes fast
 *    with a clear message if any env var is missing
 * ============================================================
 */

import { createBrowserSupabase } from './supabase/client'
import { createServerSupabase } from './supabase/server'
import { createAdminSupabase } from './supabase/admin'

export { createBrowserSupabase, createServerSupabase, createAdminSupabase }

// ─────────────────────────────────────────────
// STEP 5 — Shared database query helpers
//
// These are thin wrappers around common queries used
// across multiple API routes and server actions.
// Keeps queries consistent and prevents copy-paste bugs.
// ─────────────────────────────────────────────

/**
 * getWorkspaceBySlug
 * Used by: Customer ordering page (SSR), QR landing page
 * Fetches full workspace data by URL slug (e.g. "sree-juice-shop")
 * Returns null if not found or inactive.
 */
export async function getWorkspaceBySlug(slug: string) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

/**
 * getMenuByWorkspaceId
 * Used by: Customer ordering page (SSR + TanStack Query),
 *          Menu manager (owner dashboard)
 * Returns only available items sorted by display_order.
 * Result is safe to pass directly to the customer UI.
 */
export async function getMenuByWorkspaceId(
  workspaceId: string,
  onlyAvailable = true
) {
  const supabase = createServerSupabase()
  let query = supabase
    .from('menu_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('display_order', { ascending: true })

  if (onlyAvailable) {
    query = query.eq('is_available', true)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch menu: ${error.message}`)
  return data ?? []
}

/**
 * getTablesByWorkspaceId
 * Used by: QR setup step in onboarding, Table manager,
 *          Order creation (validates table belongs to workspace)
 */
export async function getTablesByWorkspaceId(workspaceId: string) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('table_number', { ascending: true })

  if (error) throw new Error(`Failed to fetch tables: ${error.message}`)
  return data ?? []
}

/**
 * getActiveOrdersByWorkspaceId
 * Used by: Owner dashboard live orders panel,
 *          Chef/Juice/Server kitchen dashboards (filtered by station)
 * Joins order_items and menu_items so the kitchen sees item names.
 * Excludes served and cancelled orders (completed state).
 */
export async function getActiveOrdersByWorkspaceId(workspaceId: string) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      tables ( id, table_number, name ),
      order_items (
        *,
        menu_items ( id, name, category_id, is_veg )
      )
    `)
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("served","cancelled")')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`)
  return data ?? []
}

/**
 * getWorkspaceByOwnerId
 * Used by: Owner dashboard layout — verifies ownership,
 *          All owner API routes — validates request context
 * Returns the workspace that belongs to the authenticated owner.
 */
export async function getWorkspaceByOwnerId(ownerId: string) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', ownerId)
    .single()

  if (error || !data) return null
  return data
}

/**
 * verifyTableOwnership
 * Used by: create-order API route
 * Security check — confirms the table actually belongs to the workspace
 * before creating an order. Prevents cross-workspace order injection.
 */
export async function verifyTableOwnership(
  tableId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('tables')
    .select('id')
    .eq('id', tableId)
    .eq('workspace_id', workspaceId)
    .single()

  return !!data
}

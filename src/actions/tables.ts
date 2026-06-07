/**
 * ============================================================
 * MENUQR — TABLES SERVER ACTIONS
 * File: src/actions/tables.ts
 *
 * All server actions for table management in the owner
 * dashboard (/dashboard/tables). Handles adding tables,
 * renaming, deactivating, and bulk operations.
 *
 * ACTIONS IN THIS FILE:
 *   1. getTableList()         — All tables for restaurant
 *   2. addTable()             — Add a single new table
 *   3. addBulkTables()        — Add multiple tables at once
 *   4. updateTable()          — Rename a table
 *   5. deactivateTable()      — Remove table from service
 *   6. reactivateTable()      — Restore deactivated table
 *   7. clearTableStatus()     — Manually reset occupied→available
 *   8. deleteTable()          — Permanent delete (no active orders)
 *
 * CRITICAL CONNECTIONS:
 *
 *   generate-qr/route.ts:
 *     After addTable() or addBulkTables(), the owner is
 *     redirected to the QR setup step where generate-qr is
 *     called for the new tables. generate-qr writes
 *     qr_code_url back to the tables row — our insert must
 *     create the row first with qr_code_url = null.
 *
 *   create-order/route.ts + verifyTableOwnership():
 *     Every customer order is validated against the tables
 *     table via verifyTableOwnership(tableId, restaurantId)
 *     in supabase.ts. Deactivated tables (is_active=false)
 *     are excluded from getTablesByRestaurantId() which
 *     the QR page uses — but orders can still reference
 *     them. deactivateTable() checks for active orders first.
 *
 *   update-order-status/route.ts:
 *     serve_order sets table.status = 'available'.
 *     cancelOrder in orders.ts also frees tables.
 *     clearTableStatus() is the owner's manual override
 *     for edge cases (e.g. customer left without serving).
 *
 *   restaurant.ts createRestaurant():
 *     Creates initial tables during onboarding Step 1.
 *     addTable() / addBulkTables() are used for adding
 *     more tables after onboarding (Table Manager page).
 *     Both use the same insert shape — RestaurantTableInsert.
 *
 *   migrations/001_initial.sql:
 *     UNIQUE(restaurant_id, table_number) constraint —
 *     addTable() must check for duplicate table numbers.
 *     tables_public_select RLS policy lets customers read
 *     tables (needed to verify QR codes) — our is_active
 *     flag controls which tables appear publicly.
 *
 * CONNECTS TO:
 *  ← /dashboard/tables page calls all actions
 *  → generate-qr/route.ts (called after addTable for QR)
 *  → lib/supabase.ts (createServerSupabase + createAdminSupabase)
 *  → migrations/001_initial.sql (tables table schema,
 *    UNIQUE constraint on restaurant_id + table_number)
 *  → create-order/route.ts (verifyTableOwnership reads tables)
 *  → update-order-status/route.ts (sets table status)
 *  → orders.ts cancelOrder (also frees tables)
 *  → restaurant.ts (same insert shape — RestaurantTableInsert)
 * ============================================================
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// TABLE TYPE
// Mirrors RestaurantTable interface from database.ts.
// Defined inline to stay self-contained — importing
// from database.ts would also pull in all other types.
// ─────────────────────────────────────────────
export interface TableRow {
  id: string
  restaurant_id: string
  table_number: number
  table_name: string | null
  status: 'available' | 'occupied' | 'inactive'
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}

// ─────────────────────────────────────────────
// ACTION RESULT — consistent with all action files
// ─────────────────────────────────────────────
type ActionResult<T = TableRow> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─────────────────────────────────────────────
// HELPER — Get authenticated owner
// ─────────────────────────────────────────────
async function getAuthenticatedOwner() {
  const supabase = createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorised — please log in')
  return user
}

// ─────────────────────────────────────────────
// HELPER — Verify restaurant belongs to owner
// Used by all actions — prevents cross-restaurant
// table manipulation.
// ─────────────────────────────────────────────
async function verifyRestaurantOwnership(
  restaurantId: string,
  ownerId: string
): Promise<boolean> {
  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', ownerId)
    .single()
  return !!data
}

// ─────────────────────────────────────────────
// HELPER — Verify table belongs to owner's restaurant
// Used by single-table operations (update, deactivate).
// Returns the full table row for use in the action.
// ─────────────────────────────────────────────
async function verifyTableOwnership(
  tableId: string,
  ownerId: string
): Promise<{ owned: boolean; table: TableRow | null }> {
  const supabase = createAdminSupabase()

  const { data } = await supabase
    .from('tables')
    .select('*, restaurants!inner(owner_id)')
    // @ts-expect-error - Bypass complex supabase join inference
    .eq('id', tableId)
    .single()

  if (!data) return { owned: false, table: null }

  const ownerIdFromDB = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).restaurants as unknown as { owner_id: string }
  ).owner_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const { restaurants: _, ...tableData } = data as any

  return {
    owned: ownerIdFromDB === ownerId,
    table: tableData as unknown as TableRow,
  }
}

// ─────────────────────────────────────────────
// HELPER — Get next available table number
// Finds the highest existing table_number for the
// restaurant (including inactive tables) and returns
// the next sequential number.
// Respects the UNIQUE(restaurant_id, table_number)
// constraint from migrations/001_initial.sql.
// ─────────────────────────────────────────────
async function getNextTableNumber(restaurantId: string): Promise<number> {
  const supabase = createAdminSupabase()

  const { data } = await supabase
    .from('tables')
    .select('table_number')
    .eq('restaurant_id', restaurantId)
    .order('table_number', { ascending: false })
    .limit(1)
    .single()

  return data ? data.table_number + 1 : 1
}

// ─────────────────────────────────────────────
// HELPER — Check if table has active orders
// Used before deactivation and deletion.
// Active = any order not in served or cancelled state.
// Mirrors the same check in orders.ts cancelOrder()
// and update-order-status/route.ts serve_order.
// ─────────────────────────────────────────────
async function hasActiveOrders(tableId: string): Promise<boolean> {
  const supabase = createAdminSupabase()

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', tableId)
    .in('status', ['confirmed', 'preparing', 'ready', 'pending'])

  return (count ?? 0) > 0
}

// ============================================================
// ACTION 1 — getTableList
// Fetches all tables for the restaurant including inactive.
// Returns tables sorted by table_number ascending.
// Owner dashboard shows all so inactive can be reactivated.
// Includes live order count per table (for occupied tables).
// ============================================================
export async function getTableList(
  restaurantId: string
): Promise<
  ActionResult<{
    tables: TableRow[]
    totalCount: number
    activeCount: number
    occupiedCount: number
  }>
> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const isOwner = await verifyRestaurantOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    const { data: tables, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true })

    if (error) {
      console.error('[MenuQR] getTableList error:', error)
      return { success: false, error: 'Failed to fetch tables' }
    }

    const allTables = (tables ?? []) as TableRow[]
    const activeCount = allTables.filter((t) => t.is_active).length
    const occupiedCount = allTables.filter((t) => t.status === 'occupied').length

    return {
      success: true,
      data: {
        tables: allTables,
        totalCount: allTables.length,
        activeCount,
        occupiedCount,
      },
    }
  } catch (err) {
    console.error('[MenuQR] getTableList error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 2 — addTable
// Adds a single new table to the restaurant.
// Auto-assigns the next sequential table_number.
// Creates the row with qr_code_url = null — the owner
// calls generate-qr/route.ts separately to create the QR.
// Enforces UNIQUE(restaurant_id, table_number) at app level
// before the DB constraint fires for a friendlier error.
// ============================================================
const AddTableSchema = z.object({
  restaurantId: z.string().uuid(),
  tableName: z.string().max(50).optional(),
  tableNumber: z.number().int().min(1).max(999).optional(),
})

export async function addTable(
  input: z.infer<typeof AddTableSchema>
): Promise<ActionResult<TableRow>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = AddTableSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { restaurantId, tableName, tableNumber: requestedNumber } = parsed.data

    const isOwner = await verifyRestaurantOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // Determine table number
    const tableNumber = requestedNumber ?? (await getNextTableNumber(restaurantId))

    // Check for duplicate table number before DB constraint fires
    const { data: existing } = await supabase
      .from('tables')
      .select('id, qr_code_url, status, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('table_number', tableNumber)
      .single()

    if (existing) {
      if (!existing.qr_code_url) {
        // This is a fake/placeholder table from the old onboarding. Reuse it!
        const { data: updatedTable, error: updateError } = await supabase
          .from('tables')
          .update({
            table_name: tableName ?? null,
            status: 'available',
            is_active: true,
          })
          .eq('id', existing.id)
          .select('*')
          .single()

        if (!updateError && updatedTable) {
          revalidatePath('/dashboard/tables')
          return { success: true, data: updatedTable as TableRow }
        }
      }

      return {
        success: false,
        error: `Table ${tableNumber} already exists. Choose a different number.`,
      }
    }

    // Insert new table — qr_code_url starts null
    // generate-qr/route.ts fills this after QR generation
    const { data: table, error: insertError } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: tableNumber,
        table_name: tableName ?? null,
        status: 'available',
        qr_code_url: null,
        is_active: true,
      })
      .select('*')
      .single()

    if (insertError || !table) {
      // Handle UNIQUE constraint violation gracefully
      if (insertError?.code === '23505') {
        return {
          success: false,
          error: `Table ${tableNumber} already exists. Choose a different number.`,
        }
      }
      console.error('[MenuQR] addTable insert error:', insertError)
      return { success: false, error: 'Failed to add table. Please try again.' }
    }

    revalidatePath('/dashboard/tables')

    return { success: true, data: table as TableRow }
  } catch (err) {
    console.error('[MenuQR] addTable error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 3 — addBulkTables
// Adds multiple tables at once.
// Used when owner wants to add 5 more tables in one step
// rather than clicking "Add table" five times.
// Numbers auto-assigned sequentially from current max.
// Returns all newly created tables for the QR setup flow.
// ============================================================
const AddBulkTablesSchema = z.object({
  restaurantId: z.string().uuid(),
  count: z
    .number()
    .int()
    .min(1, 'Must add at least 1 table')
    .max(50, 'Cannot add more than 50 tables at once'),
})

export async function addBulkTables(
  input: z.infer<typeof AddBulkTablesSchema>
): Promise<ActionResult<{ tables: TableRow[]; addedCount: number }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = AddBulkTablesSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { restaurantId, count } = parsed.data

    const isOwner = await verifyRestaurantOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // Get starting table number
    const startNumber = await getNextTableNumber(restaurantId)

    // Build insert rows sequentially
    // Same shape as restaurant.ts createRestaurant() initial tables
    const tableRows = Array.from({ length: count }, (_, i) => ({
      restaurant_id: restaurantId,
      table_number: startNumber + i,
      table_name: null,
      status: 'available' as const,
      qr_code_url: null,
      is_active: true,
    }))

    const { data: tables, error: insertError } = await supabase
      .from('tables')
      .insert(tableRows)
      .select('*')

    if (insertError || !tables) {
      console.error('[MenuQR] addBulkTables insert error:', insertError)
      return {
        success: false,
        error: 'Failed to add tables. Please try again.',
      }
    }

    revalidatePath('/dashboard/tables')

    return {
      success: true,
      data: {
        tables: (tables as TableRow[]).sort(
          (a, b) => a.table_number - b.table_number
        ),
        addedCount: tables.length,
      },
    }
  } catch (err) {
    console.error('[MenuQR] addBulkTables error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 4 — updateTable
// Rename a table or change its display number.
//
// TABLE NUMBER CHANGE WARNING:
//   Changing a table's number invalidates its QR code because
//   the QR code URL encodes the table_id (UUID), NOT the
//   table_number. The UUID never changes, so the QR still
//   works — table_number is display-only in the UI.
//   This is by design: table_id is the stable identifier,
//   table_number is just the label shown to staff.
// ============================================================
const UpdateTableSchema = z.object({
  tableId: z.string().uuid(),
  tableName: z.string().max(50).optional().nullable(),
  tableNumber: z.number().int().min(1).max(999).optional(),
})

export async function updateTable(
  input: z.infer<typeof UpdateTableSchema>
): Promise<ActionResult<TableRow>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = UpdateTableSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { tableId, tableName, tableNumber } = parsed.data

    const { owned, table } = await verifyTableOwnership(tableId, user.id)
    if (!owned || !table) {
      return { success: false, error: 'Table not found or access denied' }
    }

    // If changing table_number, check for duplicates
    if (tableNumber !== undefined && tableNumber !== table.table_number) {
      const { data: existing } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', table.restaurant_id)
        .eq('table_number', tableNumber)
        .neq('id', tableId) // Exclude current table
        .single()

      if (existing) {
        return {
          success: false,
          error: `Table ${tableNumber} already exists. Choose a different number.`,
        }
      }
    }

    // Build partial update
    const updates: Record<string, unknown> = {}
    if (tableName !== undefined) updates.table_name = tableName
    if (tableNumber !== undefined) updates.table_number = tableNumber

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No changes to save' }
    }

    const { data: updatedTable, error: updateError } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', tableId)
      .select('*')
      .single()

    if (updateError || !updatedTable) {
      if (updateError?.code === '23505') {
        return {
          success: false,
          error: `Table ${tableNumber} already exists. Choose a different number.`,
        }
      }
      console.error('[MenuQR] updateTable error:', updateError)
      return { success: false, error: 'Failed to update table. Please try again.' }
    }

    revalidatePath('/dashboard/tables')

    return { success: true, data: updatedTable as TableRow }
  } catch (err) {
    console.error('[MenuQR] updateTable error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 5 — deactivateTable
// Marks a table as inactive (is_active = false).
// Inactive tables are excluded from:
//   - getTablesByRestaurantId() in supabase.ts (QR page)
//   - generate-qr bulk mode (only active tables)
//   - Table manager active count
// But their QR codes still technically work — the URL
// exists, but create-order/route.ts checks is_active
// via verifyTableOwnership which looks for is_active = true.
//
// SAFETY: Blocks deactivation if table has active orders.
// ============================================================
export async function deactivateTable(
  tableId: string
): Promise<ActionResult<{ deactivatedId: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, table } = await verifyTableOwnership(tableId, user.id)
    if (!owned || !table) {
      return { success: false, error: 'Table not found or access denied' }
    }

    if (!table.is_active) {
      return { success: false, error: 'Table is already inactive' }
    }

    // Block if active orders exist on this table
    const activeOrders = await hasActiveOrders(tableId)
    if (activeOrders) {
      return {
        success: false,
        error:
          'Cannot deactivate — this table has active orders. ' +
          'Wait for orders to be served or cancel them first.',
      }
    }

    const { error: updateError } = await supabase
      .from('tables')
      .update({ is_active: false, status: 'inactive' })
      .eq('id', tableId)

    if (updateError) {
      console.error('[MenuQR] deactivateTable error:', updateError)
      return { success: false, error: 'Failed to deactivate table. Please try again.' }
    }

    revalidatePath('/dashboard/tables')

    return { success: true, data: { deactivatedId: tableId } }
  } catch (err) {
    console.error('[MenuQR] deactivateTable error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 6 — reactivateTable
// Restores a deactivated table back to 'available'.
// Table retains its qr_code_url — existing printed QR
// codes work again immediately since they encode
// the stable table_id UUID, not any status field.
// ============================================================
export async function reactivateTable(
  tableId: string
): Promise<ActionResult<TableRow>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, table } = await verifyTableOwnership(tableId, user.id)
    if (!owned || !table) {
      return { success: false, error: 'Table not found or access denied' }
    }

    if (table.is_active) {
      return { success: false, error: 'Table is already active' }
    }

    const { data: updatedTable, error: updateError } = await supabase
      .from('tables')
      .update({ is_active: true, status: 'available' })
      .eq('id', tableId)
      .select('*')
      .single()

    if (updateError || !updatedTable) {
      console.error('[MenuQR] reactivateTable error:', updateError)
      return { success: false, error: 'Failed to reactivate table. Please try again.' }
    }

    revalidatePath('/dashboard/tables')

    return { success: true, data: updatedTable as TableRow }
  } catch (err) {
    console.error('[MenuQR] reactivateTable error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 7 — clearTableStatus
// Manually resets an 'occupied' table back to 'available'.
// Owner override for edge cases:
//   - Customer left without being formally served
//   - Test order placed during setup
//   - Server forgot to tap "Mark served"
//
// Does NOT affect the orders on this table — orders stay
// in whatever state they are. This only updates the
// visual status shown on the table map in the dashboard.
//
// Only works when table is 'occupied' — if it's
// 'available' already there is nothing to clear.
// ============================================================
export async function clearTableStatus(
  tableId: string
): Promise<ActionResult<TableRow>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, table } = await verifyTableOwnership(tableId, user.id)
    if (!owned || !table) {
      return { success: false, error: 'Table not found or access denied' }
    }

    if (table.status !== 'occupied') {
      return {
        success: false,
        error: `Table is already '${table.status}' — nothing to clear`,
      }
    }

    const { data: updatedTable, error: updateError } = await supabase
      .from('tables')
      .update({ status: 'available' })
      .eq('id', tableId)
      .select('*')
      .single()

    if (updateError || !updatedTable) {
      console.error('[MenuQR] clearTableStatus error:', updateError)
      return { success: false, error: 'Failed to clear table status. Please try again.' }
    }

    revalidatePath('/dashboard/tables')
    revalidatePath('/dashboard') // Owner dashboard metric card updates

    return { success: true, data: updatedTable as TableRow }
  } catch (err) {
    console.error('[MenuQR] clearTableStatus error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 8 — deleteTable
// Permanently deletes a table row.
// More destructive than deactivate — cannot be undone.
// The printed QR code for this table will stop working
// because verifyTableOwnership will return false for
// a deleted table_id.
//
// SAFETY CHECKS (in order):
//   1. Must be inactive (not currently in service)
//   2. Must have no orders of any status ever
//      (ON DELETE RESTRICT from migrations/001_initial.sql
//       means Supabase will reject delete if orders exist)
//   3. Cleans up QR image from Storage
//
// Recommended flow: deactivate first, then delete
// after confirming no historical orders reference it.
// ============================================================
export async function deleteTable(
  tableId: string
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, table } = await verifyTableOwnership(tableId, user.id)
    if (!owned || !table) {
      return { success: false, error: 'Table not found or access denied' }
    }

    // Must be deactivated before deletion
    if (table.is_active) {
      return {
        success: false,
        error:
          'Deactivate the table before deleting it. ' +
          'This ensures no active orders are disrupted.',
      }
    }

    // Check for any orders (active OR historical) referencing this table
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('table_id', tableId)

    if ((orderCount ?? 0) > 0) {
      return {
        success: false,
        error:
          `Cannot delete — this table has ${orderCount} order(s) in history. ` +
          'Keep it deactivated to preserve order records.',
      }
    }

    // Delete the table row
    const { error: deleteError } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId)

    if (deleteError) {
      // ON DELETE RESTRICT from orders FK — shouldn't reach here
      // after our count check, but handle gracefully
      if (deleteError.code === '23503') {
        return {
          success: false,
          error: 'Cannot delete — table is referenced by existing orders.',
        }
      }
      console.error('[MenuQR] deleteTable error:', deleteError)
      return { success: false, error: 'Failed to delete table. Please try again.' }
    }

    // Clean up QR code image from Storage
    // Path: qr-codes/{restaurantId}/{tableId}.png
    // Matches the path written by generate-qr/route.ts
    try {
      await supabase.storage
        .from('qr-codes')
        .remove([`${table.restaurant_id}/${tableId}.png`])
    } catch {
      // Non-critical — orphaned image is acceptable
      // Storage cleanup can be done manually if needed
    }

    revalidatePath('/dashboard/tables')

    return { success: true, data: { deletedId: tableId } }
  } catch (err) {
    console.error('[MenuQR] deleteTable error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

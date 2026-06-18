/**
 * ============================================================
 * MENUQR — STAFF SERVER ACTIONS
 * File: src/actions/staff.ts
 *
 * All server actions for staff management in the owner
 * dashboard (/dashboard/staff). Handles creating staff
 * accounts, updating roles, changing PINs, and deactivating
 * staff members.
 *
 * CRITICAL CONNECTION — verify-pin/route.ts:
 *   This file CREATES the pin_hash that verify-pin reads.
 *   Both files use bcryptjs with the same salt rounds (10).
 *   If this file changes the hashing approach, verify-pin
 *   must change too — they share a contract on pin_hash format.
 *
 * CRITICAL CONNECTION — update-order-status/route.ts:
 *   verifyStaffSession() in update-order-status checks
 *   staff.is_active = true on every kitchen action.
 *   deactivateStaff() sets is_active = false — this
 *   immediately blocks the deactivated staff from updating
 *   order statuses even if they still have a valid PIN session
 *   in localStorage (sessions are 12 hours but DB check
 *   happens on every action).
 *
 * ACTIONS IN THIS FILE:
 *   1. getStaffList()       — All staff for restaurant
 *   2. addStaff()           — Create new staff with PIN
 *   3. updateStaff()        — Edit name, role, phone
 *   4. changeStaffPin()     — Reset PIN for a staff member
 *   5. deactivateStaff()    — Soft-delete (is_active=false)
 *   6. reactivateStaff()    — Restore deactivated staff
 *   7. verifyCurrentPin()   — Owner confirms old PIN before reset
 *
 * PIN SECURITY MODEL:
 *   - 4-digit numeric PIN (0000–9999)
 *   - Hashed with bcrypt (10 salt rounds) before storage
 *   - Plain PIN never stored anywhere in the system
 *   - Owner sets/resets PINs — staff cannot change own PIN
 *   - verify-pin/route.ts handles the bcrypt.compare() check
 *   - Rate limiting on verify-pin prevents brute force
 *
 * CONNECTS TO:
 *  ← /dashboard/staff page calls all actions
 *  → verify-pin/route.ts (reads pin_hash we create here)
 *  → update-order-status/route.ts (checks is_active we set)
 *  → lib/supabase.ts (createServerSupabase + createAdminSupabase)
 *  → types/database.ts (Staff, StaffInsert, StaffRole)
 *  → migrations/001_initial.sql (staff table schema,
 *    idx_staff_active index used by verifyStaffSession)
 * ============================================================
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import type { Staff, StaffInsert, StaffRole, KitchenSession } from '@/types/database'
import { getLimit } from '@/config/plans'

// ─────────────────────────────────────────────
// BCRYPT SALT ROUNDS
// MUST match the rounds used in verify-pin/route.ts.
// 10 rounds = ~100ms hash time — fast enough for
// PIN creation, slow enough to deter brute force.
// Do NOT change without updating verify-pin too.
// ─────────────────────────────────────────────
const BCRYPT_SALT_ROUNDS = 10

// ─────────────────────────────────────────────
// SAFE STAFF TYPE
// Staff row with pin_hash removed — safe to return
// to the frontend. pin_hash must never leave the server.
// ─────────────────────────────────────────────
export type SafeStaff = Omit<Staff, 'pin_hash'>

// ─────────────────────────────────────────────
// ACTION RESULT — consistent with other action files
// ─────────────────────────────────────────────
type ActionResult<T = SafeStaff> =
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
// HELPER — Verify staff belongs to owner's restaurant
// Used by update/delete actions — prevents an owner
// from modifying staff of a different restaurant.
// ─────────────────────────────────────────────
async function verifyStaffOwnership(
  staffId: string,
  ownerId: string
): Promise<{ owned: boolean; restaurantId: string | null }> {
  const supabase = createAdminSupabase()

  const { data } = await supabase
    .from('staff')
    .select('id, restaurant_id, restaurants!inner(owner_id)')
    .eq('id', staffId)
    .single()

  if (!data) return { owned: false, restaurantId: null }

  const ownerIdFromDB = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).restaurants as unknown as { owner_id: string }
  ).owner_id

  return {
    owned: ownerIdFromDB === ownerId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    restaurantId: (data as any).restaurant_id,
  }
}

// ─────────────────────────────────────────────
// HELPER — Hash a PIN
// Creates a bcrypt hash from the 4-digit PIN string.
// verify-pin/route.ts uses bcrypt.compare() against
// this hash — same library, same rounds = compatible.
// ─────────────────────────────────────────────
async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_SALT_ROUNDS)
}

// ─────────────────────────────────────────────
// HELPER — Strip pin_hash from staff row
// Used before returning any Staff data to ensure
// the hashed PIN never reaches the browser.
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// PIN VALIDATION SCHEMA
// Reused across addStaff and changeStaffPin.
// Exactly 4 digits — no letters, no special chars.
// Leading zeros allowed: "0042" is valid.
// ─────────────────────────────────────────────
const PinSchema = z
  .string()
  .length(6, 'PIN must be exactly 6 digits')
  .regex(/^\d{6}$/, 'PIN must contain only digits')

// ─────────────────────────────────────────────
// VALID STAFF ROLES
// 'owner' is excluded — owners use Supabase Auth,
// not PIN login. This matches the redirectMap in
// verify-pin/route.ts which handles 'owner' as an
// edge case but should never be set this way.
// ─────────────────────────────────────────────
const ASSIGNABLE_ROLES = ['servant', 'cook', 'juice_maker', 'cashier', 'chef', 'juice', 'server'] as const

// ============================================================
// ACTION 1 — getStaffList
// Fetches all staff for the restaurant.
// Returns SafeStaff[] — pin_hash stripped.
// Includes inactive staff so owner can reactivate them.
// ============================================================
export async function getStaffList(
  restaurantId: string
): Promise<ActionResult<SafeStaff[]>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    // Verify restaurant ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // Fetch all staff — active AND inactive
    // Owner dashboard shows all so deactivated staff can be restored
    const { data: staffList, error } = await supabase
      .from('staff')
      .select('id, restaurant_id, user_id, name, role, phone, email, is_active, status, invite_token, last_login, created_at')
      .eq('restaurant_id', restaurantId)
      .order('is_active', { ascending: false }) // Active staff first
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[MenuQR] getStaffList error:', error)
      return { success: false, error: 'Failed to fetch staff list' }
    }

    // pin_hash is not selected above — already safe
    // but use toSafeStaff pattern for explicit clarity
    const safeList = (staffList ?? []) as unknown as SafeStaff[]

    return { success: true, data: safeList }
  } catch (err) {
    console.error('[MenuQR] getStaffList error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 2 — addStaff
// Creates a new staff account with a PIN.
// Called by the "Invite staff" dialog in the dashboard.
//
// PIN HASHING:
//   The raw 4-digit PIN from the form is hashed here with
//   bcrypt before being saved. The owner sees the PIN once
//   (in the success response to share with the staff member)
//   then it's gone — only the hash is stored.
//
// PIN UNIQUENESS CHECK:
//   We check that no other active staff at this restaurant
//   already uses the same PIN. Two staff with the same PIN
//   would be ambiguous in verify-pin — both would match.
//   The check is done by hashing all existing PINs... which
//   we can't do (bcrypt is one-way). Instead we enforce
//   uniqueness at the application level by fetching all
//   hashes and running bcrypt.compare() against the new PIN.
//   This is the same approach verify-pin uses for login.
// ============================================================
const AddStaffSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(ASSIGNABLE_ROLES),
  phone: z.string().max(15).optional(),
  email: z.string().email().optional(),
})

export async function addStaff(
  input: z.infer<typeof AddStaffSchema>
): Promise<ActionResult<SafeStaff & { plainPin: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = AddStaffSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { restaurantId, name, role, phone, email } = parsed.data
    
    // Auto-generate 6 digit PIN securely
    const pin = (crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000).toString()

    // Verify restaurant ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, current_plan, sub_status, trial_end_date')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // ── PLAN GATE: staff count limit ──────────────
    const maxStaff = getLimit(restaurant, 'staffAccounts')

    if (maxStaff !== Infinity) {
      const { count: currentCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)

      if ((currentCount ?? 0) >= maxStaff) {
        return {
          success: false,
          error: `You have reached your staff account limit for your current plan.`,
        }
      }
    }

    // ── PIN UNIQUENESS CHECK ──────────────────────
    // Fetch all active staff hashes and compare new PIN
    // against each — prevents duplicate PINs at this restaurant
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('pin_hash')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)

    if (existingStaff && existingStaff.length > 0) {
      const pinConflicts = await Promise.all(
        existingStaff.map((s) => bcrypt.compare(pin, s.pin_hash))
      )
      if (pinConflicts.some(Boolean)) {
        return {
          success: false,
          error:
            'This PIN is already used by another staff member. Choose a different PIN.',
        }
      }
    }

    // Hash the PIN before storing
    const pinHash = await hashPin(pin)

    // Build insert row — matches StaffInsert type exactly
    const insertRow: StaffInsert = {
      restaurant_id: restaurantId,
      user_id: null,         // PIN-only staff — no Supabase Auth account
      name,
      role: role as StaffRole,
      pin_hash: pinHash,
      phone: phone ?? null,
      email: email ?? null,
      is_active: true,
      status: 'active',
      invite_token: crypto.randomUUID(),
      last_login: null,
    }

    const { data: staff, error: insertError } = await supabase
      .from('staff')
      .insert(insertRow)
      .select('id, restaurant_id, user_id, name, role, phone, email, is_active, status, invite_token, last_login, created_at')
      .single()

    if (insertError || !staff) {
      console.error('[MenuQR] addStaff insert error:', insertError)
      return { success: false, error: 'Failed to create staff account. Please try again.' }
    }

    revalidatePath('/dashboard/staff')

    // Return SafeStaff + plainPin so owner can tell the staff member
    // their PIN. This is the ONLY time the plain PIN is returned.
    // After this it is unrecoverable — only the hash is stored.
    return {
      success: true,
      data: {
        ...(staff as unknown as SafeStaff),
        plainPin: pin, // One-time disclosure — store safely or share immediately
      },
    }
  } catch (err) {
    console.error('[MenuQR] addStaff error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 3 — updateStaff
// Edit a staff member's name, role, phone, or email.
// Does NOT change the PIN — use changeStaffPin for that.
// Role change takes effect immediately — next kitchen
// action from this staff member will use the new role
// (their localStorage session still shows old role until
// they re-enter their PIN, which is expected behaviour).
// ============================================================
const UpdateStaffSchema = z.object({
  staffId: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  phone: z.string().max(15).optional().nullable(),
  email: z.string().email().optional().nullable(),
})

export async function updateStaff(
  input: z.infer<typeof UpdateStaffSchema>
): Promise<ActionResult<SafeStaff>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = UpdateStaffSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { staffId, name, role, phone, email } = parsed.data

    const { owned } = await verifyStaffOwnership(staffId, user.id)
    if (!owned) {
      return { success: false, error: 'Staff member not found or access denied' }
    }

    // Build partial update — only include provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (role !== undefined) updates.role = role
    if (phone !== undefined) updates.phone = phone
    if (email !== undefined) updates.email = email

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No changes to save' }
    }

    const { data: staff, error: updateError } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', staffId)
      .select('id, restaurant_id, user_id, name, role, phone, email, is_active, status, invite_token, last_login, created_at')
      .single()

    if (updateError || !staff) {
      console.error('[MenuQR] updateStaff error:', updateError)
      return { success: false, error: 'Failed to update staff. Please try again.' }
    }

    revalidatePath('/dashboard/staff')

    return { success: true, data: staff as unknown as SafeStaff }
  } catch (err) {
    console.error('[MenuQR] updateStaff error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 4 — changeStaffPin
// Resets a staff member's PIN.
// Owner sets the new PIN — staff cannot change their own.
//
// UNIQUENESS CHECK:
//   Same as addStaff — checks new PIN against all other
//   active staff hashes. Excludes the staff member whose
//   PIN is being changed (they can reuse their own PIN).
//
// Returns plainPin once — owner must share it with staff.
// ============================================================
const ResetStaffPinSchema = z.object({
  staffId: z.string().uuid(),
})

export async function resetStaffPin(
  input: z.infer<typeof ResetStaffPinSchema>
): Promise<ActionResult<{ staffId: string; plainPin: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = ResetStaffPinSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { staffId } = parsed.data
    
    // Auto-generate 6 digit PIN securely
    const newPin = (crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000).toString()

    const { owned, restaurantId } = await verifyStaffOwnership(staffId, user.id)
    if (!owned || !restaurantId) {
      return { success: false, error: 'Staff member not found or access denied' }
    }

    // PIN uniqueness check — exclude this staff member's own hash
    const { data: otherStaff } = await supabase
      .from('staff')
      .select('id, pin_hash')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .neq('id', staffId) // Exclude the staff being updated

    if (otherStaff && otherStaff.length > 0) {
      const pinConflicts = await Promise.all(
        otherStaff.map((s) => bcrypt.compare(newPin, s.pin_hash))
      )
      if (pinConflicts.some(Boolean)) {
        return {
          success: false,
          error: 'This PIN is already used by another staff member. Choose a different PIN.',
        }
      }
    }

    // Hash and save new PIN
    const newPinHash = await hashPin(newPin)

    const { error: updateError } = await supabase
      .from('staff')
      .update({ pin_hash: newPinHash })
      .eq('id', staffId)

    if (updateError) {
      console.error('[MenuQR] resetStaffPin error:', updateError)
      return { success: false, error: 'Failed to update PIN. Please try again.' }
    }

    revalidatePath('/dashboard/staff')

    // Return new plain PIN once — owner shares with staff
    // Existing kitchen session (localStorage) remains valid
    // until it expires (12 hours) — PIN change does not
    // immediately invalidate active sessions by design
    // (to avoid mid-shift logout of a working chef)
    return {
      success: true,
      data: { staffId, plainPin: newPin },
    }
  } catch (err) {
    console.error('[MenuQR] resetStaffPin error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 5 — deactivateStaff
// Soft-deletes a staff member (is_active = false).
//
// IMMEDIATE EFFECT on update-order-status/route.ts:
//   verifyStaffSession() checks is_active = true on EVERY
//   kitchen action. Setting is_active = false immediately
//   blocks this staff member from updating order statuses
//   even if their localStorage session hasn't expired yet.
//
// The staff record is NOT deleted — preserved for order
// history (order_items may reference this staff's actions)
// and can be reactivated later via reactivateStaff().
// ============================================================
export async function deactivateStaff(
  staffId: string
): Promise<ActionResult<{ deactivatedId: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned } = await verifyStaffOwnership(staffId, user.id)
    if (!owned) {
      return { success: false, error: 'Staff member not found or access denied' }
    }

    // Prevent deactivating the owner role
    // (safety net — owners should not have PIN staff accounts)
    const { data: staffMember } = await supabase
      .from('staff')
      .select('role, status')
      .eq('id', staffId)
      .single()

    if (staffMember?.role === 'owner') {
      return {
        success: false,
        error: 'Cannot deactivate owner role staff accounts',
      }
    }

    if (staffMember?.status === 'disabled') {
      return { success: false, error: 'Staff member is already disabled' }
    }

    const { error: updateError } = await supabase
      .from('staff')
      .update({ status: 'disabled', is_active: false })
      .eq('id', staffId)

    if (updateError) {
      console.error('[MenuQR] deactivateStaff error:', updateError)
      return { success: false, error: 'Failed to deactivate staff. Please try again.' }
    }

    revalidatePath('/dashboard/staff')

    return { success: true, data: { deactivatedId: staffId } }
  } catch (err) {
    console.error('[MenuQR] deactivateStaff error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 5.5 — deleteStaff
// Hard-deletes a staff member.
// Will fail if there are foreign key constraints (e.g. order items).
// ============================================================
export async function deleteStaff(
  staffId: string
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned } = await verifyStaffOwnership(staffId, user.id)
    if (!owned) {
      return { success: false, error: 'Staff member not found or access denied' }
    }

    const { data: staffMember } = await supabase
      .from('staff')
      .select('role')
      .eq('id', staffId)
      .single()

    if (staffMember?.role === 'owner') {
      return {
        success: false,
        error: 'Cannot delete owner role staff accounts',
      }
    }

    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (deleteError) {
      console.error('[MenuQR] deleteStaff error:', deleteError)
      if (deleteError.code === '23503') { // Foreign key violation
        return { success: false, error: 'Cannot delete staff who have processed orders. Please disable them instead.' }
      }
      return { success: false, error: 'Failed to delete staff. Please try again.' }
    }

    revalidatePath('/dashboard/staff')

    return { success: true, data: { deletedId: staffId } }
  } catch (err) {
    console.error('[MenuQR] deleteStaff error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 6 — reactivateStaff
// Restores a previously deactivated staff member.
// Checks plan limits before reactivating — if the owner
// downgraded their plan while staff was inactive, they may
// not have capacity to reactivate.
// ============================================================
export async function reactivateStaff(
  staffId: string
): Promise<ActionResult<SafeStaff>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, restaurantId } = await verifyStaffOwnership(staffId, user.id)
    if (!owned || !restaurantId) {
      return { success: false, error: 'Staff member not found or access denied' }
    }

    // Check staff is currently inactive
    const { data: staffMember } = await supabase
      .from('staff')
      .select('status')
      .eq('id', staffId)
      .single()

    if (staffMember?.status === 'active') {
      return { success: false, error: 'Staff member is already active' }
    }

    // Check plan limit before reactivating
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('current_plan, sub_status, trial_end_date')
      .eq('id', restaurantId)
      .single()

    const maxStaff = restaurant ? getLimit(restaurant, 'staffAccounts') : 0

    if (maxStaff !== Infinity) {
      const { count: activeCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)

      if ((activeCount ?? 0) >= maxStaff) {
        return {
          success: false,
          error: `You have reached your staff account limit for your current plan.`,
        }
      }
    }

    const { data: staff, error: updateError } = await supabase
      .from('staff')
      .update({ status: 'active', is_active: true })
      .eq('id', staffId)
      .select('id, restaurant_id, user_id, name, role, phone, email, is_active, status, invite_token, last_login, created_at')
      .single()

    if (updateError || !staff) {
      console.error('[MenuQR] reactivateStaff error:', updateError)
      return { success: false, error: 'Failed to reactivate staff. Please try again.' }
    }

    revalidatePath('/dashboard/staff')

    return { success: true, data: staff as unknown as SafeStaff }
  } catch (err) {
    console.error('[MenuQR] reactivateStaff error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 7 — verifyCurrentPin
// Owner-facing: confirms that a given PIN matches a staff
// member before showing the "Change PIN" form.
// Provides a UX safety gate — owner must prove they know
// the current PIN before being allowed to change it.
// Uses same bcrypt.compare() as verify-pin/route.ts.
// ============================================================
const VerifyCurrentPinSchema = z.object({
  staffId: z.string().uuid(),
  currentPin: PinSchema,
})

export async function verifyCurrentPin(
  input: z.infer<typeof VerifyCurrentPinSchema>
): Promise<ActionResult<{ matches: boolean }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = VerifyCurrentPinSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid PIN format' }
    }

    const { staffId, currentPin } = parsed.data

    const { owned } = await verifyStaffOwnership(staffId, user.id)
    if (!owned) {
      return { success: false, error: 'Staff member not found or access denied' }
    }

    // Fetch the hash — needed for comparison
    const { data: staffMember } = await supabase
      .from('staff')
      .select('pin_hash')
      .eq('id', staffId)
      .single()

    if (!staffMember) {
      return { success: false, error: 'Staff member not found' }
    }

    // Same comparison as verify-pin/route.ts
    const matches = await bcrypt.compare(currentPin, staffMember.pin_hash)

    // Never reveal the hash — just the boolean result
    return { success: true, data: { matches } }
  } catch (err) {
    console.error('[MenuQR] verifyCurrentPin error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 8 — loginStaff
// Staff login via Email and PIN (Frontend calls PIN password).
// Looks up staff by email, verifies PIN, and returns session.
// ============================================================
// ─────────────────────────────────────────────
// HELPER — Record last login timestamp
// ─────────────────────────────────────────────
function recordLastLogin(staffId: string, fingerprint: string): void {
  const supabase = createAdminSupabase()
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  supabase
    .from('staff')
    .update({ 
      last_login: new Date().toISOString(),
      session_expires_at: expiresAt,
      session_fingerprint: fingerprint
    })
    .eq('id', staffId)
    .then(({ error }) => {
      if (error) {
        console.warn('[MenuQR PIN] last_login update failed:', error)
      }
    })
}

const LoginStaffSchema = z.object({
  phone: z.string().min(5, 'Invalid phone number'),
  pin: z.string().min(4, 'PIN must be at least 4 digits'),
})

export async function loginStaff(
  input: z.infer<typeof LoginStaffSchema>
): Promise<ActionResult<KitchenSession & { redirectTo: string }>> {
  try {
    const supabase = createAdminSupabase()

    const parsed = LoginStaffSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid email or PIN format' }
    }

    const { phone, pin } = parsed.data;
    const cleanPhone = phone.trim().replace(/^\\+91|^0/, '').replace(/\\s+/g, '');
    
    // 1. Find staff by phone (handle optional +91 prefix)
    const { data: staffList, error } = await supabase
      .from('staff')
      .select('id, name, role, pin_hash, restaurant_id, status, phone')
      .ilike('phone', `%${cleanPhone}%`)

    if (error || !staffList || staffList.length === 0) {
      return { success: false, error: 'Invalid phone or PIN' }
    }

    // Since a phone number might exist in multiple restaurants, we check PIN against all active matches
    const activeStaffList = staffList.filter(s => s.status === 'active')
    
    if (activeStaffList.length === 0) {
      return { success: false, error: 'Account is deactivated' }
    }

    // 2. Verify PIN
    let matchedStaff = null;
    for (const staff of activeStaffList) {
      const isMatch = await bcrypt.compare(pin, staff.pin_hash)
      if (isMatch) {
        matchedStaff = staff;
        break;
      }
    }
    
    if (!matchedStaff) {
      return { success: false, error: 'Invalid phone or PIN' }
    }

    const activeStaff = matchedStaff;

    // 3. Record last login and session
    const fingerprint = globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    recordLastLogin(activeStaff.id, fingerprint)

    // 4. Determine redirect
    let redirectTo = '/staff'
    if (activeStaff.role === 'cook' || activeStaff.role === 'chef') redirectTo = '/cook-dashboard'
    if (activeStaff.role === 'juice_maker' || activeStaff.role === 'juice') redirectTo = '/juice-dashboard'
    if (activeStaff.role === 'servant') redirectTo = '/servant-dashboard'
    if (activeStaff.role === 'cashier') redirectTo = '/cashier-dashboard'
    if (activeStaff.role === 'server') redirectTo = '/server-dashboard'
    
    const session: KitchenSession & { fingerprint: string } = {
      staffId: activeStaff.id,
      role: activeStaff.role as StaffRole,
      name: activeStaff.name,
      restaurantId: activeStaff.restaurant_id,
      expiry: Date.now() + 12 * 60 * 60 * 1000,
      fingerprint,
    }

    return { 
      success: true, 
      data: { 
        ...session,
        redirectTo 
      } 
    }
  } catch (err) {
    console.error('[MenuQR] loginStaff error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

export async function toggleMenuItemStock(
  itemId: string,
  isOutOfStock: boolean,
  staffId: string,
  restaurantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminSupabase();

    // Verify staff exists and is active for this restaurant
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, status, is_active')
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (staffError || !staffData || (staffData.status !== 'active' && !staffData.is_active)) {
      return { success: false, error: 'Unauthorized staff session' };
    }

    const { error } = await supabase
      .from('menu_items')
      .update({ 
        is_out_of_stock: isOutOfStock,
        out_of_stock_by: staffId,
        out_of_stock_at: isOutOfStock ? new Date().toISOString() : null
      })
      .eq('id', itemId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error("[staff] Error updating availability:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/shop/${restaurantId}`);
    revalidatePath(`/staff/stock`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update item availability" };
  }
}

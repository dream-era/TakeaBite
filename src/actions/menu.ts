/**
 * ============================================================
 * MENUQR — MENU SERVER ACTIONS
 * File: src/actions/menu.ts
 *
 * All server actions for the owner's menu manager.
 * Handles every operation an owner can perform on their
 * menu — adding, editing, deleting, toggling, reordering,
 * and uploading item images.
 *
 * ACTIONS IN THIS FILE:
 *   1. addMenuItem()          — Add a new item to the menu
 *   2. updateMenuItem()       — Edit an existing item
 *   3. deleteMenuItem()       — Delete an item permanently
 *   4. toggleItemAvailability() — Quick on/off toggle
 *   5. reorderMenuItems()     — Drag-and-drop reorder
 *   6. uploadMenuItemImage()  — Upload item photo
 *   7. getMenuItems()         — Fetch all items for manager
 *   8. bulkUpdateCategory()   — Rename a category across items
 *
 * CRITICAL CONNECTION — create-order/route.ts:
 *   When a customer places an order, create-order fetches
 *   menu items from the DB to verify prices and availability.
 *   Any item with is_available=false is rejected at order time.
 *   deleteMenuItem() checks for active orders containing the
 *   item before deleting — prevents orphaned order_items.
 *
 * PLAN GATE — authStore.canAddMoreItems:
 *   Basic plan: max 50 items total.
 *   addMenuItem() counts existing items and blocks if limit
 *   is reached. The component checks permissions.canAddMoreItems
 *   before showing the Add button — this is the server-side guard.
 *
 * IMAGE STORAGE:
 *   Path: restaurant-assets/{restaurantId}/items/{itemId}.{ext}
 *   Same bucket as restaurant logo (restaurant-assets).
 *   generate-qr uses qr-codes bucket — different bucket, no conflict.
 *
 * CONNECTS TO:
 *  ← Menu Manager page (/dashboard/menu) calls all actions
 *  ← Customer ordering page reads items via getMenuByRestaurantId()
 *    in supabase.ts — our writes must keep that query working
 *  → lib/supabase.ts (createServerSupabase auth,
 *                     createAdminSupabase for writes)
 *  → types/database.ts (MenuItem, MenuItemInsert, Station)
 *  → migrations/001_initial.sql (menu_items table schema)
 *  → create-order/route.ts (reads price + is_available per item)
 *  → useRealtime.ts (order_items join menu_items — name/station
 *    must always be present for active order_items)
 *  → authStore.ts (canAddMoreItems permission gate)
 *  → actions/restaurant.ts (same ActionResult pattern + bucket)
 * ============================================================
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import type { MenuItem, MenuItemInsert, Station, MenuCategory } from '@/types/database'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ASSETS_BUCKET = 'restaurant-assets'
const BASIC_PLAN_MAX_ITEMS = 50

// ─────────────────────────────────────────────
// ACTION RESULT — mirrors restaurant.ts pattern
// Consistent across all action files so components
// handle errors the same way everywhere.
// ─────────────────────────────────────────────
type ActionResult<T = MenuItem> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─────────────────────────────────────────────
// HELPER — Get authenticated owner
// Identical to restaurant.ts — every action
// must verify auth before touching the DB.
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
// HELPER — Verify item belongs to owner's restaurant
// Used by update/delete actions — ensures an owner
// cannot edit another restaurant's menu items even
// if they somehow obtain the item UUID.
// ─────────────────────────────────────────────
async function verifyItemOwnership(
  itemId: string,
  ownerId: string
): Promise<{ owned: boolean; restaurantId: string | null }> {
  const supabase = createAdminSupabase()

  const { data } = await supabase
    .from('menu_items')
    .select('id, restaurant_id, restaurants!inner(owner_id)')
    // @ts-expect-error - Bypass complex supabase join inference
    .eq('id', itemId)
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
// HELPER — Count current items for plan gate
// Returns how many items the restaurant currently has.
// Compared against BASIC_PLAN_MAX_ITEMS in addMenuItem.
// ─────────────────────────────────────────────
async function countMenuItems(restaurantId: string): Promise<number> {
  const supabase = createAdminSupabase()
  const { count } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
  return count ?? 0
}



// ─────────────────────────────────────────────
// SHARED ZOD SCHEMA — menu item fields
// Used by both addMenuItem and updateMenuItem.
// Price: positive number, max ₹9999 (reasonable limit)
// Station: must match Station type from database.ts
// ─────────────────────────────────────────────
const MenuItemFieldsSchema = z.object({
  name: z
    .string()
    .min(2, 'Item name must be at least 2 characters')
    .max(100, 'Item name too long'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category name too long'),
  price: z
    .number()
    .positive('Price must be positive')
    .max(9999, 'Price cannot exceed ₹9,999'),
  isVeg: z.boolean().default(true),
  description: z.string().max(300, 'Description too long').optional(),
  station: z.enum(['food', 'juice', 'both'] as const),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
})

// ============================================================
// ACTION 1 — addMenuItem
// Called by the "Add item" form in the menu manager.
// Enforces the 50-item plan limit for basic plan owners.
// Sets display_order to (max existing + 1) so new items
// appear at the bottom of their category by default.
// ============================================================
const AddMenuItemSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  ...MenuItemFieldsSchema.shape,
})

export async function addMenuItem(
  input: z.infer<typeof AddMenuItemSchema>
): Promise<ActionResult<MenuItem>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = AddMenuItemSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const {
      restaurantId,
      name,
      category,
      price,
      isVeg,
      description,
      station,
      isAvailable,
    } = parsed.data

    // Verify this restaurant belongs to the owner
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, plan, owner_id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // ── PLAN GATE ──────────────────────────────
    // Basic plan: max 50 items. Pro+: unlimited.
    // Server-side guard — even if frontend bypasses the UI lock.
    const isPro =
      restaurant.plan === 'pro' || restaurant.plan === 'enterprise'

    if (!isPro) {
      const currentCount = await countMenuItems(restaurantId)
      if (currentCount >= BASIC_PLAN_MAX_ITEMS) {
        return {
          success: false,
          error: `Basic plan limit reached (${BASIC_PLAN_MAX_ITEMS} items). Upgrade to Pro for unlimited items.`,
        }
      }
    }

    // Calculate display_order: place new item at end of its category
    // so it doesn't disrupt existing ordering
    const { data: lastItem } = await supabase
      .from('menu_items')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .eq('category', category)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextDisplayOrder = lastItem ? lastItem.display_order + 1 : 0

    // Build insert row — matches MenuItemInsert type exactly
    const insertRow: MenuItemInsert = {
      restaurant_id: restaurantId,
      name,
      category,
      price,
      image_url: null,  // Set later via uploadMenuItemImage
      is_veg: isVeg,
      description: description ?? null,
      station: station as Station,
      is_available: isAvailable,
      display_order: nextDisplayOrder,
    }

    // Ensure category exists in menu_categories table to satisfy fk_category constraint
    await supabase
      .from('menu_categories')
      .upsert({ restaurant_id: restaurantId, name: category }, { onConflict: 'restaurant_id,name', ignoreDuplicates: true })

    const { data: item, error: insertError } = await supabase
      .from('menu_items')
      .insert(insertRow)
      .select('*')
      .single()

    if (insertError || !item) {
      console.error('[MenuQR] addMenuItem insert error:', insertError)
      return { success: false, error: 'Failed to add item. Please try again.' }
    }

    // Revalidate customer ordering page for this restaurant
    // so the new item appears immediately for customers
    revalidatePath(`/order`)
    revalidatePath('/dashboard/menu')

    return { success: true, data: item as MenuItem }
  } catch (err) {
    console.error('[MenuQR] addMenuItem error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 2 — updateMenuItem
// Called by the edit item drawer in the menu manager.
// Supports partial updates — only changed fields are written.
// CRITICAL: price changes take effect immediately for new orders.
// Existing confirmed/preparing orders are NOT affected
// (order_items.price is locked at order time in create-order).
// ============================================================
const UpdateMenuItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  name: z.string().min(2).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  price: z.number().positive().max(9999).optional(),
  isVeg: z.boolean().optional(),
  description: z.string().max(300).optional().nullable(),
  station: z.enum(['food', 'juice', 'both'] as const).optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export async function updateMenuItem(
  input: z.infer<typeof UpdateMenuItemSchema>
): Promise<ActionResult<MenuItem>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = UpdateMenuItemSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { itemId, ...fields } = parsed.data

    // Verify ownership
    const { owned, restaurantId } = await verifyItemOwnership(itemId, user.id)
    if (!owned) {
      return { success: false, error: 'Item not found or access denied' }
    }

    // Build partial update object — only include provided fields
    const updates: Record<string, unknown> = {}
    if (fields.name !== undefined) updates.name = fields.name
    if (fields.category !== undefined) updates.category = fields.category
    if (fields.price !== undefined) updates.price = fields.price
    if (fields.isVeg !== undefined) updates.is_veg = fields.isVeg
    if (fields.description !== undefined)
      updates.description = fields.description
    if (fields.station !== undefined) updates.station = fields.station
    if (fields.isAvailable !== undefined)
      updates.is_available = fields.isAvailable
    if (fields.displayOrder !== undefined)
      updates.display_order = fields.displayOrder

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No changes to save' }
    }

    if (updates.category && restaurantId) {
      await supabase
        .from('menu_categories')
        .upsert({ restaurant_id: restaurantId, name: updates.category as string }, { onConflict: 'restaurant_id,name', ignoreDuplicates: true })
    }

    const { data: item, error: updateError } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', itemId)
      .select('*')
      .single()

    if (updateError || !item) {
      console.error('[MenuQR] updateMenuItem error:', updateError)
      return {
        success: false,
        error: 'Failed to update item. Please try again.',
      }
    }

    revalidatePath('/order')
    revalidatePath('/dashboard/menu')

    return { success: true, data: item as MenuItem }
  } catch (err) {
    console.error('[MenuQR] updateMenuItem error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 3 — deleteMenuItem
// Permanently deletes a menu item.
// SAFETY CHECK: Blocks deletion if the item exists in any
// active order (status not in served/cancelled).
// This protects useRealtime.ts — kitchen displays join
// order_items → menu_items for item names. A deleted item
// would show null names on the kitchen board.
// ============================================================
export async function deleteMenuItem(
  itemId: string
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    // Verify ownership
    const { owned } = await verifyItemOwnership(itemId, user.id)
    if (!owned) {
      return { success: false, error: 'Item not found or access denied' }
    }

    // Safety check: is this item in any active order?
    // Joins order_items → orders to check order status.
    // References: create-order inserts order_items with menu_item_id,
    //             useRealtime joins menu_items for display names.
    const { data: activeOrderItems } = await supabase
      .from('order_items')
      .select('id, orders!inner(status)')
      // @ts-expect-error - Bypass complex supabase join inference
      .eq('menu_item_id', itemId)
      .not('orders.status', 'in', '("served","cancelled")')
      .limit(1)

    if (activeOrderItems && activeOrderItems.length > 0) {
      return {
        success: false,
        error:
          'Cannot delete — this item is part of an active order. ' +
          'Mark it unavailable instead, then delete after the order is served.',
      }
    }

    // Delete the item (CASCADE removes orphaned order_items in
    // completed orders via ON DELETE RESTRICT — we checked above)
    // Note: migration uses ON DELETE RESTRICT for menu_item_id FK
    // so we must manually delete after confirming no active orders
    const { error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      // FK constraint fired — item is still in an active order
      if (deleteError.code === '23503') {
        return {
          success: false,
          error:
            'Cannot delete — this item is referenced by existing orders. ' +
            'Toggle it unavailable to hide it from customers.',
        }
      }
      console.error('[MenuQR] deleteMenuItem error:', deleteError)
      return {
        success: false,
        error: 'Failed to delete item. Please try again.',
      }
    }

    // Also delete the image from Storage if it exists
    // Path: restaurant-assets/{restaurantId}/items/{itemId}.*
    // Best-effort — don't fail the action if image delete fails
    try {
      const { data: files } = await supabase.storage
        .from(ASSETS_BUCKET)
        .list(`items`, { search: itemId })

      if (files && files.length > 0) {
        await supabase.storage
          .from(ASSETS_BUCKET)
          .remove(files.map((f) => `items/${f.name}`))
      }
    } catch {
      // Non-critical — orphaned image is acceptable
    }

    revalidatePath('/order')
    revalidatePath('/dashboard/menu')

    return { success: true, data: { deletedId: itemId } }
  } catch (err) {
    console.error('[MenuQR] deleteMenuItem error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 4 — toggleItemAvailability
// The quick toggle switch on each item card.
// Most common action in the menu manager — owners
// toggle items during service (e.g. "sold out today").
// Optimistic update in the UI, confirmed here server-side.
// IMPACT: create-order/route.ts rejects orders containing
// unavailable items — so toggling off stops new orders instantly.
// ============================================================
export async function toggleItemAvailability(
  itemId: string,
  isAvailable: boolean
): Promise<ActionResult<{ id: string; is_available: boolean }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned } = await verifyItemOwnership(itemId, user.id)
    if (!owned) {
      return { success: false, error: 'Item not found or access denied' }
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId)
      .select('id, is_available')
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to update availability. Please try again.',
      }
    }

    // Revalidate customer ordering page — unavailable items
    // are filtered out by getMenuByRestaurantId(onlyAvailable=true)
    revalidatePath('/order')
    revalidatePath('/dashboard/menu')

    return { success: true, data: { id: data.id, is_available: data.is_available } }
  } catch (err) {
    console.error('[MenuQR] toggleItemAvailability error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 5 — reorderMenuItems
// Called after drag-and-drop reordering in the menu manager.
// Receives an ordered array of item IDs and writes new
// display_order values (0, 1, 2...) back to the DB.
// getMenuByRestaurantId orders by display_order ASC —
// so this directly controls customer-facing menu order.
// ============================================================
const ReorderSchema = z.object({
  restaurantId: z.string().uuid(),
  // Array of item IDs in the new display order
  orderedItemIds: z.array(z.string().uuid()).min(1),
})

export async function reorderMenuItems(
  input: z.infer<typeof ReorderSchema>
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = ReorderSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }

    const { restaurantId, orderedItemIds } = parsed.data

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

    // Update each item's display_order in parallel
    // Each item gets its array index as its new display_order
    const updatePromises = orderedItemIds.map((itemId, index) =>
      supabase
        .from('menu_items')
        .update({ display_order: index })
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId) // Extra safety — ensure item belongs here
    )

    const results = await Promise.all(updatePromises)

    // Check for any failures
    const failures = results.filter((r) => r.error)
    if (failures.length > 0) {
      console.error('[MenuQR] reorderMenuItems partial failure:', failures)
      return {
        success: false,
        error: `${failures.length} items failed to reorder. Please try again.`,
      }
    }

    revalidatePath('/order')
    revalidatePath('/dashboard/menu')

    return { success: true, data: { updated: orderedItemIds.length } }
  } catch (err) {
    console.error('[MenuQR] reorderMenuItems error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 6 — uploadMenuItemImage
// Uploads a photo for a menu item and saves the URL.
// Path: restaurant-assets/{restaurantId}/items/{itemId}.{ext}
// Same bucket as restaurant logo — different sub-path.
// Returns updated MenuItem with image_url set.
// ============================================================
export async function uploadMenuItemImage(
  itemId: string,
  formData: FormData
): Promise<ActionResult<MenuItem>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, restaurantId } = await verifyItemOwnership(itemId, user.id)
    if (!owned || !restaurantId) {
      return { success: false, error: 'Item not found or access denied' }
    }

    const file = formData.get('image') as File | null
    if (!file) {
      return { success: false, error: 'No image file provided' }
    }

    // Validate: images only, max 1MB per item
    // (more permissive than logo — items may have many images)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Image must be PNG, JPEG, or WebP' }
    }
    if (file.size > 1 * 1024 * 1024) {
      return { success: false, error: 'Image must be under 1MB' }
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const filePath = `${restaurantId}/items/${itemId}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(ASSETS_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('[MenuQR] uploadMenuItemImage upload error:', uploadError)
      return { success: false, error: 'Failed to upload image. Please try again.' }
    }

    const { data: urlData } = supabase.storage
      .from(ASSETS_BUCKET)
      .getPublicUrl(filePath)

    // Save image URL to menu item
    const { data: item, error: updateError } = await supabase
      .from('menu_items')
      .update({ image_url: urlData.publicUrl })
      .eq('id', itemId)
      .select('*')
      .single()

    if (updateError || !item) {
      return {
        success: false,
        error: 'Image uploaded but failed to link. Please try again.',
      }
    }

    revalidatePath('/order')
    revalidatePath('/dashboard/menu')

    return { success: true, data: item as MenuItem }
  } catch (err) {
    console.error('[MenuQR] uploadMenuItemImage error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 7 — getMenuItems
// Fetches ALL menu items for the owner's menu manager —
// including unavailable ones (unlike getMenuByRestaurantId
// in supabase.ts which only returns available items).
// Returns items grouped by category for the tab UI.
// ============================================================
export async function getMenuItems(restaurantId: string): Promise<
  ActionResult<{
    items: MenuItem[]
    byCategory: Record<string, MenuItem[]>
    categories: string[]
    menuCategories: MenuCategory[]
    totalCount: number
  }>
> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    // Verify ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // Fetch ALL items (including unavailable) for the manager
    // Unlike getMenuByRestaurantId which only returns available ones
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      return { success: false, error: 'Failed to fetch menu items' }
    }

    const allItems = (items ?? []) as MenuItem[]

    // Group by category for the tab UI
    const byCategory: Record<string, MenuItem[]> = {}
    for (const item of allItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = []
      }
      byCategory[item.category].push(item)
    }

    // Ordered unique category list
    const categories = Object.keys(byCategory).sort()

    return {
      success: true,
      data: {
        items: allItems,
        byCategory,
        categories,
        totalCount: allItems.length,
      },
    }
  } catch (err) {
    console.error('[MenuQR] getMenuItems error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 8 — bulkUpdateCategory
// Renames a category across all items that use it.
// e.g. "Juices" → "Fresh Juices"
// Used by the "Rename category" option in the category tab
// context menu. Safer than renaming per-item because one
// call updates all items atomically.
// ============================================================
const BulkCategorySchema = z.object({
  restaurantId: z.string().uuid(),
  oldCategory: z.string().min(1).max(50),
  newCategory: z.string().min(1).max(50),
})

export async function bulkUpdateCategory(
  input: z.infer<typeof BulkCategorySchema>
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = BulkCategorySchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }

    const { restaurantId, oldCategory, newCategory } = parsed.data

    if (oldCategory === newCategory) {
      return { success: false, error: 'New category name is the same' }
    }

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

    // Bulk update all items in this category
    const { data: updated, error: updateError } = await supabase
      .from('menu_items')
      .update({ category: newCategory })
      .eq('restaurant_id', restaurantId)
      .eq('category', oldCategory)
      .select('id')

    if (updateError) {
      console.error('[MenuQR] bulkUpdateCategory error:', updateError)
      return {
        success: false,
        error: 'Failed to rename category. Please try again.',
      }
    }

    revalidatePath('/order')
    revalidatePath('/dashboard/menu')

    return {
      success: true,
      data: { updatedCount: updated?.length ?? 0 },
    }
  } catch (err) {
    console.error('[MenuQR] bulkUpdateCategory error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 9 — addCategory
// ============================================================
const AddCategorySchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(2).max(50),
  description: z.string().max(300).optional(),
  icon: z.string().optional(),
})

export async function addCategory(input: z.infer<typeof AddCategorySchema>) {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()
    const parsed = AddCategorySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid input' }
    
    const { restaurantId, name, description, icon } = parsed.data

    // Check ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()
    if (!restaurant) return { success: false, error: 'Denied' }

    // Display order calculation
    const { data: lastCat } = await supabase
      .from('menu_categories')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextDisplayOrder = lastCat ? lastCat.display_order + 1 : 0

    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name,
        description,
        icon,
        is_active: true,
        display_order: nextDisplayOrder
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Category name already exists' }
      return { success: false, error: 'Failed to create category' }
    }
    
    revalidatePath('/dashboard/menu')
    revalidatePath('/order')
    return { success: true, data }
  } catch (err) {
    return { success: false, error: 'Unexpected error' }
  }
}

// ============================================================
// ACTION 10 — updateCategory
// ============================================================
const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(300).optional(),
  icon: z.string().optional(),
})

export async function updateCategory(input: z.infer<typeof UpdateCategorySchema>) {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()
    const parsed = UpdateCategorySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    // verify ownership
    const { data: cat } = await supabase
      .from('menu_categories')
      .select('id, restaurant_id, name, restaurants!inner(owner_id)')
      // @ts-expect-error - bypass strict typing for complex join
      .eq('id', parsed.data.id)
      .single()

    if (!cat || (cat as any).restaurants?.owner_id !== user.id) {
      return { success: false, error: 'Access denied' }
    }

    // check if renaming
    if (parsed.data.name && parsed.data.name !== cat.name) {
      // Due to FK cascading, renaming it here automatically updates all menu_items!
    }

    const { data, error } = await supabase
      .from('menu_categories')
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        icon: parsed.data.icon,
      })
      .eq('id', parsed.data.id)
      .select('*')
      .single()

    if (error) return { success: false, error: 'Failed to update category' }
    
    revalidatePath('/dashboard/menu')
    revalidatePath('/order')
    return { success: true, data }
  } catch (err) {
    return { success: false, error: 'Unexpected error' }
  }
}

// ============================================================
// ACTION 11 — toggleCategoryStatus
// ============================================================
export async function toggleCategoryStatus(categoryId: string, isActive: boolean) {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()
    
    // Check ownership
    const { data: cat } = await supabase
      .from('menu_categories')
      .select('restaurant_id, restaurants!inner(owner_id)')
      // @ts-expect-error join
      .eq('id', categoryId)
      .single()
      
    if (!cat || (cat as any).restaurants?.owner_id !== user.id) return { success: false, error: 'Access denied' }

    const { error } = await supabase
      .from('menu_categories')
      .update({ is_active: isActive })
      .eq('id', categoryId)

    if (error) return { success: false, error: 'Failed to update' }
    
    revalidatePath('/dashboard/menu')
    revalidatePath('/order')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Unexpected error' }
  }
}

// ============================================================
// ACTION 12 — deleteCategory
// ============================================================
export async function deleteCategory(categoryId: string) {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()
    
    // Check ownership
    const { data: cat } = await supabase
      .from('menu_categories')
      .select('restaurant_id, restaurants!inner(owner_id)')
      // @ts-expect-error join
      .eq('id', categoryId)
      .single()
      
    if (!cat || (cat as any).restaurants?.owner_id !== user.id) return { success: false, error: 'Access denied' }

    // ON DELETE RESTRICT on the FK will naturally prevent this if items exist.
    // Let's do it manually so we can give a nice error message.
    const { data: catCheck } = await supabase.from('menu_categories').select('name, restaurant_id').eq('id', categoryId).single()
    if (catCheck) {
      const { count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurant_id', catCheck.restaurant_id).eq('category', catCheck.name)
      if (count && count > 0) {
        return { success: false, error: `This category contains ${count} menu item(s). Move items before deleting.` }
      }
    }

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId)

    if (error) return { success: false, error: 'Failed to delete category' }
    
    revalidatePath('/dashboard/menu')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Unexpected error' }
  }
}

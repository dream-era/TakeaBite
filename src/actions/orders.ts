/**
 * ============================================================
 * MENUQR — ORDER SERVER ACTIONS
 * File: src/actions/orders.ts
 *
 * Server actions for order management across the owner
 * dashboard — order history, manual status overrides,
 * cash payment collection, refunds, and CSV export.
 *
 * WHAT THIS FILE HANDLES:
 *   Owner dashboard operations (not kitchen — kitchen uses
 *   update-order-status/route.ts via the Realtime hook):
 *
 *   1. getOrderHistory()      — paginated order list with filters
 *   2. getOrderDetail()       — single order with full item breakdown
 *   3. cancelOrder()          — manual cancel by owner (refunds if paid)
 *   4. markCashCollected()    — owner confirms cash payment received
 *   5. issueRefund()          — partial or full Razorpay refund
 *   6. exportOrdersCSV()      — download order history as CSV string
 *
 * DISTINCTION FROM update-order-status/route.ts:
 *   update-order-status: kitchen staff real-time actions
 *     (pending→preparing→done, serve_order)
 *     Called from kitchen dashboards via fetch()
 *   orders.ts actions: owner management actions
 *     (cancel, refund, mark cash collected, export)
 *     Called from owner dashboard via server actions
 *   No overlap — they touch different status transitions.
 *
 * REFUND FLOW:
 *   issueRefund() calls Razorpay Refunds API using
 *   razorpay_payment_id saved by razorpay-webhook/route.ts.
 *   Partial refunds allowed (e.g. one item was wrong).
 *   Updates payment_status → 'refunded' in Supabase.
 *
 * CONNECTS TO:
 *  ← Owner dashboard /dashboard/orders page
 *  ← Order detail slide-over panel in dashboard
 *  → lib/supabase.ts (createServerSupabase + createAdminSupabase)
 *  → types/database.ts (Order, OrderWithItems, OrderStatus,
 *                        PaymentStatus, PaymentMethod)
 *  → Razorpay Refunds API (issueRefund uses razorpay_payment_id
 *    set by razorpay-webhook/route.ts)
 *  → migrations/001_initial.sql (orders + order_items tables,
 *    idx_orders_created_at index used for paginated history)
 *  → analytics/route.ts (same daily_order_summary view — our
 *    status updates must keep those view counts accurate)
 *  → update-order-status/route.ts (cancelOrder must not override
 *    an order that kitchen is actively preparing)
 * ============================================================
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import type {
  Order,
  OrderWithItems,
  OrderStatus,
  PaymentStatus,
} from '@/types/database'

// ─────────────────────────────────────────────
// RAZORPAY INSTANCE
// Used only by issueRefund() to call Refunds API.
// razorpay_payment_id was saved by webhook route.
// ─────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// ─────────────────────────────────────────────
// ACTION RESULT — same pattern as other action files
// ─────────────────────────────────────────────
type ActionResult<T = Order> =
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
// HELPER — Verify order belongs to owner's restaurant
// Used by every mutation action — prevents an owner
// from modifying another restaurant's orders.
// ─────────────────────────────────────────────
async function verifyOrderOwnership(
  orderId: string,
  ownerId: string
): Promise<{ owned: boolean; order: Order | null }> {
  const supabase = createAdminSupabase()

  const { data } = await supabase
    .from('orders')
    .select('*, restaurants!inner(owner_id)')
    // @ts-expect-error - Bypass complex supabase join inference
    .eq('id', orderId)
    .single()

  if (!data) return { owned: false, order: null }

  const ownerIdFromDB = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).restaurants as unknown as { owner_id: string }
  ).owner_id

  // Strip the joined restaurants field before returning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const { restaurants: _, ...orderData } = data as any

  return {
    owned: ownerIdFromDB === ownerId,
    order: orderData as unknown as Order,
  }
}

// ============================================================
// ACTION 1 — getOrderHistory
// Paginated order list for /dashboard/orders page.
// Supports filtering by status, payment method, date range.
// Uses idx_orders_created_at index for fast pagination.
//
// Returns orders WITH joined table + item data so the
// dashboard can show table number and item summary
// without a second fetch per row.
// ============================================================
const OrderHistorySchema = z.object({
  restaurantId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'all',
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'served',
      'cancelled',
    ])
    .default('all'),
  paymentMethod: z.enum(['all', 'online', 'cash']).default('all'),
  dateFrom: z.string().optional(), // YYYY-MM-DD
  dateTo: z.string().optional(),
  search: z.string().max(50).optional(), // Order ID partial search
})

export async function getOrderHistory(
  input: z.infer<typeof OrderHistorySchema>
): Promise<
  ActionResult<{
    orders: OrderWithItems[]
    totalCount: number
    page: number
    pageSize: number
    totalPages: number
  }>
> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = OrderHistorySchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid filter parameters' }
    }

    const {
      restaurantId,
      page,
      pageSize,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
    } = parsed.data

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

    // Build paginated query
    // Range: page 1 = rows 0-19, page 2 = rows 20-39
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        tables ( id, table_number, table_name ),
        order_items (
          *,
          menu_items ( id, name, category, station, is_veg )
        )
      `,
        { count: 'exact' }
      )
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(from, to)

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status as OrderStatus)
    }

    if (paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod)
    }

    // Date range filter — uses IST timestamps
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00+05:30`)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59+05:30`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[MenuQR] getOrderHistory error:', error)
      return { success: false, error: 'Failed to fetch order history' }
    }

    const totalCount = count ?? 0
    const totalPages = Math.ceil(totalCount / pageSize)

    return {
      success: true,
      data: {
        orders: (data ?? []) as unknown as OrderWithItems[],
        totalCount,
        page,
        pageSize,
        totalPages,
      },
    }
  } catch (err) {
    console.error('[MenuQR] getOrderHistory error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 2 — getOrderDetail
// Single order with complete item breakdown.
// Used by the order detail slide-over panel in the dashboard.
// Returns full OrderWithItems — same shape as useRealtime.ts
// uses for the kitchen display.
// ============================================================
export async function getOrderDetail(
  orderId: string
): Promise<ActionResult<OrderWithItems>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    // Fetch with full joins — same shape as getActiveOrdersByRestaurantId
    // in supabase.ts and fetchSingleOrder in useRealtime.ts
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        tables ( id, table_number, table_name ),
        order_items (
          *,
          menu_items ( id, name, category, station, is_veg )
        ),
        restaurants!inner ( owner_id )
      `
      )
      .eq('id', orderId)
      .single()

    if (error || !data) {
      return { success: false, error: 'Order not found' }
    }

    // Verify ownership
    const ownerIdFromDB = (
      data.restaurants as unknown as { owner_id: string }
    ).owner_id

    if (ownerIdFromDB !== user.id) {
      return { success: false, error: 'Access denied' }
    }

    // Strip the join helper before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { restaurants: _, ...orderData } = data as typeof data & {
      restaurants: unknown
    }

    return {
      success: true,
      data: orderData as unknown as OrderWithItems,
    }
  } catch (err) {
    console.error('[MenuQR] getOrderDetail error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 3 — cancelOrder
// Manual order cancellation by the owner.
//
// SAFETY RULES:
//   - Cannot cancel a 'served' order (already delivered)
//   - Cannot cancel a 'preparing' order without confirmation
//     (kitchen is actively working on it — owner must confirm)
//   - Online paid orders: triggers automatic refund via Razorpay
//   - Cash orders: just cancels (no money was collected online)
//   - Sets table status back to 'available' if no other active orders
//
// forceCancel flag: allows cancelling 'preparing' orders
// when owner explicitly confirms (e.g. customer walked out)
// ============================================================
const CancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().max(200).optional(),
  forceCancel: z.boolean().default(false), // Required for 'preparing' orders
})

export async function cancelOrder(
  input: z.infer<typeof CancelOrderSchema>
): Promise<ActionResult<Order>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = CancelOrderSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }

    const { orderId, forceCancel } = parsed.data

    // Verify ownership + get current order
    const { owned, order } = await verifyOrderOwnership(orderId, user.id)
    if (!owned || !order) {
      return { success: false, error: 'Order not found or access denied' }
    }

    // Block cancellation of served orders — too late
    if (order.status === 'served') {
      return {
        success: false,
        error: 'Cannot cancel a served order. Issue a refund instead.',
      }
    }

    // Already cancelled — idempotent
    if (order.status === 'cancelled') {
      return { success: false, error: 'Order is already cancelled' }
    }

    // Warn if kitchen is actively preparing — require forceCancel flag
    if (order.status === 'preparing' && !forceCancel) {
      return {
        success: false,
        error:
          'Kitchen is preparing this order. Set forceCancel=true to override.',
      }
    }

    // If online payment was captured — initiate full refund automatically
    if (
      order.payment_method === 'online' &&
      order.payment_status === 'paid' &&
      order.razorpay_payment_id
    ) {
      try {
        await razorpay.payments.refund(order.razorpay_payment_id, {
          amount: Math.round(order.total_amount * 100), // Full refund in paise
          notes: {
            reason: 'Order cancelled by restaurant',
            order_id: orderId,
          },
        })
      } catch (refundError) {
        console.error('[MenuQR] Auto-refund on cancel failed:', refundError)
        // Don't block cancellation — owner can manually refund later
        // Log it prominently for support follow-up
      }
    }

    // Cancel the order
    const newStatus: OrderStatus = 'cancelled'
    const newPaymentStatus: PaymentStatus =
      order.payment_status === 'paid' ? 'refunded' : order.payment_status

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_status: newPaymentStatus as PaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      return { success: false, error: 'Failed to cancel order' }
    }

    // Mark all order items as done (no longer being prepared)
    await supabase
      .from('order_items')
      .update({ status: 'done' })
      .eq('order_id', orderId)
      .neq('status', 'done')

    // Free the table if no other active orders on it
    const { data: remainingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', order.table_id)
      .in('status', ['confirmed', 'preparing', 'ready'])

    if (!remainingOrders || remainingOrders.length === 0) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', order.table_id)
    }

    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')

    return { success: true, data: updatedOrder as Order }
  } catch (err) {
    console.error('[MenuQR] cancelOrder error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 4 — markCashCollected
// Owner confirms that cash payment has been physically
// collected from the customer.
// Changes payment_status: 'pending' → 'paid' for cash orders.
// Only valid for cash orders with payment_status = 'pending'.
// Used by the owner dashboard orders table — cash orders
// show a "Collect payment" button until this is called.
// ============================================================
export async function markCashCollected(
  orderId: string
): Promise<ActionResult<Order>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const { owned, order } = await verifyOrderOwnership(orderId, user.id)
    if (!owned || !order) {
      return { success: false, error: 'Order not found or access denied' }
    }

    // Only for cash orders
    if (order.payment_method !== 'cash') {
      return {
        success: false,
        error: 'This action is only for cash orders',
      }
    }

    // Already collected
    if (order.payment_status === 'paid') {
      return { success: false, error: 'Cash already marked as collected' }
    }

    // Order must be served or ready to collect payment
    if (!['served', 'ready', 'confirmed', 'preparing'].includes(order.status)) {
      return {
        success: false,
        error: `Cannot collect payment for order with status '${order.status}'`,
      }
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid' as PaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      return { success: false, error: 'Failed to update payment status' }
    }

    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard')

    return { success: true, data: updatedOrder as Order }
  } catch (err) {
    console.error('[MenuQR] markCashCollected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 5 — issueRefund
// Initiates a Razorpay refund for an online payment.
// Supports partial refunds (e.g. one item was wrong).
// Uses razorpay_payment_id saved by razorpay-webhook/route.ts.
//
// PARTIAL REFUND EXAMPLE:
//   Order total: ₹250
//   Customer received wrong juice — refund ₹60 for that item
//   refundAmount: 60 → Razorpay refunds ₹60 only
//   payment_status remains 'paid' (partial refund doesn't
//   change the overall status — the rest was paid)
//
// FULL REFUND:
//   refundAmount = order.total_amount
//   payment_status → 'refunded'
// ============================================================
const RefundSchema = z.object({
  orderId: z.string().uuid(),
  refundAmount: z.number().positive('Refund amount must be positive'),
  reason: z.string().max(200).optional(),
})

export async function issueRefund(
  input: z.infer<typeof RefundSchema>
): Promise<ActionResult<{ refundId: string; amount: number; order: Order }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = RefundSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { orderId, refundAmount, reason } = parsed.data

    const { owned, order } = await verifyOrderOwnership(orderId, user.id)
    if (!owned || !order) {
      return { success: false, error: 'Order not found or access denied' }
    }

    // Only online orders can be refunded via Razorpay
    if (order.payment_method !== 'online') {
      return {
        success: false,
        error: 'Refunds via Razorpay are only for online payments. For cash orders, return cash manually.',
      }
    }

    // Must have been paid to refund
    if (order.payment_status !== 'paid') {
      return {
        success: false,
        error: `Cannot refund — payment status is '${order.payment_status}'`,
      }
    }

    // Must have a Razorpay payment ID (set by webhook)
    if (!order.razorpay_payment_id) {
      return {
        success: false,
        error: 'Payment ID not found. Contact support.',
      }
    }

    // Validate refund amount does not exceed order total
    if (refundAmount > order.total_amount) {
      return {
        success: false,
        error: `Refund amount (₹${refundAmount}) exceeds order total (₹${order.total_amount})`,
      }
    }

    // Call Razorpay Refunds API
    // Amount in paise — multiply by 100
    let razorpayRefund: { id: string; amount: number }
    try {
      razorpayRefund = await razorpay.payments.refund(
        order.razorpay_payment_id,
        {
          amount: Math.round(refundAmount * 100),
          notes: {
            reason: reason ?? 'Refund issued by restaurant',
            order_id: orderId,
            restaurant_owner: user.id,
          },
        }
      ) as { id: string; amount: number }
    } catch (razorpayError) {
      console.error('[MenuQR] Razorpay refund error:', razorpayError)
      return {
        success: false,
        error: 'Razorpay refund failed. Please try again or contact support.',
      }
    }

    // Determine new payment_status
    // Full refund → 'refunded', partial refund → stays 'paid'
    const isFullRefund =
      Math.abs(refundAmount - order.total_amount) < 0.01
    const newPaymentStatus: PaymentStatus = isFullRefund ? 'refunded' : 'paid'

    // Update order in Supabase
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      // Refund succeeded on Razorpay but DB update failed
      // Log critically — needs manual reconciliation
      console.error(
        '[MenuQR] CRITICAL: Razorpay refund succeeded but DB update failed.',
        { orderId, refundId: razorpayRefund.id }
      )
      return {
        success: false,
        error:
          'Refund processed by Razorpay but failed to update records. ' +
          `Refund ID: ${razorpayRefund.id}. Contact support.`,
      }
    }

    revalidatePath('/dashboard/orders')

    return {
      success: true,
      data: {
        refundId: razorpayRefund.id,
        amount: razorpayRefund.amount / 100, // Convert back to rupees
        order: updatedOrder as Order,
      },
    }
  } catch (err) {
    console.error('[MenuQR] issueRefund error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 6 — exportOrdersCSV
// Generates a CSV string of order history for download.
// Called by the "Export to CSV" button on the orders page.
// Returns a CSV string — component creates a Blob and
// triggers a browser download.
// Supports the same date range filters as getOrderHistory.
// ============================================================
const ExportCSVSchema = z.object({
  restaurantId: z.string().uuid(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z
    .enum([
      'all',
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'served',
      'cancelled',
    ])
    .default('all'),
})

export async function exportOrdersCSV(
  input: z.infer<typeof ExportCSVSchema>
): Promise<ActionResult<{ csv: string; filename: string; rowCount: number }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = ExportCSVSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }

    const { restaurantId, dateFrom, dateTo, status } = parsed.data

    // Verify ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // Fetch orders for export — max 5000 rows per export
    // Prevents server timeout on huge exports
    let query = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        total_amount,
        payment_method,
        payment_status,
        special_instructions,
        tables ( table_number, table_name ),
        order_items (
          quantity,
          price,
          menu_items ( name, category )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (status !== 'all') {
      query = query.eq('status', status as OrderStatus)
    }
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00+05:30`)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59+05:30`)
    }

    const { data: orders, error } = await query

    if (error || !orders) {
      return { success: false, error: 'Failed to fetch orders for export' }
    }

    // Build CSV rows
    const headers = [
      'Order ID',
      'Date',
      'Time',
      'Table',
      'Items',
      'Total (₹)',
      'Payment',
      'Payment Status',
      'Order Status',
      'Notes',
    ]

    const rows = orders.map((order) => {
      const date = new Date(order.created_at)
      const dateStr = date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
      })
      const timeStr = date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      })

      const table = order.tables as unknown as {
        table_number: number
        table_name: string | null
      } | null
      const tableStr = table
        ? table.table_name ?? `Table ${table.table_number}`
        : 'Unknown'

      const items = (
        order.order_items as unknown as {
          quantity: number
          menu_items: { name: string } | null
        }[]
      )
        .map((oi) => `${oi.quantity}x ${oi.menu_items?.name ?? 'Unknown'}`)
        .join('; ')

      // Escape commas and quotes in text fields for valid CSV
      const escape = (val: string) =>
        `"${String(val).replace(/"/g, '""')}"`

      return [
        escape(order.id.slice(0, 8).toUpperCase()), // Short ID
        escape(dateStr),
        escape(timeStr),
        escape(tableStr),
        escape(items),
        order.total_amount.toFixed(2),
        escape(order.payment_method),
        escape(order.payment_status),
        escape(order.status),
        escape(order.special_instructions ?? ''),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    // Filename with restaurant name + date range
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    })
    const safeRestaurantName = restaurant.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 30)
    const filename = `${safeRestaurantName}-orders-${today}.csv`

    return {
      success: true,
      data: { csv, filename, rowCount: orders.length },
    }
  } catch (err) {
    console.error('[MenuQR] exportOrdersCSV error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<ActionResult<void>> {
  try {
    const supabase = createAdminSupabase()
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('Failed to update order status:', err)
    return { success: false, error: 'Failed to update order status' }
  }
}

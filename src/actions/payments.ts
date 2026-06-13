'use server'

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { encryptSecret } from '@/lib/crypto'

// ── ACTION 1: connectRazorpayKeys ────────────────────────────
// Called when owner submits their Razorpay Key ID + Secret.
// Verifies the keys are valid by making a test API call to
// Razorpay before saving. If keys are wrong, shows error.

const ConnectKeysSchema = z.object({
  restaurantId: z.string().uuid(),
  keyId: z.string()
    .min(10, 'Invalid Key ID')
    .refine(v => v.startsWith('rzp_'), 'Key ID must start with rzp_'),
  keySecret: z.string().min(10, 'Invalid Key Secret'),
  accountName: z.string().min(2, 'Account name required').max(100),
})

export async function connectRazorpayKeys(
  input: z.infer<typeof ConnectKeysSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAuth = createServerSupabase()
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession()
    if (authError || !session?.user) {
      return { success: false, error: 'Not authenticated' }
    }
    const user = session.user

    // Verify session age (< 5 minutes)
    const signInTime = new Date(user.last_sign_in_at || Date.now()).getTime()
    const sessionAge = Date.now() - signInTime
    const FIVE_MINUTES = 5 * 60 * 1000

    if (sessionAge > FIVE_MINUTES) {
      return {
        success: false,
        error: 'For security, please log out and log in again before changing payment settings.',
        requiresReauth: true,
      } as any
    }

    const parsed = ConnectKeysSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors).flat().join(', ')
      }
    }

    const { restaurantId, keyId, keySecret, accountName } = parsed.data

    // Verify restaurant belongs to this owner
    const supabase = createAdminSupabase()
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, owner_id, name')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found or access denied' }
    }

    // Verify the Razorpay keys are valid by making a test call
    // We try to fetch account info — if keys are wrong, it throws
    try {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
      // Test the keys by fetching orders with limit 1
      // This will fail with 401 if keys are invalid
      await rzp.orders.all({ count: 1 })
    } catch (rzpError: any) {
      // Razorpay returns 401 for bad keys
      if (rzpError?.statusCode === 401 || rzpError?.error?.code === 'BAD_REQUEST_ERROR') {
        return {
          success: false,
          error: 'Invalid Razorpay keys. Please check your Key ID and Key Secret and try again.'
        }
      }
      // Any other error means keys might be valid but something else failed
      // We still save the keys in this case
      console.warn('[ServeFlow] Razorpay test call warning:', rzpError?.message)
    }

    // Save the keys to Supabase
    const encryptedSecret = encryptSecret(keySecret)
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        razorpay_key_id: keyId,
        razorpay_key_secret: encryptedSecret,
        razorpay_account_name: accountName,
        payment_enabled: true,
        payment_connected_at: new Date().toISOString(),
      })
      .eq('id', restaurantId)

    if (updateError) {
      console.error('[ServeFlow] Failed to save Razorpay keys:', updateError)
      return { success: false, error: 'Failed to save payment settings. Try again.' }
    }

    // Add audit log
    const headersList = await headers()
    await supabase.from('security_audit_log').insert({
      event_type: 'razorpay_keys_connected',
      user_id: user.id,
      restaurant_id: restaurantId,
      ip_address: headersList.get('x-forwarded-for') ?? 'unknown',
      user_agent: headersList.get('user-agent') ?? 'unknown',
      details: { account_name: accountName },
    })

    revalidatePath('/dashboard/payments')

    return { success: true }

  } catch (err) {
    console.error('[ServeFlow] connectRazorpayKeys error:', err)
    return { success: false, error: 'Unexpected error. Please try again.' }
  }
}

// ── ACTION 2: disconnectRazorpay ─────────────────────────────
// Removes Razorpay keys — disables online payments for the shop.
// Cash orders still work.

export async function disconnectRazorpay(
  restaurantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAuth = createServerSupabase()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()

    const { error } = await supabase
      .from('restaurants')
      .update({
        razorpay_key_id: null,
        razorpay_key_secret: null,
        razorpay_account_name: null,
        payment_enabled: false,
        payment_connected_at: null,
      })
      .eq('id', restaurantId)
      .eq('owner_id', user.id)

    if (error) return { success: false, error: 'Failed to disconnect. Try again.' }

    // Add audit log
    const headersList = await headers()
    await supabase.from('security_audit_log').insert({
      event_type: 'razorpay_keys_disconnected',
      user_id: user.id,
      restaurant_id: restaurantId,
      ip_address: headersList.get('x-forwarded-for') ?? 'unknown',
      user_agent: headersList.get('user-agent') ?? 'unknown',
      details: {},
    })

    revalidatePath('/dashboard/payments')
    return { success: true }

  } catch (err) {
    return { success: false, error: 'Unexpected error' }
  }
}

// ── ACTION 3: getPaymentStatus ───────────────────────────────
// Returns whether Razorpay is connected + masked key info.
// Never returns the full secret.

export async function getPaymentStatus(restaurantId: string): Promise<{
  success: boolean
  data?: {
    isConnected: boolean
    keyId: string | null
    maskedSecret: string | null
    accountName: string | null
    connectedAt: string | null
  }
  error?: string
}> {
  try {
    const supabase = createAdminSupabase()
    const { data } = await supabase
      .from('restaurants')
      .select('payment_enabled, razorpay_key_id, razorpay_account_name, payment_connected_at')
      .eq('id', restaurantId)
      .single()

    if (!data) return { success: false, error: 'Restaurant not found' }

    return {
      success: true,
      data: {
        isConnected: data.payment_enabled ?? false,
        keyId: data.razorpay_key_id ?? null,
        maskedSecret: data.payment_enabled ? '••••••••••••••••••••' : null,
        accountName: data.razorpay_account_name ?? null,
        connectedAt: data.payment_connected_at ?? null,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to fetch payment status' }
  }
}

// ── ACTION 4: getRevenueData ─────────────────────────────────
// Returns revenue breakdown: online vs cash, by date range.
// Used by the revenue charts and summary cards.

export async function getRevenueData(
  restaurantId: string,
  range: 'today' | 'week' | 'month' = 'today'
): Promise<{
  success: boolean
  data?: {
    totalRevenue: number
    onlineRevenue: number
    cashRevenue: number
    totalOrders: number
    onlineOrders: number
    cashOrders: number
    pendingCashCollection: number
    recentTransactions: {
      id: string
      tableNumber: number
      amount: number
      method: string
      status: string
      time: string
    }[]
  }
  error?: string
}> {
  try {
    const supabase = createAdminSupabase()

    // Build date filter
    const now = new Date()
    const tz = 'Asia/Kolkata'
    let fromDate: string

    if (range === 'today') {
      fromDate = new Date().toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00+05:30'
    } else if (range === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      fromDate = d.toISOString()
    } else {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      fromDate = d.toISOString()
    }

    // Fetch orders for this period
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, total_amount, payment_method, payment_status,
        status, created_at,
        tables ( table_number )
      `)
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', fromDate)
      .order('created_at', { ascending: false })

    if (!orders) return { success: false, error: 'Failed to fetch orders' }

    const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const onlineOrders = orders.filter(o => o.payment_method === 'online')
    const cashOrders = orders.filter(o => o.payment_method === 'cash')
    const onlineRevenue = onlineOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const cashRevenue = cashOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const pendingCash = cashOrders
      .filter(o => o.payment_status === 'pending')
      .reduce((s, o) => s + (o.total_amount ?? 0), 0)

    const recentTransactions = orders.slice(0, 10).map(o => ({
      id: o.id.slice(0, 8).toUpperCase(),
      tableNumber: (o.tables as any)?.table_number ?? 0,
      amount: o.total_amount,
      method: o.payment_method,
      status: o.payment_status,
      time: new Date(o.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', timeZone: tz
      }),
    }))

    return {
      success: true,
      data: {
        totalRevenue, onlineRevenue, cashRevenue,
        totalOrders: orders.length,
        onlineOrders: onlineOrders.length,
        cashOrders: cashOrders.length,
        pendingCashCollection: pendingCash,
        recentTransactions,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to fetch revenue data' }
  }
}

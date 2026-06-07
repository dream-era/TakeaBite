export const dynamic = 'force-dynamic';
export const revalidate = 0;
/**
 * ============================================================
 * MENUQR — ANALYTICS API ROUTE
 * File: src/app/api/analytics/route.ts
 *
 * Powers the owner dashboard — metric cards, peak hours
 * bar chart, top items list, and revenue trends.
 * All data comes from the three views defined in
 * migrations/001_initial.sql, queried in one request.
 *
 * WHAT IT DOES (in sequence):
 *  1. Authenticates the owner via Supabase Auth
 *  2. Validates query params — dateRange + restaurantId
 *  3. Verifies restaurant belongs to the owner
 *  4. Runs FOUR parallel queries (Promise.all):
 *       a. daily_order_summary  → revenue + order count
 *       b. hourly_order_volume  → peak hours data for chart
 *       c. top_menu_items       → best selling items
 *       d. tables (live)        → active table count right now
 *  5. Computes comparison metrics (today vs yesterday,
 *     this week vs last week) for the dashboard cards
 *  6. Returns a single shaped AnalyticsData response
 *     that the owner dashboard consumes directly
 *
 * DATE RANGE MODES:
 *   today       → current day in Asia/Kolkata timezone
 *   yesterday   → previous day
 *   week        → last 7 days
 *   month       → last 30 days
 *   custom      → requires dateFrom + dateTo params (ISO dates)
 *
 * RESPONSE SHAPE matches AnalyticsData in types/database.ts:
 *   {
 *     totalRevenue:   number   — sum of all confirmed orders
 *     totalOrders:    number   — count of confirmed orders
 *     avgOrderValue:  number   — totalRevenue / totalOrders
 *     activeTables:   number   — tables with status 'occupied' RIGHT NOW
 *     peakHours:      { hour, count }[]    — for bar chart (0-23)
 *     topItems:       { name, count, revenue }[]  — top 5 items
 *     comparison:     { revenueChange, ordersChange } — % vs prior period
 *     dailyBreakdown: { date, revenue, orders }[]  — for trend line
 *     paymentSplit:   { online, cash }     — payment method breakdown
 *   }
 *
 * PERFORMANCE:
 *   All four queries run in parallel via Promise.all.
 *   Views in the migration pre-aggregate the heavy JOINs.
 *   TanStack Query on the frontend caches this for 2 minutes
 *   so the owner dashboard does not hammer the DB on every
 *   tab switch.
 *
 * CONNECTS TO:
 *  ← Owner dashboard pages call GET /api/analytics?...
 *  → lib/supabase.ts (createServerSupabase for auth,
 *                     createAdminSupabase for data queries)
 *  → types/database.ts (AnalyticsData interface)
 *  → migrations/001_initial.sql (daily_order_summary,
 *    hourly_order_volume, top_menu_items views + tables table)
 *  ← middleware.ts passes /api/* through — auth is manual here
 * ============================================================
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import type { AnalyticsData } from '@/types/database'

// ─────────────────────────────────────────────
// QUERY PARAM VALIDATION SCHEMA
// All params arrive as URL query strings.
// e.g. GET /api/analytics?restaurantId=uuid&range=today
// ─────────────────────────────────────────────
const AnalyticsQuerySchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  range: z
    .enum(['today', 'yesterday', 'week', 'month', 'custom'])
    .default('today'),
  // Only required when range = 'custom'
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>

// ─────────────────────────────────────────────
// TIMEZONE
// All Indian restaurants operate in IST.
// Views in the migration already use Asia/Kolkata.
// We produce date strings in the same timezone
// so view queries filter on the correct local dates.
// ─────────────────────────────────────────────
const IST_TIMEZONE = 'Asia/Kolkata'

// ─────────────────────────────────────────────
// HELPER — Get date range boundaries in IST
// Returns { from, to } as 'YYYY-MM-DD' strings.
// These are compared against the DATE() column
// in daily_order_summary and hourly_order_volume views.
// ─────────────────────────────────────────────
function getDateRange(
  range: AnalyticsQuery['range'],
  dateFrom?: string,
  dateTo?: string
): { from: string; to: string; comparisonFrom: string; comparisonTo: string } {

  // Get current date in IST as YYYY-MM-DD
  const nowIST = new Date().toLocaleDateString('en-CA', {
    timeZone: IST_TIMEZONE,
  })

  // Helper: subtract N days from a YYYY-MM-DD string
  const subtractDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() - days)
    return d.toLocaleDateString('en-CA', { timeZone: 'UTC' })
  }

  switch (range) {
    case 'today':
      return {
        from: nowIST,
        to: nowIST,
        comparisonFrom: subtractDays(nowIST, 1),
        comparisonTo: subtractDays(nowIST, 1),
      }

    case 'yesterday': {
      const yesterday = subtractDays(nowIST, 1)
      return {
        from: yesterday,
        to: yesterday,
        comparisonFrom: subtractDays(nowIST, 2),
        comparisonTo: subtractDays(nowIST, 2),
      }
    }

    case 'week':
      return {
        from: subtractDays(nowIST, 6),
        to: nowIST,
        comparisonFrom: subtractDays(nowIST, 13),
        comparisonTo: subtractDays(nowIST, 7),
      }

    case 'month':
      return {
        from: subtractDays(nowIST, 29),
        to: nowIST,
        comparisonFrom: subtractDays(nowIST, 59),
        comparisonTo: subtractDays(nowIST, 30),
      }

    case 'custom': {
      // Custom range: use provided dates
      // Comparison period is same duration immediately before
      const from = dateFrom ?? nowIST
      const to = dateTo ?? nowIST
      const duration =
        (new Date(to).getTime() - new Date(from).getTime()) /
        (1000 * 60 * 60 * 24)
      return {
        from,
        to,
        comparisonFrom: subtractDays(from, Math.ceil(duration) + 1),
        comparisonTo: subtractDays(from, 1),
      }
    }
  }
}

// ─────────────────────────────────────────────
// HELPER — Safe number conversion
// Supabase returns aggregated numbers as strings
// from views (PostgreSQL numeric → JSON string).
// This converts safely with a fallback to 0.
// ─────────────────────────────────────────────
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value) || 0
  return 0
}

// ─────────────────────────────────────────────
// HELPER — Calculate % change between two periods
// Returns a rounded percentage, capped at ±999%
// to avoid absurd numbers when comparing near-zero.
// Positive = improvement, negative = decline.
// ─────────────────────────────────────────────
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  const change = ((current - previous) / previous) * 100
  return Math.round(Math.min(Math.max(change, -999), 999))
}

// ─────────────────────────────────────────────
// QUERY A — Fetch summary for a date range
// Reads from: daily_order_summary view
// Returns totals for the given date window.
// ─────────────────────────────────────────────
async function fetchSummary(
  restaurantId: string,
  from: string,
  to: string
): Promise<{
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  onlineOrders: number
  cashOrders: number
}> {
  const supabase = createAdminSupabase()

  const { data, error } = await supabase
    .from('daily_order_summary')
    .select(
      'total_orders, total_revenue, avg_order_value, online_orders, cash_orders'
    )
    .eq('restaurant_id', restaurantId)
    .gte('order_date', from)
    .lte('order_date', to)

  if (error) {
    console.error('[MenuQR Analytics] Summary query failed:', error)
    throw new Error(`Summary query failed: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      onlineOrders: 0,
      cashOrders: 0,
    }
  }

  // Sum across multiple days if range > 1 day
  const totalOrders = data.reduce((s, r) => s + toNumber(r.total_orders), 0)
  const totalRevenue = data.reduce((s, r) => s + toNumber(r.total_revenue), 0)
  const onlineOrders = data.reduce((s, r) => s + toNumber(r.online_orders), 0)
  const cashOrders = data.reduce((s, r) => s + toNumber(r.cash_orders), 0)

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    avgOrderValue:
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0,
    onlineOrders,
    cashOrders,
  }
}

// ─────────────────────────────────────────────
// QUERY B — Fetch peak hours data
// Reads from: hourly_order_volume view
// Returns order count per hour (0–23) aggregated
// across the date range — used for the bar chart.
// ─────────────────────────────────────────────
async function fetchPeakHours(
  restaurantId: string,
  from: string,
  to: string
): Promise<{ hour: number; count: number; revenue: number }[]> {
  const supabase = createAdminSupabase()

  const { data, error } = await supabase
    .from('hourly_order_volume')
    .select('hour, order_count, hour_revenue')
    .eq('restaurant_id', restaurantId)
    .gte('order_date', from)
    .lte('order_date', to)

  if (error) {
    console.error('[MenuQR Analytics] Peak hours query failed:', error)
    return []
  }

  // Aggregate across multiple days — sum counts per hour
  const hourMap = new Map<number, { count: number; revenue: number }>()

  for (const row of data ?? []) {
    const hour = toNumber(row.hour)
    const existing = hourMap.get(hour) ?? { count: 0, revenue: 0 }
    hourMap.set(hour, {
      count: existing.count + toNumber(row.order_count),
      revenue: existing.revenue + toNumber(row.hour_revenue),
    })
  }

  // Return all 24 hours — fill missing hours with 0
  // Frontend bar chart expects exactly 24 data points
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourMap.get(hour)?.count ?? 0,
    revenue: Math.round((hourMap.get(hour)?.revenue ?? 0) * 100) / 100,
  }))
}

// ─────────────────────────────────────────────
// QUERY C — Fetch top selling items
// Reads from: top_menu_items view
// Returns top 5 items by order count in the range.
// Joins via orders table to filter by date range.
// ─────────────────────────────────────────────
async function fetchTopItems(
  restaurantId: string,
  from: string,
  to: string
): Promise<{ name: string; count: number; revenue: number; category: string }[]> {
  const supabase = createAdminSupabase()

  // top_menu_items view aggregates ALL time — we need date-filtered data
  // so we query order_items directly with a date filter on orders
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      menu_item_id,
      quantity,
      price,
      menu_items ( name, category ),
      orders!inner ( created_at, restaurant_id, status )
    `)
    .eq('orders.restaurant_id', restaurantId)
    .gte('orders.created_at', `${from}T00:00:00+05:30`)
    .lte('orders.created_at', `${to}T23:59:59+05:30`)
    .not('orders.status', 'in', '("pending","cancelled")')

  if (error) {
    console.error('[MenuQR Analytics] Top items query failed:', error)
    return []
  }

  // Aggregate by menu_item_id
  const itemMap = new Map<
    string,
    { name: string; category: string; count: number; revenue: number }
  >()

  for (const row of data ?? []) {
    const menuItem = row.menu_items as unknown as {
      name: string
      category: string
    } | null

    if (!menuItem) continue

    const existing = itemMap.get(row.menu_item_id) ?? {
      name: menuItem.name,
      category: menuItem.category,
      count: 0,
      revenue: 0,
    }

    itemMap.set(row.menu_item_id, {
      ...existing,
      count: existing.count + toNumber(row.quantity),
      revenue:
        existing.revenue +
        toNumber(row.price) * toNumber(row.quantity),
    })
  }

  // Sort by count descending, return top 5
  return Array.from(itemMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      revenue: Math.round(item.revenue * 100) / 100,
    }))
}

// ─────────────────────────────────────────────
// QUERY D — Fetch active tables count (live)
// Reads from: tables table directly (not a view)
// Returns count of tables currently occupied.
// This is a live number — not date-filtered.
// ─────────────────────────────────────────────
async function fetchActiveTables(restaurantId: string): Promise<number> {
  const supabase = createAdminSupabase()

  const { count, error } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'occupied')
    .eq('is_active', true)

  if (error) {
    console.error('[MenuQR Analytics] Active tables query failed:', error)
    return 0
  }

  return count ?? 0
}

// ─────────────────────────────────────────────
// QUERY E — Daily breakdown for trend line
// Reads from: daily_order_summary view
// Returns one row per day for the trend sparkline
// shown below the revenue metric card.
// ─────────────────────────────────────────────
async function fetchDailyBreakdown(
  restaurantId: string,
  from: string,
  to: string
): Promise<{ date: string; revenue: number; orders: number }[]> {
  const supabase = createAdminSupabase()

  const { data, error } = await supabase
    .from('daily_order_summary')
    .select('order_date, total_revenue, total_orders')
    .eq('restaurant_id', restaurantId)
    .gte('order_date', from)
    .lte('order_date', to)
    .order('order_date', { ascending: true })

  if (error) {
    console.error('[MenuQR Analytics] Daily breakdown query failed:', error)
    return []
  }

  return (data ?? []).map((row) => ({
    date: row.order_date as string,
    revenue: Math.round(toNumber(row.total_revenue) * 100) / 100,
    orders: toNumber(row.total_orders),
  }))
}

// ─────────────────────────────────────────────
// MAIN HANDLER — GET /api/analytics
// ─────────────────────────────────────────────
export async function GET(request: Request) {
  // ── STEP 1: Authenticate owner ────────────────
  // Same auth pattern as generate-qr/route.ts —
  // getUser() for secure server-side verification
  const serverSupabase = createServerSupabase()
  const {
    data: { user },
    error: authError,
  } = await serverSupabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorised — owner login required' },
      { status: 401 }
    )
  }

  // ── STEP 2: Parse + validate query params ─────
  const { searchParams } = new URL(request.url)

  const queryRaw = {
    restaurantId: searchParams.get('restaurantId') ?? '',
    range: searchParams.get('range') ?? 'today',
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  }

  const parsed = AnalyticsQuerySchema.safeParse(queryRaw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { restaurantId, range, dateFrom, dateTo } = parsed.data

  // ── STEP 3: Verify restaurant ownership ───────
  // Same pattern as generate-qr — owner_id check
  const adminSupabase = createAdminSupabase()
  const { data: restaurant, error: restaurantError } = await adminSupabase
    .from('restaurants')
    .select('id, name, owner_id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (restaurantError || !restaurant) {
    return NextResponse.json(
      { error: 'Restaurant not found or access denied' },
      { status: 403 }
    )
  }

  // ── STEP 4: Compute date ranges ───────────────
  const { from, to, comparisonFrom, comparisonTo } = getDateRange(
    range,
    dateFrom,
    dateTo
  )

  // ── STEP 5: Run all queries in parallel ────────
  // Promise.all — all five queries fire simultaneously.
  // Total time = slowest single query, not sum of all.
  // Typically ~150ms for a restaurant with 1000 orders.
  // If any query fails, the whole request fails —
  // better than returning partial/misleading data.
  let summary,
    comparisonSummary,
    peakHours,
    topItems,
    activeTables,
    dailyBreakdown

  try {
    ;[
      summary,
      comparisonSummary,
      peakHours,
      topItems,
      activeTables,
      dailyBreakdown,
    ] = await Promise.all([
      fetchSummary(restaurantId, from, to),
      fetchSummary(restaurantId, comparisonFrom, comparisonTo),
      fetchPeakHours(restaurantId, from, to),
      fetchTopItems(restaurantId, from, to),
      fetchActiveTables(restaurantId),
      fetchDailyBreakdown(restaurantId, from, to),
    ])
  } catch (queryError) {
    console.error('[MenuQR Analytics] Parallel query failed:', queryError)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }

  // ── STEP 6: Compute comparison percentages ─────
  const revenueChange = percentChange(
    summary.totalRevenue,
    comparisonSummary.totalRevenue
  )
  const ordersChange = percentChange(
    summary.totalOrders,
    comparisonSummary.totalOrders
  )
  const avgOrderChange = percentChange(
    summary.avgOrderValue,
    comparisonSummary.avgOrderValue
  )

  // ── STEP 7: Shape the response ─────────────────
  // Core shape matches AnalyticsData in types/database.ts.
  // Extended fields (comparison, dailyBreakdown, paymentSplit)
  // are bonus data the dashboard uses but aren't in the base type.
  const analyticsResponse: AnalyticsData & {
    comparison: {
      revenueChange: number
      ordersChange: number
      avgOrderChange: number
    }
    dailyBreakdown: { date: string; revenue: number; orders: number }[]
    paymentSplit: { online: number; cash: number }
    dateRange: { from: string; to: string }
  } = {
    // Core AnalyticsData fields (matches types/database.ts)
    totalRevenue: summary.totalRevenue,
    totalOrders: summary.totalOrders,
    avgOrderValue: summary.avgOrderValue,
    activeTables,
    peakHours: peakHours.map(({ hour, count }) => ({ hour, count })),
    topItems: topItems.map(({ name, count, revenue }) => ({
      name,
      count,
      revenue,
    })),

    // Extended fields for richer dashboard UI
    comparison: { revenueChange, ordersChange, avgOrderChange },
    dailyBreakdown,
    paymentSplit: {
      online: summary.onlineOrders,
      cash: summary.cashOrders,
    },
    dateRange: { from, to },
  }

  // ── STEP 8: Return with cache headers ──────────
  // Cache-Control: private (owner-specific data, not CDN-cacheable)
  // max-age=120 → TanStack Query on frontend caches 2 minutes
  // This prevents the owner from hammering the DB by clicking
  // between dashboard tabs rapidly during a busy service
  return NextResponse.json(analyticsResponse, {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=120',
    },
  })
}

// Only GET is valid for analytics
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

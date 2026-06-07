/**
 * ============================================================
 * SERVEFLOW — ANALYTICS SERVER ACTIONS
 * File: src/actions/analytics.ts
 *
 * Powers every metric on the Analytics page with real data
 * from the orders, order_items, menu_items, and tables tables.
 *
 * ALL FUNCTIONS:
 *  1. getBusinessHealth()     — overall health score + status
 *  2. getWeeklyStats()        — orders, revenue, top item, peak time
 *  3. getSalesChartData()     — daily sales for the week chart
 *  4. getHighDemandProducts() — top 10 selling items by order count
 *  5. getPeakDay()            — busiest day of the week
 *  6. getBestSeller()         — single highest revenue item
 *  7. getLowDemandItem()      — item ordered least (needs attention)
 *  8. getPreparationInsight() — avg time orders spend in preparing state
 *  9. getFullAnalytics()      — calls all above in parallel (one call)
 *  10. exportAnalyticsReport() — CSV download of full analytics
 * ============================================================
 */

'use server'

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// TIMEZONE — All date calculations in IST
// ─────────────────────────────────────────────
const IST = 'Asia/Kolkata'

// ─────────────────────────────────────────────
// HELPER — Get date boundaries in IST
// ─────────────────────────────────────────────
function getDateBoundaries(range: 'today' | 'week' | 'month') {
  const nowIST = new Date().toLocaleDateString('en-CA', { timeZone: IST })

  const subtractDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - days)
    return d.toISOString().split('T')[0]
  }

  switch (range) {
    case 'today':
      return {
        from: `${nowIST}T00:00:00+05:30`,
        to: `${nowIST}T23:59:59+05:30`,
      }
    case 'week':
      return {
        from: `${subtractDays(nowIST, 6)}T00:00:00+05:30`,
        to: `${nowIST}T23:59:59+05:30`,
      }
    case 'month':
      return {
        from: `${subtractDays(nowIST, 29)}T00:00:00+05:30`,
        to: `${nowIST}T23:59:59+05:30`,
      }
  }
}

// ─────────────────────────────────────────────
// HELPER — Get authenticated owner + restaurantId
// ─────────────────────────────────────────────
async function getOwnerRestaurantId(): Promise<string | null> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminSupabase()
  const { data } = await admin
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  return data?.id ?? null
}

// ─────────────────────────────────────────────
// ACTION RESULT TYPE
// ─────────────────────────────────────────────
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================
// ACTION 1 — getBusinessHealth
// Scores the restaurant 0-100 based on:
//   - Orders this week vs last week (trend)
//   - Revenue this week vs last week
//   - Number of active menu items
//   - How many tables have been used this week
// Returns: score, status label, and trend direction
// ============================================================
export async function getBusinessHealth(): Promise<ActionResult<{
  score: number
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  statusColor: string
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  details: string
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const thisWeek = getDateBoundaries('week')
    const { from: lastWeekFrom } = getDateBoundaries('week')

    // Last week boundaries
    const lw = new Date(thisWeek.from)
    lw.setDate(lw.getDate() - 7)
    const lwEnd = new Date(thisWeek.from)
    lwEnd.setSeconds(lwEnd.getSeconds() - 1)

    // This week orders
    const { data: thisWeekOrders } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', thisWeek.from)
      .lte('created_at', thisWeek.to)

    // Last week orders
    const { data: lastWeekOrders } = await supabase
      .from('orders')
      .select('id, total_amount')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', lw.toISOString())
      .lte('created_at', lwEnd.toISOString())

    // Active menu items count
    const { count: menuCount } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)

    const thisWeekCount = thisWeekOrders?.length ?? 0
    const lastWeekCount = lastWeekOrders?.length ?? 0
    const thisRevenue = thisWeekOrders?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
    const lastRevenue = lastWeekOrders?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0

    // Calculate score
    let score = 0
    if (menuCount && menuCount >= 5) score += 20
    if (menuCount && menuCount >= 15) score += 10
    if (thisWeekCount > 0) score += 20
    if (thisWeekCount >= 10) score += 10
    if (thisWeekCount >= 50) score += 10
    if (thisRevenue > 0) score += 15
    if (thisRevenue >= 1000) score += 10
    if (thisRevenue >= 5000) score += 5

    const orderTrend = lastWeekCount > 0
      ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
      : thisWeekCount > 0 ? 100 : 0

    if (orderTrend > 0) score = Math.min(score + 10, 100)

    const trend = orderTrend > 2 ? 'up' : orderTrend < -2 ? 'down' : 'stable'

    const status =
      score >= 80 ? 'Excellent' :
      score >= 60 ? 'Good' :
      score >= 40 ? 'Fair' : 'Needs Attention'

    const statusColor =
      score >= 80 ? '#16a34a' :
      score >= 60 ? '#2563eb' :
      score >= 40 ? '#d97706' : '#dc2626'

    const details =
      thisWeekCount === 0
        ? 'No orders yet this week. Share your QR codes to get started.'
        : `${thisWeekCount} orders this week · ₹${thisRevenue.toLocaleString('en-IN')} revenue`

    return {
      success: true,
      data: { score, status, statusColor, trend, trendPercent: Math.round(Math.abs(orderTrend)), details }
    }
  } catch (err) {
    return { success: false, error: 'Failed to calculate business health' }
  }
}

// ============================================================
// ACTION 2 — getWeeklyStats
// Returns the 4 metric cards:
//   Orders This Week, Revenue This Week,
//   Top Selling Item, Peak Time (busiest hour)
// ============================================================
export async function getWeeklyStats(): Promise<ActionResult<{
  ordersThisWeek: number
  ordersLastWeek: number
  ordersTrend: number
  revenueThisWeek: number
  revenueLastWeek: number
  revenueTrend: number
  topSellingItem: string | null
  topSellingCount: number
  peakTime: string | null
  peakTimeOrders: number
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const thisWeek = getDateBoundaries('week')

    const lw = new Date(thisWeek.from)
    lw.setDate(lw.getDate() - 7)
    const lwEnd = new Date(thisWeek.from)
    lwEnd.setSeconds(lwEnd.getSeconds() - 1)

    // This week orders
    const { data: twOrders } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', thisWeek.from)
      .lte('created_at', thisWeek.to)

    // Last week orders
    const { data: lwOrders } = await supabase
      .from('orders')
      .select('id, total_amount')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', lw.toISOString())
      .lte('created_at', lwEnd.toISOString())

    // Top selling item this week
    const { data: topItems } = await supabase
      .from('order_items')
      .select(`
        quantity,
        menu_items ( name ),
        orders!inner ( created_at, restaurant_id, status )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .not('orders.status', 'in', '("cancelled","pending")')
      .gte('orders.created_at', thisWeek.from)
      .lte('orders.created_at', thisWeek.to)

    // Aggregate top items
    const itemCounts: Record<string, number> = {}
    for (const oi of topItems ?? []) {
      const name = (oi.menu_items as any)?.name ?? 'Unknown'
      itemCounts[name] = (itemCounts[name] ?? 0) + (oi.quantity ?? 1)
    }
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])
    const topItem = sortedItems[0]

    // Peak time — find busiest hour
    const hourCounts: Record<number, number> = {}
    for (const order of twOrders ?? []) {
      const hour = new Date(order.created_at).toLocaleString('en-IN', {
        timeZone: IST, hour: 'numeric', hour12: false
      })
      const h = parseInt(hour)
      hourCounts[h] = (hourCounts[h] ?? 0) + 1
    }
    const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])
    const peakHour = sortedHours[0]

    let peakTimeStr: string | null = null
    if (peakHour) {
      const h = parseInt(peakHour[0])
      const ampm = h >= 12 ? 'PM' : 'AM'
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
      peakTimeStr = `${displayH}:00 ${ampm}`
    }

    const twRevenue = twOrders?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
    const lwRevenue = lwOrders?.reduce((s, o) => s + (o.total_amount ?? 0), 0) ?? 0
    const twCount = twOrders?.length ?? 0
    const lwCount = lwOrders?.length ?? 0

    const ordersTrend = lwCount > 0 ? Math.round(((twCount - lwCount) / lwCount) * 100) : twCount > 0 ? 100 : 0
    const revenueTrend = lwRevenue > 0 ? Math.round(((twRevenue - lwRevenue) / lwRevenue) * 100) : twRevenue > 0 ? 100 : 0

    return {
      success: true,
      data: {
        ordersThisWeek: twCount,
        ordersLastWeek: lwCount,
        ordersTrend,
        revenueThisWeek: twRevenue,
        revenueLastWeek: lwRevenue,
        revenueTrend,
        topSellingItem: topItem?.[0] ?? null,
        topSellingCount: topItem?.[1] ?? 0,
        peakTime: peakTimeStr,
        peakTimeOrders: peakHour ? parseInt(peakHour[1]) : 0,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to fetch weekly stats' }
  }
}

// ============================================================
// ACTION 3 — getSalesChartData
// Returns daily sales totals for the last 7 days.
// Used to draw the "Sales This Week" line/bar chart.
// Returns array of { date, dayName, orders, revenue }
// ============================================================
export async function getSalesChartData(): Promise<ActionResult<{
  days: {
    date: string
    dayName: string
    orders: number
    revenue: number
  }[]
  maxRevenue: number
  totalWeekRevenue: number
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const thisWeek = getDateBoundaries('week')

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', thisWeek.from)
      .lte('created_at', thisWeek.to)
      .order('created_at', { ascending: true })

    // Build 7-day array
    const days: { date: string; dayName: string; orders: number; revenue: number }[] = []
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: IST })
      const dayName = DAY_NAMES[d.getDay()]

      const dayOrders = (orders ?? []).filter(o => {
        const orderDate = new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: IST })
        return orderDate === dateStr
      })

      days.push({
        date: dateStr,
        dayName,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      })
    }

    const maxRevenue = Math.max(...days.map(d => d.revenue), 0)
    const totalWeekRevenue = days.reduce((s, d) => s + d.revenue, 0)

    return { success: true, data: { days, maxRevenue, totalWeekRevenue } }
  } catch (err) {
    return { success: false, error: 'Failed to fetch sales chart data' }
  }
}

// ============================================================
// ACTION 4 — getHighDemandProducts
// Returns top 10 items ordered this month, sorted by count.
// Used for the "High Demand Products" table.
// ============================================================
export async function getHighDemandProducts(): Promise<ActionResult<{
  products: {
    rank: number
    name: string
    category: string
    orders: number
    revenue: number
    isVeg: boolean
    trend: 'up' | 'down' | 'stable'
  }[]
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const month = getDateBoundaries('month')
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    // This month order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        menu_item_id, quantity, price,
        menu_items ( name, category, is_veg ),
        orders!inner ( created_at, restaurant_id, status )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .not('orders.status', 'in', '("cancelled","pending")')
      .gte('orders.created_at', month.from)
      .lte('orders.created_at', month.to)

    // Aggregate by item
    const itemMap: Record<string, {
      name: string; category: string; isVeg: boolean
      totalQty: number; totalRevenue: number
      recentQty: number
    }> = {}

    for (const oi of orderItems ?? []) {
      const mi = oi.menu_items as any
      const orderDate = new Date((oi.orders as any)?.created_at)
      const key = oi.menu_item_id
      const isRecent = orderDate >= twoWeeksAgo

      if (!itemMap[key]) {
        itemMap[key] = {
          name: mi?.name ?? 'Unknown',
          category: mi?.category ?? 'Other',
          isVeg: mi?.is_veg ?? true,
          totalQty: 0, totalRevenue: 0, recentQty: 0
        }
      }

      itemMap[key].totalQty += oi.quantity ?? 1
      itemMap[key].totalRevenue += (oi.price ?? 0) * (oi.quantity ?? 1)
      if (isRecent) itemMap[key].recentQty += oi.quantity ?? 1
    }

    const products = Object.entries(itemMap)
      .sort(([, a], [, b]) => b.totalQty - a.totalQty)
      .slice(0, 10)
      .map(([, item], idx) => {
        const halfMonth = item.totalQty / 2
        const trend: 'up' | 'down' | 'stable' =
          item.recentQty > halfMonth * 1.1 ? 'up' :
          item.recentQty < halfMonth * 0.9 ? 'down' : 'stable'

        return {
          rank: idx + 1,
          name: item.name,
          category: item.category,
          orders: item.totalQty,
          revenue: Math.round(item.totalRevenue),
          isVeg: item.isVeg,
          trend,
        }
      })

    return { success: true, data: { products } }
  } catch (err) {
    return { success: false, error: 'Failed to fetch high demand products' }
  }
}

// ============================================================
// ACTION 5 — getPeakDay
// Finds which day of the week gets the most orders.
// Looks at last 4 weeks of data for accuracy.
// ============================================================
export async function getPeakDay(): Promise<ActionResult<{
  dayName: string
  avgOrders: number
  totalOrders: number
  insight: string
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const from = new Date()
    from.setDate(from.getDate() - 28)

    const { data: orders } = await supabase
      .from('orders')
      .select('created_at')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', from.toISOString())

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCounts: Record<number, number> = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 }

    for (const order of orders ?? []) {
      const day = new Date(order.created_at).getDay()
      dayCounts[day]++
    }

    const sorted = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])
    const [peakDayNum, peakCount] = sorted[0]
    const peakName = DAY_NAMES[parseInt(peakDayNum)]
    const avgOrders = Math.round(peakCount / 4)

    const insight =
      peakCount === 0
        ? 'Not enough data yet. Needs at least 1 week of orders.'
        : `${peakName} is your busiest day with ~${avgOrders} orders on average`

    return {
      success: true,
      data: {
        dayName: peakCount > 0 ? peakName : 'N/A',
        avgOrders,
        totalOrders: peakCount,
        insight,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to calculate peak day' }
  }
}

// ============================================================
// ACTION 6 — getBestSeller
// Single item with highest total revenue this month.
// ============================================================
export async function getBestSeller(): Promise<ActionResult<{
  name: string
  category: string
  revenue: number
  orders: number
  isVeg: boolean
  insight: string
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const month = getDateBoundaries('month')

    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        menu_item_id, quantity, price,
        menu_items ( name, category, is_veg ),
        orders!inner ( created_at, restaurant_id, status )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .not('orders.status', 'in', '("cancelled","pending")')
      .gte('orders.created_at', month.from)

    const itemMap: Record<string, {
      name: string; category: string; isVeg: boolean
      qty: number; revenue: number
    }> = {}

    for (const oi of orderItems ?? []) {
      const mi = oi.menu_items as any
      const key = oi.menu_item_id
      if (!itemMap[key]) {
        itemMap[key] = {
          name: mi?.name ?? 'Unknown',
          category: mi?.category ?? '',
          isVeg: mi?.is_veg ?? true,
          qty: 0, revenue: 0,
        }
      }
      itemMap[key].qty += oi.quantity ?? 1
      itemMap[key].revenue += (oi.price ?? 0) * (oi.quantity ?? 1)
    }

    const sorted = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue)
    const best = sorted[0]

    if (!best) {
      return {
        success: true,
        data: {
          name: 'No data yet', category: '', revenue: 0,
          orders: 0, isVeg: true,
          insight: 'Start taking orders to see your best seller'
        }
      }
    }

    return {
      success: true,
      data: {
        name: best.name,
        category: best.category,
        revenue: Math.round(best.revenue),
        orders: best.qty,
        isVeg: best.isVeg,
        insight: `₹${Math.round(best.revenue).toLocaleString('en-IN')} revenue from ${best.qty} orders this month`,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to fetch best seller' }
  }
}

// ============================================================
// ACTION 7 — getLowDemandItem
// Item that is available but ordered the least.
// Helps owner decide what to remove or discount.
// ============================================================
export async function getLowDemandItem(): Promise<ActionResult<{
  name: string
  category: string
  orders: number
  isVeg: boolean
  insight: string
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const month = getDateBoundaries('month')

    // Get all active menu items
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name, category, is_veg')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)

    if (!menuItems || menuItems.length === 0) {
      return {
        success: true,
        data: {
          name: 'No items', category: '', orders: 0, isVeg: true,
          insight: 'Add menu items to see low demand analysis'
        }
      }
    }

    // Get order counts for this month
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        menu_item_id, quantity,
        orders!inner ( created_at, restaurant_id, status )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .not('orders.status', 'in', '("cancelled","pending")')
      .gte('orders.created_at', month.from)

    const itemCounts: Record<string, number> = {}
    for (const oi of orderItems ?? []) {
      itemCounts[oi.menu_item_id] = (itemCounts[oi.menu_item_id] ?? 0) + (oi.quantity ?? 1)
    }

    // Find active item with lowest orders
    const withCounts = menuItems.map(item => ({
      ...item,
      orders: itemCounts[item.id] ?? 0,
    }))

    // Sort by orders ascending, pick the one with least orders
    // but only if there are items that have been ordered at least once
    // (exclude items never ordered — that's a different issue)
    const orderedItems = withCounts.filter(i => i.orders > 0)
    const neverOrdered = withCounts.filter(i => i.orders === 0)

    let lowItem: typeof withCounts[0]

    if (neverOrdered.length > 0) {
      // Items never ordered are lower demand than ordered items
      lowItem = neverOrdered[Math.floor(Math.random() * Math.min(neverOrdered.length, 3))]
    } else if (orderedItems.length > 0) {
      lowItem = orderedItems.sort((a, b) => a.orders - b.orders)[0]
    } else {
      return {
        success: true,
        data: {
          name: 'No orders yet', category: '', orders: 0, isVeg: true,
          insight: 'Place some orders to see demand analysis'
        }
      }
    }

    const insight =
      lowItem.orders === 0
        ? `"${lowItem.name}" has never been ordered. Consider promoting it or removing it.`
        : `"${lowItem.name}" has only ${lowItem.orders} orders this month. Consider a discount or promotion.`

    return {
      success: true,
      data: {
        name: lowItem.name,
        category: lowItem.category,
        orders: lowItem.orders,
        isVeg: lowItem.is_veg,
        insight,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to fetch low demand item' }
  }
}

// ============================================================
// ACTION 8 — getPreparationInsight
// Calculates average time from order confirmed to served.
// Tells owner how fast the kitchen is.
// ============================================================
export async function getPreparationInsight(): Promise<ActionResult<{
  avgMinutes: number
  insight: string
  performance: 'fast' | 'normal' | 'slow'
  todayOrders: number
  servedToday: number
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const today = getDateBoundaries('today')
    const week = getDateBoundaries('week')

    // Orders today
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id, status, created_at, updated_at')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', today.from)
      .lte('created_at', today.to)

    // Served orders this week to calculate avg time
    const { data: servedOrders } = await supabase
      .from('orders')
      .select('created_at, updated_at')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'served')
      .gte('created_at', week.from)
      .lte('created_at', week.to)

    const servedToday = todayOrders?.filter(o => o.status === 'served').length ?? 0

    let avgMinutes = 0
    if (servedOrders && servedOrders.length > 0) {
      const times = servedOrders
        .map(o => {
          const created = new Date(o.created_at).getTime()
          const updated = new Date(o.updated_at).getTime()
          return (updated - created) / 60000 // minutes
        })
        .filter(t => t > 0 && t < 120) // ignore outliers > 2 hours

      if (times.length > 0) {
        avgMinutes = Math.round(times.reduce((s, t) => s + t, 0) / times.length)
      }
    }

    const performance: 'fast' | 'normal' | 'slow' =
      avgMinutes === 0 ? 'normal' :
      avgMinutes <= 10 ? 'fast' :
      avgMinutes <= 25 ? 'normal' : 'slow'

    const insight =
      avgMinutes === 0
        ? 'Complete some orders to see preparation time insights.'
        : performance === 'fast'
        ? `Excellent! Orders are ready in ~${avgMinutes} mins on average. Customers love fast service.`
        : performance === 'normal'
        ? `Average preparation time is ${avgMinutes} minutes. Good performance.`
        : `Orders taking ~${avgMinutes} minutes on average. Consider streamlining the kitchen.`

    return {
      success: true,
      data: {
        avgMinutes,
        insight,
        performance,
        todayOrders: todayOrders?.length ?? 0,
        servedToday,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to fetch preparation insight' }
  }
}

// ============================================================
// ACTION 9 — getFullAnalytics (main action)
// Runs ALL analytics queries in parallel.
// The Analytics page calls this ONCE and gets everything.
// ============================================================
export async function getFullAnalytics(): Promise<ActionResult<{
  health: Awaited<ReturnType<typeof getBusinessHealth>> extends { success: true; data: infer D } ? D : never
  weeklyStats: Awaited<ReturnType<typeof getWeeklyStats>> extends { success: true; data: infer D } ? D : never
  salesChart: Awaited<ReturnType<typeof getSalesChartData>> extends { success: true; data: infer D } ? D : never
  highDemand: Awaited<ReturnType<typeof getHighDemandProducts>> extends { success: true; data: infer D } ? D : never
  peakDay: Awaited<ReturnType<typeof getPeakDay>> extends { success: true; data: infer D } ? D : never
  bestSeller: Awaited<ReturnType<typeof getBestSeller>> extends { success: true; data: infer D } ? D : never
  lowDemand: Awaited<ReturnType<typeof getLowDemandItem>> extends { success: true; data: infer D } ? D : never
  prepInsight: Awaited<ReturnType<typeof getPreparationInsight>> extends { success: true; data: infer D } ? D : never
}>> {
  try {
    // All 8 queries fire simultaneously
    const [health, weeklyStats, salesChart, highDemand, peakDay, bestSeller, lowDemand, prepInsight] =
      await Promise.all([
        getBusinessHealth(),
        getWeeklyStats(),
        getSalesChartData(),
        getHighDemandProducts(),
        getPeakDay(),
        getBestSeller(),
        getLowDemandItem(),
        getPreparationInsight(),
      ])

    // Extract data with fallbacks
    const extract = <T>(result: ActionResult<T>, fallback: T): T =>
      result.success ? result.data : fallback

    return {
      success: true,
      data: {
        health: extract(health, { score: 0, status: 'Needs Attention', statusColor: '#dc2626', trend: 'stable', trendPercent: 0, details: 'No data available' }) as any,
        weeklyStats: extract(weeklyStats, { ordersThisWeek: 0, ordersLastWeek: 0, ordersTrend: 0, revenueThisWeek: 0, revenueLastWeek: 0, revenueTrend: 0, topSellingItem: null, topSellingCount: 0, peakTime: null, peakTimeOrders: 0 }) as any,
        salesChart: extract(salesChart, { days: [], maxRevenue: 0, totalWeekRevenue: 0 }) as any,
        highDemand: extract(highDemand, { products: [] }) as any,
        peakDay: extract(peakDay, { dayName: 'N/A', avgOrders: 0, totalOrders: 0, insight: 'No data yet' }) as any,
        bestSeller: extract(bestSeller, { name: 'No data', category: '', revenue: 0, orders: 0, isVeg: true, insight: 'No orders yet' }) as any,
        lowDemand: extract(lowDemand, { name: 'No data', category: '', orders: 0, isVeg: true, insight: 'No data yet' }) as any,
        prepInsight: extract(prepInsight, { avgMinutes: 0, insight: 'No data yet', performance: 'normal', todayOrders: 0, servedToday: 0 }) as any,
      }
    }
  } catch (err) {
    return { success: false, error: 'Failed to load analytics' }
  }
}

// ============================================================
// ACTION 10 — exportAnalyticsReport
// Generates a downloadable CSV of this month's analytics.
// ============================================================
export async function exportAnalyticsReport(): Promise<ActionResult<{
  csv: string
  filename: string
}>> {
  try {
    const restaurantId = await getOwnerRestaurantId()
    if (!restaurantId) return { success: false, error: 'Not authenticated' }

    const supabase = createAdminSupabase()
    const month = getDateBoundaries('month')

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, created_at, status, total_amount,
        payment_method, payment_status,
        tables ( table_number ),
        order_items (
          quantity, price,
          menu_items ( name, category )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("cancelled","pending")')
      .gte('created_at', month.from)
      .order('created_at', { ascending: false })

    const headers = ['Date', 'Time', 'Order ID', 'Table', 'Items', 'Total (₹)', 'Payment', 'Status']

    const rows = (orders ?? []).map(o => {
      const d = new Date(o.created_at)
      const date = d.toLocaleDateString('en-IN', { timeZone: IST })
      const time = d.toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' })
      const table = (o.tables as any)?.table_number ?? 'N/A'
      const items = (o.order_items as any[])
        ?.map((oi: any) => `${oi.quantity}x ${oi.menu_items?.name ?? '?'}`)
        .join(' + ') ?? ''

      const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
      return [
        esc(date), esc(time),
        esc(o.id.slice(0, 8).toUpperCase()),
        esc(String(table)),
        esc(items),
        o.total_amount?.toFixed(2) ?? '0',
        esc(o.payment_method),
        esc(o.status),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const today = new Date().toLocaleDateString('en-CA', { timeZone: IST })
    const filename = `serveflow-analytics-${today}.csv`

    return { success: true, data: { csv, filename } }
  } catch (err) {
    return { success: false, error: 'Failed to generate report' }
  }
}

/**
 * ============================================================
 * MENUQR — SUPABASE REALTIME HOOK
 * File: src/hooks/useRealtime.ts
 *
 * This is the hook that makes the kitchen display live.
 * Every chef dashboard, juice station, and server dashboard
 * imports this hook to receive order updates instantly
 * via WebSocket — no polling, no page refresh.
 *
 * WHAT IT DOES:
 *  1. On mount — fetches all active orders for the
 *     restaurant via the browser Supabase client
 *     (same query shape as getActiveOrdersByRestaurantId
 *     in supabase.ts but using the browser client so it
 *     works in Client Components)
 *  2. Opens ONE Supabase Realtime channel per restaurant
 *     and subscribes to three event streams:
 *       a. orders INSERT   → new confirmed/cash order arrives
 *          → adds full order to state (with a re-fetch
 *            to get joined order_items + menu_items data)
 *       b. orders UPDATE   → status changes (preparing/ready/served)
 *          → updates the matching order in state in-place
 *          → removes 'served' and 'cancelled' orders from list
 *       c. order_items UPDATE → item-level status changes
 *          → updates the specific item inside its parent order
 *  3. Exposes a filtered view of orders based on the
 *     station prop — chef sees only food, juice sees only
 *     beverages, server sees everything
 *  4. On unmount — removes the channel cleanly to prevent
 *     memory leaks and duplicate subscriptions
 *  5. Includes a fallback poll every 30 seconds in case
 *     the WebSocket connection drops silently (e.g. mobile
 *     switching from WiFi to 4G mid-shift)
 *
 * THREE CHANNEL EVENTS EXPLAINED:
 *
 *   orders INSERT:
 *     Fires when create-order/route.ts inserts a cash order
 *     OR when razorpay-webhook/route.ts updates an order to
 *     'confirmed' (triggers the Realtime UPDATE not INSERT).
 *     For cash: new row → INSERT event → kitchen sees it.
 *     For online: existing pending row → UPDATE to confirmed
 *     → UPDATE event → kitchen sees it.
 *
 *   orders UPDATE:
 *     Fires on every order status change:
 *       - razorpay-webhook → pending → confirmed
 *       - update-order-status → confirmed → preparing
 *       - update-order-status → preparing → ready
 *       - update-order-status → ready → served (REMOVE from list)
 *     The hook removes served/cancelled orders automatically.
 *
 *   order_items UPDATE:
 *     Fires when update-order-status changes item status.
 *     The hook finds the parent order and updates that
 *     specific item in-place — no full re-fetch needed.
 *     This is what makes the "preparing" badge on each
 *     item card update live as the chef works through items.
 *
 * STATION FILTERING:
 *   station prop controls which orders are returned:
 *     'food'  → order has at least one item with station 'food' or 'both'
 *     'juice' → order has at least one item with station 'juice' or 'both'
 *     null    → all orders (server dashboard)
 *   Filtering is done in JS after fetching — Realtime does
 *   not support filtered subscriptions at the row level for
 *   joined data, so we receive all orders and filter locally.
 *
 * CONNECTS TO:
 *  ← /kitchen/chef page uses this with station='food'
 *  ← /kitchen/juice page uses this with station='juice'
 *  ← /kitchen/server page uses this with station=null
 *  ← /dashboard page uses this with station=null (owner view)
 *  → lib/supabase.ts (createBrowserSupabase — browser client)
 *  → types/database.ts (OrderWithItems, Station, OrderStatus,
 *                        ItemStatus, KitchenSession)
 *  → Supabase Realtime (channels enabled in 001_initial.sql)
 *  → update-order-status/route.ts (fires the UPDATE events)
 *  → create-order/route.ts + razorpay-webhook (fire INSERT/UPDATE)
 * ============================================================
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createBrowserSupabase } from '@/lib/supabase/client'
import type {
  OrderWithItems,
  OrderStatus,
  ItemStatus,
  Station,
} from '@/types/database'

// ─────────────────────────────────────────────
// HOOK PROPS
// restaurantId: from KitchenSession.restaurantId
//               (set by verify-pin/route.ts response)
// station: filters which orders this dashboard sees
//   'food'  → chef dashboard
//   'juice' → juice station dashboard
//   null    → server dashboard + owner dashboard (all)
// ─────────────────────────────────────────────
interface UseRealtimeProps {
  restaurantId: string
  station: Station | null
}

// ─────────────────────────────────────────────
// HOOK RETURN TYPE
// What kitchen dashboard components receive
// ─────────────────────────────────────────────
interface UseRealtimeReturn {
  orders: OrderWithItems[]        // Filtered active orders
  isLoading: boolean              // True during initial fetch
  isConnected: boolean            // WebSocket connection status
  error: string | null            // Error message if any
  secondsAgo: number
  refetch: () => Promise<void>    // Manual refresh trigger
}

// ─────────────────────────────────────────────
// FALLBACK POLL INTERVAL
// If WebSocket drops silently, this ensures orders
// are still refreshed every 30 seconds.
// Not a replacement for Realtime — just a safety net.
// ─────────────────────────────────────────────
const FALLBACK_POLL_MS = 30_000

// ─────────────────────────────────────────────
// HELPER — Fetch all active orders from browser
// Same join structure as getActiveOrdersByRestaurantId
// in supabase.ts but uses createBrowserSupabase() so
// it works inside Client Components (hooks can only
// run in client-side code).
// Excludes 'served' and 'cancelled' — exactly matching
// the server-side helper in supabase.ts.
// ─────────────────────────────────────────────
async function fetchActiveOrders(
  restaurantId: string
): Promise<OrderWithItems[]> {
  const supabase = createBrowserSupabase()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      tables ( id, table_number, table_name ),
      order_items (
        *,
        menu_items ( id, name, category, station, is_veg )
      )
    `)
    .eq('restaurant_id', restaurantId)
    .not('status', 'in', '("served","cancelled")')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return (data ?? []) as unknown as OrderWithItems[]
}

// ─────────────────────────────────────────────
// HELPER — Fetch a single order by ID (with joins)
// Used when a Realtime INSERT fires — the INSERT
// payload only contains the raw order row without
// joined tables or order_items. We re-fetch the
// full order to get all the data the kitchen needs.
// ─────────────────────────────────────────────
async function fetchSingleOrder(
  orderId: string
): Promise<OrderWithItems | null> {
  const supabase = createBrowserSupabase()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      tables ( id, table_number, table_name ),
      order_items (
        *,
        menu_items ( id, name, category, station, is_veg )
      )
    `)
    .eq('id', orderId)
    .single()

  if (error || !data) return null
  return data as unknown as OrderWithItems
}

// ─────────────────────────────────────────────
// HELPER — Filter orders by station
// Applied after fetching to determine which orders
// a specific kitchen dashboard should display.
//
// Logic:
//   station = 'food'  → show orders that have at least
//                        one item with station 'food' or 'both'
//   station = 'juice' → show orders that have at least
//                        one item with station 'juice' or 'both'
//   station = null    → show all orders (no filter)
//
// Note: An order with both food AND juice items appears
// on BOTH the chef and juice dashboards — each station
// only sees and acts on their own items within the order.
// ─────────────────────────────────────────────
function filterByStation(
  orders: OrderWithItems[],
  station: Station | null
): OrderWithItems[] {
  if (!station) return orders

  return orders.filter((order) =>
    order.order_items.some(
      (item) =>
        item.station === station ||
        item.station === 'both'
    )
  )
}

// ─────────────────────────────────────────────
// HELPER — Should this order be visible?
// Orders in 'served' or 'cancelled' status are
// removed from kitchen displays automatically.
// 'pending' orders (online payment not yet confirmed)
// are also hidden — kitchen only sees confirmed orders.
// ─────────────────────────────────────────────
const HIDDEN_STATUSES: OrderStatus[] = ['served', 'cancelled', 'pending']

function isOrderVisible(status: OrderStatus): boolean {
  return !HIDDEN_STATUSES.includes(status)
}

// ─────────────────────────────────────────────
// MAIN HOOK — useRealtime
// ─────────────────────────────────────────────
export function useRealtime({
  restaurantId,
  station,
}: UseRealtimeProps): UseRealtimeReturn {
  const [allOrders, setAllOrders] = useState<OrderWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  // Ref to track the Realtime channel so we can
  // remove it on unmount without stale closure issues
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastUpdateRef = useRef<number>(Date.now())

  // Ref for the fallback poll interval
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── FETCH: Initial load + manual refetch ───────
  const fetchOrders = useCallback(async () => {
    try {
      setError(null)
      const orders = await fetchActiveOrders(restaurantId)
      setAllOrders(orders)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch orders'
      setError(message)
      console.error('[MenuQR Realtime] Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  // ── REALTIME: Subscribe to order events ────────
  const setupRealtime = useCallback(() => {
    const supabase = createBrowserSupabase()

    // Channel name is unique per restaurant —
    // multiple browser tabs for the same restaurant
    // share the same underlying WebSocket connection
    const channelName = `kitchen_${restaurantId}`

    // Remove existing channel before re-subscribing
    // (handles React StrictMode double-invoke in development)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(channelName)

      // ── EVENT 1: orders INSERT ──────────────────
      // Fires when a CASH order is placed
      // (create-order/route.ts inserts status:'confirmed' directly)
      // Online orders arrive via UPDATE (pending → confirmed)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          // Filter at the DB level — only this restaurant's orders
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          lastUpdateRef.current = Date.now()
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)
            oscillator.frequency.value = 800
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.3)
          } catch {}

          const newOrderRaw = payload.new as { id: string; status: string }


          // Skip pending orders — kitchen only sees confirmed+
          if (!isOrderVisible(newOrderRaw.status as OrderStatus)) return

          // Re-fetch the full order with joins — INSERT payload
          // only has the raw columns, not the joined data we need
          const fullOrder = await fetchSingleOrder(newOrderRaw.id)
          if (!fullOrder) return

          setAllOrders((prev) => {
            // Idempotency — don't add if already exists
            const exists = prev.some((o) => o.id === fullOrder.id)
            if (exists) return prev
            // Insert in chronological order (newest first)
            return [...prev, fullOrder].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
          })
        }
      )

      // ── EVENT 2: orders UPDATE ──────────────────
      // Fires on every order status change:
      //   pending → confirmed  (razorpay-webhook confirms payment)
      //   confirmed → preparing (update-order-status start_item)
      //   preparing → ready    (update-order-status all items done)
      //   ready → served       (update-order-status serve_order)
      //   * → cancelled        (payment failed / manual)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          lastUpdateRef.current = Date.now()
          const updatedRaw = payload.new as {
            id: string
            status: string
            payment_status: string
            updated_at: string
            assigned_staff_id?: string | null
            assigned_staff_name?: string | null
            assigned_at?: string | null
          }

          const newStatus = updatedRaw.status as OrderStatus


          // Remove served/cancelled orders from the kitchen board
          if (!isOrderVisible(newStatus)) {
            setAllOrders((prev) =>
              prev.filter((o) => o.id !== updatedRaw.id)
            )
            return
          }

          // If order just became 'confirmed' (online payment captured)
          // it may not exist in our state yet — fetch and add it
          setAllOrders((prev) => {
            const existingIndex = prev.findIndex((o) => o.id === updatedRaw.id)

            if (existingIndex === -1) {
              // Not in state yet — will be added by async fetch below
              return prev
            }

            // Update the order status in-place
            // Keep all joined data (order_items, tables) unchanged
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              status: newStatus,
              payment_status: updatedRaw.payment_status as never,
              updated_at: updatedRaw.updated_at,
              assigned_staff_id: updatedRaw.assigned_staff_id as never,
              assigned_staff_name: updatedRaw.assigned_staff_name as never,
              assigned_at: updatedRaw.assigned_at as never,
            }
            return updated
          })

          // If it wasn't in state (just confirmed from pending),
          // fetch the full order and add it
          setAllOrders((prev) => {
            const exists = prev.some((o) => o.id === updatedRaw.id)
            if (!exists && isOrderVisible(newStatus)) {
              // Async add — fetch full order then update state
              fetchSingleOrder(updatedRaw.id).then((fullOrder) => {
                if (!fullOrder) return
                setAllOrders((current) => {
                  const alreadyAdded = current.some((o) => o.id === fullOrder.id)
                  if (alreadyAdded) return current
                  return [...current, fullOrder].sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                })
              })
            }
            return prev
          })
        }
      )

      // ── EVENT 3: order_items UPDATE ────────────
      // Fires when update-order-status changes an item's
      // status (pending → preparing → done).
      // We update the specific item inside its parent order
      // in-place — no full re-fetch needed.
      // This is what makes the item card badges update live.
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
        },
        (payload) => {
          lastUpdateRef.current = Date.now()
          const updatedItem = payload.new as {
            id: string
            order_id: string
            status: string
          }

          const newItemStatus = updatedItem.status as ItemStatus


          setAllOrders((prev) =>
            prev.map((order) => {
              // Only update the parent order that contains this item
              if (order.id !== updatedItem.order_id) return order

              return {
                ...order,
                order_items: order.order_items.map((item) =>
                  item.id === updatedItem.id
                    ? { ...item, status: newItemStatus }
                    : item
                ),
              }
            })
          )
        }
      )

      // ── CONNECTION STATUS ────────────────────────
      // Track WebSocket connection health.
      // isConnected drives the pulsing dot indicator
      // in the kitchen dashboard top bar.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
          fetchOrders() // Re-fetch on reconnect to catch missed events
          console.info(
            `[MenuQR Realtime] Connected to channel: ${channelName}`
          )
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError('Live updates disconnected. Reconnecting...')
          console.warn(
            `[MenuQR Realtime] Channel error on: ${channelName}`
          )
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          console.warn(`[MenuQR Realtime] Timed out: ${channelName}`)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel
  }, [restaurantId])

  // ── FALLBACK POLL ───────────────────────────────
  // Runs every 30 seconds as a safety net.
  // Ensures kitchen never shows stale data even if
  // the WebSocket drops silently (network glitch,
  // tablet sleep mode, router restart mid-shift).
  const startFallbackPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    pollIntervalRef.current = setInterval(() => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current
      if (timeSinceUpdate > 15000) {
        fetchOrders()
      }
    }, 10000)
  }, [fetchOrders])

  // ── EFFECT: Setup on mount ──────────────────────
  useEffect(() => {
    // 1. Initial data fetch
    fetchOrders()

    // 2. Subscribe to Realtime
    setupRealtime()

    // 3. Start fallback poll
    startFallbackPoll()

    // 4. Update secondsAgo
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdateRef.current) / 1000))
    }, 1000)

    // 5. Visibility API
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount — CRITICAL
    // Without this, navigating away leaves ghost subscriptions
    // that fire state updates on unmounted components (memory leak)
    return () => {
      const supabase = createBrowserSupabase()

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [restaurantId]) // Re-subscribe if restaurantId changes

  // ── COMPUTED: Apply station filter ─────────────
  // Station filtering happens here in JS — not in the
  // Supabase query — because Realtime doesn't support
  // filtered subscriptions for joined table data.
  // Performance is fine: kitchens typically have 5-30
  // active orders at any time.
  const filteredOrders = filterByStation(allOrders, station)

  return {
    orders: filteredOrders,
    isLoading,
    isConnected,
    error,
    secondsAgo,
    refetch: fetchOrders,
  }
}

// ─────────────────────────────────────────────
// SECONDARY HOOK — useOrderRealtime (owner dashboard)
// Thin wrapper around useRealtime with station=null.
// Owner dashboard sees all orders across all stations.
// Exports the raw allOrders count (not filtered)
// for the "live orders" pill badge in the dashboard header.
// ─────────────────────────────────────────────
export function useOwnerRealtime(restaurantId: string) {
  return useRealtime({ restaurantId, station: null })
}

// ─────────────────────────────────────────────
// SECONDARY HOOK — useKitchenRealtime
// Used by all three kitchen dashboards.
// Station is passed in from the session role:
//   role='chef'   → station='food'
//   role='juice'  → station='juice'
//   role='server' → station=null
// ─────────────────────────────────────────────
export function useKitchenRealtime(
  restaurantId: string,
  station: Station | null
) {
  return useRealtime({ restaurantId, station })
}

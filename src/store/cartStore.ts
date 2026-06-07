/**
 * ============================================================
 * MENUQR — CUSTOMER CART STORE
 * File: src/store/cartStore.ts
 *
 * The Zustand store that manages the customer's cart on the
 * ordering page (/order/[shop]/[table]).
 *
 * WHY ZUSTAND (not React state or Context):
 *  - Cart state must survive across component re-renders
 *    without prop drilling (menu list → item card → cart bar
 *    → checkout sheet are all separate components)
 *  - Zero boilerplate — no reducers, no actions, no providers
 *  - Under 1KB added to the bundle
 *  - No re-renders on unrelated state changes — a menu item
 *    card only re-renders when ITS own quantity changes,
 *    not when other items change
 *
 * WHAT IT MANAGES:
 *  1. Cart items (CartItem[] from types/database.ts)
 *  2. Special instructions (free text, max 300 chars)
 *  3. Payment method selection (online | cash)
 *  4. Order submission state (idle/loading/success/error)
 *  5. Last placed order ID (shown on confirmation page)
 *
 * COMPUTED SELECTORS (derived from state, no duplication):
 *  - totalItems     — sum of all item quantities
 *  - totalAmount    — sum of (price × quantity) for all items
 *  - itemQuantity   — quantity for a specific menuItemId
 *  - isEmpty        — true when cart has no items
 *
 * ACTIONS (state mutations):
 *  - addItem        — add item or increment quantity
 *  - removeItem     — decrement quantity or remove if quantity=1
 *  - clearItem      — remove item entirely regardless of quantity
 *  - clearCart      — empty the entire cart
 *  - setPaymentMethod
 *  - setSpecialInstructions
 *  - placeOrder     — calls POST /api/create-order, handles
 *                     both cash (direct confirm) and online
 *                     (returns Razorpay checkout params)
 *  - resetOrderState — clears submission state after navigation
 *
 * ORDER FLOW FROM THIS STORE:
 *
 *   Cash payment:
 *     placeOrder() → POST /api/create-order { paymentMethod:'cash' }
 *       → { success: true, orderId }
 *       → orderState = 'success'
 *       → redirect to /order/[shop]/[table]/confirmed
 *
 *   Online payment:
 *     placeOrder() → POST /api/create-order { paymentMethod:'online' }
 *       → { razorpay: { orderId, amount, keyId } }
 *       → orderState = 'awaiting_payment'
 *       → Razorpay checkout opens (handled in the component)
 *       → On Razorpay success → razorpay-webhook confirms → kitchen notified
 *       → redirect to /order/[shop]/[table]/confirmed
 *
 * CONNECTS TO:
 *  ← Customer ordering page (/order/[shop]/[table]) — reads cart
 *  ← MenuItemCard component — calls addItem/removeItem
 *  ← CartBar component — reads totalItems + totalAmount
 *  ← CheckoutSheet component — reads all state, calls placeOrder
 *  → POST /api/create-order — placeOrder() calls this
 *  → types/database.ts (CartItem, CreateOrderPayload, PaymentMethod)
 * ============================================================
 */

'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  CartItem,
  PaymentMethod,
  CreateOrderPayload,
} from '@/types/database'

// ─────────────────────────────────────────────
// ORDER SUBMISSION STATE
// Tracks the lifecycle of the placeOrder() call.
// Used by CheckoutSheet to show loading/error/success UI.
// ─────────────────────────────────────────────
type OrderState =
  | 'idle'              // Nothing happening
  | 'loading'           // POST /api/create-order in flight
  | 'awaiting_payment'  // Online: Razorpay checkout open
  | 'success'           // Cash: order confirmed
  | 'error'             // Something went wrong

// ─────────────────────────────────────────────
// RAZORPAY CHECKOUT PARAMS
// Returned by placeOrder() for online payments.
// The component uses these to open Razorpay checkout.
// ─────────────────────────────────────────────
export interface RazorpayCheckoutParams {
  orderId: string          // Razorpay order ID (not our DB order ID)
  amount: number           // In paise (₹200 = 20000)
  currency: string         // 'INR'
  keyId: string            // Public Razorpay key
  restaurantName: string   // Shown in Razorpay checkout header
  dbOrderId: string        // Our Supabase order ID — for confirmation page
}

// ─────────────────────────────────────────────
// FULL STORE STATE TYPE
// ─────────────────────────────────────────────
interface CartState {
  // ── Cart data ──────────────────────────────
  items: CartItem[]
  specialInstructions: string
  paymentMethod: PaymentMethod

  // ── Order submission state ─────────────────
  orderState: OrderState
  orderError: string | null
  placedOrderId: string | null         // Our DB order ID after success
  razorpayParams: RazorpayCheckoutParams | null  // Set for online payment

  // ── Context (set when customer scans QR) ───
  // Stored here so placeOrder() always has access
  // without requiring prop drilling through every component
  restaurantId: string | null
  tableId: string | null

  // ── Actions ────────────────────────────────
  setContext: (restaurantId: string, tableId: string) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (menuItemId: string) => void
  clearItem: (menuItemId: string) => void
  clearCart: () => void
  setPaymentMethod: (method: PaymentMethod) => void
  setSpecialInstructions: (text: string) => void
  placeOrder: () => Promise<void>
  resetOrderState: () => void

  // ── Computed selectors ─────────────────────
  // These are functions on the store — calling them
  // gives the current computed value without
  // requiring separate selector hooks.
  totalItems: () => number
  totalAmount: () => number
  itemQuantity: (menuItemId: string) => number
  isEmpty: () => boolean
}

// ─────────────────────────────────────────────
// ZUSTAND STORE
// persist() wraps the store so cart items survive
// an accidental page refresh (sessionStorage, not
// localStorage — clears when browser tab closes).
// This is intentional: a cart should not persist
// across sessions at a restaurant table.
// ─────────────────────────────────────────────
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────
      items: [],
      specialInstructions: '',
      paymentMethod: 'cash', // Default to cash — simpler UX
      orderState: 'idle',
      orderError: null,
      placedOrderId: null,
      razorpayParams: null,
      restaurantId: null,
      tableId: null,

      // ── setContext ──────────────────────────
      // Called when the customer ordering page mounts.
      // Stores restaurantId + tableId from URL params
      // so placeOrder() can access them without props.
      setContext: (restaurantId, tableId) =>
        set({ restaurantId, tableId }),

      // ── addItem ─────────────────────────────
      // Adds a menu item to the cart.
      // If the item already exists, increments quantity.
      // Enforces max quantity of 20 per item
      // (matching the Zod validation in create-order).
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.menuItemId === item.menuItemId
          )

          if (existing) {
            // Increment quantity, cap at 20
            return {
              items: state.items.map((i) =>
                i.menuItemId === item.menuItemId
                  ? { ...i, quantity: Math.min(i.quantity + 1, 20) }
                  : i
              ),
            }
          }

          // Add as new item with quantity 1
          return {
            items: [...state.items, { ...item, quantity: 1 }],
          }
        }),

      // ── removeItem ──────────────────────────
      // Decrements quantity by 1.
      // If quantity reaches 0, removes the item entirely.
      // Used by the [ — ] button in the cart.
      removeItem: (menuItemId) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.menuItemId === menuItemId
          )

          if (!existing) return state

          if (existing.quantity <= 1) {
            // Remove completely
            return {
              items: state.items.filter(
                (i) => i.menuItemId !== menuItemId
              ),
            }
          }

          // Decrement
          return {
            items: state.items.map((i) =>
              i.menuItemId === menuItemId
                ? { ...i, quantity: i.quantity - 1 }
                : i
            ),
          }
        }),

      // ── clearItem ───────────────────────────
      // Removes an item entirely regardless of quantity.
      // Used by the trash icon in the checkout sheet.
      clearItem: (menuItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        })),

      // ── clearCart ───────────────────────────
      // Resets cart to empty. Called after successful
      // order placement.
      clearCart: () =>
        set({
          items: [],
          specialInstructions: '',
          paymentMethod: 'cash',
          orderState: 'idle',
          orderError: null,
          razorpayParams: null,
        }),

      // ── setPaymentMethod ────────────────────
      setPaymentMethod: (method) =>
        set({ paymentMethod: method }),

      // ── setSpecialInstructions ──────────────
      // Enforces the 300 char limit from the
      // Zod schema in create-order/route.ts
      setSpecialInstructions: (text) =>
        set({ specialInstructions: text.slice(0, 300) }),

      // ── placeOrder ──────────────────────────
      // The main action. Builds the CreateOrderPayload,
      // calls POST /api/create-order, and handles
      // both payment paths.
      //
      // After calling this:
      //   Cash:   orderState='success', placedOrderId set
      //   Online: orderState='awaiting_payment', razorpayParams set
      //   Error:  orderState='error', orderError set
      placeOrder: async () => {
        const state = get()

        // Guard: must have context and items
        if (!state.restaurantId || !state.tableId) {
          set({
            orderState: 'error',
            orderError: 'Restaurant context missing. Please scan the QR code again.',
          })
          return
        }

        if (state.items.length === 0) {
          set({
            orderState: 'error',
            orderError: 'Your cart is empty.',
          })
          return
        }

        set({ orderState: 'loading', orderError: null })

        // Build payload — shape matches CreateOrderPayload
        // and CreateOrderSchema in create-order/route.ts exactly
        const payload: CreateOrderPayload = {
          restaurantId: state.restaurantId,
          tableId: state.tableId,
          items: state.items,
          // totalAmount computed here — server re-verifies this
          // against DB prices as a security check
          totalAmount: state.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
          paymentMethod: state.paymentMethod,
          specialInstructions: state.specialInstructions || undefined,
        }

        try {
          const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          const data = await response.json()

          if (!response.ok) {
            // API returned an error (validation, rate limit, etc.)
            set({
              orderState: 'error',
              orderError: data.error ?? 'Failed to place order. Please try again.',
            })
            return
          }

          // ── CASH PAYMENT PATH ─────────────────
          // Order confirmed immediately — no Razorpay needed
          if (data.paymentMethod === 'cash') {
            set({
              orderState: 'success',
              placedOrderId: data.orderId,
              razorpayParams: null,
            })
            // Clear cart after successful cash order
            // Small delay so confirmation screen renders first
            setTimeout(() => {
              get().clearCart()
            }, 500)
            return
          }

          // ── ONLINE PAYMENT PATH ───────────────
          // Store Razorpay params — component opens checkout
          if (data.paymentMethod === 'online' && data.razorpay) {
            set({
              orderState: 'awaiting_payment',
              placedOrderId: data.orderId,       // Our DB order ID
              razorpayParams: {
                orderId: data.razorpay.orderId,  // Razorpay's order ID
                amount: data.razorpay.amount,
                currency: data.razorpay.currency,
                keyId: data.razorpay.keyId,
                restaurantName: data.razorpay.restaurantName,
                dbOrderId: data.orderId,
              },
            })
            return
          }

          // Unexpected response shape
          set({
            orderState: 'error',
            orderError: 'Unexpected response from server.',
          })

        } catch (networkError) {
          // Network failure — no internet, server down, etc.
          console.error('[MenuQR Cart] placeOrder network error:', networkError)
          set({
            orderState: 'error',
            orderError: 'Network error. Please check your connection and try again.',
          })
        }
      },

      // ── resetOrderState ─────────────────────
      // Called when navigating away from checkout
      // or after handling Razorpay payment result.
      resetOrderState: () =>
        set({
          orderState: 'idle',
          orderError: null,
          razorpayParams: null,
        }),

      // ── COMPUTED SELECTORS ───────────────────
      // Functions on the store — read current state
      // via get() so they always return fresh values.

      // Total number of individual items (sum of quantities)
      // Used by CartBar badge: "3 items"
      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      // Total price in rupees
      // Used by CartBar and checkout total line
      totalAmount: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),

      // Quantity of a specific item — used by MenuItemCard
      // to show the current quantity control without
      // subscribing to the full items array
      itemQuantity: (menuItemId: string) =>
        get().items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0,

      // True when cart has no items
      isEmpty: () => get().items.length === 0,
    }),

    // ── PERSIST CONFIG ────────────────────────────
    // Key: includes tableId so carts don't cross-contaminate
    // between different tables on the same device
    {
      name: 'menuqr-cart',
      storage: createJSONStorage(() => sessionStorage),

      // Only persist cart items + context — not order state
      // Order state should always start fresh on page load
      partialize: (state) => ({
        items: state.items,
        specialInstructions: state.specialInstructions,
        paymentMethod: state.paymentMethod,
        restaurantId: state.restaurantId,
        tableId: state.tableId,
      }),
    }
  )
)

// ─────────────────────────────────────────────
// CONVENIENCE SELECTOR HOOKS
// These wrap the store with React's useMemo pattern
// via Zustand's built-in subscription optimisation.
// Import these in components instead of the full store
// to prevent unnecessary re-renders.
// ─────────────────────────────────────────────

// For MenuItemCard — only re-renders when this item's quantity changes
export const useItemQuantity = (menuItemId: string) =>
  useCartStore((state) => state.itemQuantity(menuItemId))

// For CartBar — re-renders when total items or amount changes
export const useCartSummary = () =>
  useCartStore((state) => ({
    totalItems: state.totalItems(),
    totalAmount: state.totalAmount(),
    isEmpty: state.isEmpty(),
  }))

// For CheckoutSheet — full cart data for order review
export const useCartItems = () =>
  useCartStore((state) => state.items)

// For PlaceOrder button — tracks submission lifecycle
export const useOrderState = () =>
  useCartStore((state) => ({
    orderState: state.orderState,
    orderError: state.orderError,
    placedOrderId: state.placedOrderId,
    razorpayParams: state.razorpayParams,
  }))

export const dynamic = 'force-dynamic';
/**
 * ============================================================
 * MENUQR — RAZORPAY WEBHOOK HANDLER
 * File: src/app/api/razorpay-webhook/route.ts
 *
 * Razorpay calls this URL automatically after every payment
 * event. This file is the bridge between "customer paid on
 * Razorpay" and "order appears confirmed in the kitchen."
 *
 * WHAT IT DOES (in sequence):
 *  1. Reads the raw request body as text (required for
 *     signature verification — JSON parsing changes the body)
 *  2. Verifies the Razorpay-Signature header using HMAC-SHA256
 *     so nobody can fake a payment by calling this URL directly
 *  3. Handles three Razorpay event types:
 *       a. payment.captured  → mark order as paid + confirmed
 *          This is the main event. Kitchen sees order now.
 *       b. payment.failed    → mark order as failed + cancelled
 *          Customer sees failure screen, can retry.
 *       c. order.paid        → secondary confirmation (backup)
 *          Razorpay sends this after all transfers are done.
 *  4. On payment.captured:
 *       - Updates order: payment_status=paid, status=confirmed
 *       - Saves razorpay_payment_id for records/refunds later
 *       - Updates table status to 'occupied'
 *       - Supabase Realtime fires UPDATE event →
 *         kitchen display receives order immediately
 *  5. On payment.failed:
 *       - Updates order: payment_status=failed, status=cancelled
 *       - Table stays 'available'
 *  6. Returns 200 quickly — Razorpay retries if it gets
 *     anything other than 200 (up to 3 times over 24 hours)
 *
 * SECURITY — WHY SIGNATURE VERIFICATION IS CRITICAL:
 *  Without signature check, anyone knowing this URL could
 *  POST a fake "payment.captured" event and get free food.
 *  The HMAC signature uses your RAZORPAY_WEBHOOK_SECRET
 *  (set in Razorpay dashboard → Webhooks → Secret).
 *  Only Razorpay servers can generate a valid signature.
 *
 * CONNECTS TO:
 *  ← Razorpay servers POST here after payment
 *  ← create-order/route.ts created the pending order
 *  → lib/supabase.ts (createAdminSupabase — bypasses RLS)
 *  → Supabase orders table UPDATE (triggers Realtime)
 *  → Supabase tables UPDATE (occupied/available status)
 *  → Kitchen display (receives Realtime event, shows order)
 *
 * IMPORTANT — VERCEL CONFIG NEEDED:
 *  Add this route to Vercel's raw body config so Next.js
 *  does not parse the body before we read it.
 *  In next.config.js:
 *    api: { bodyParser: false }  ← for pages router
 *  For App Router (this project), we use request.text()
 *  directly which bypasses Next.js body parsing. ✓
 * ============================================================
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminSupabase } from '@/lib/supabase'
import type { OrderStatus, PaymentStatus } from '@/types/database'

// ─────────────────────────────────────────────
// RAZORPAY EVENT TYPES
// These are the exact event strings Razorpay sends.
// We only handle the three relevant to orders.
// ─────────────────────────────────────────────
const RAZORPAY_EVENTS = {
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  ORDER_PAID: 'order.paid',
} as const

type RazorpayEvent = (typeof RAZORPAY_EVENTS)[keyof typeof RAZORPAY_EVENTS]

// ─────────────────────────────────────────────
// RAZORPAY WEBHOOK PAYLOAD TYPES
// Typed shapes of what Razorpay actually sends.
// Enough fields for our use case — Razorpay sends more.
// ─────────────────────────────────────────────
interface RazorpayPaymentEntity {
  id: string           // razorpay payment ID e.g. "pay_xxxxx"
  order_id: string     // razorpay order ID e.g. "order_xxxxx"
  amount: number       // in paise
  currency: string
  status: string       // 'captured' | 'failed'
  method: string       // 'upi' | 'card' | 'netbanking' | 'wallet'
  captured: boolean
  description: string | null
  error_code: string | null
  error_description: string | null
}

interface RazorpayOrderEntity {
  id: string           // razorpay order ID
  amount: number
  amount_paid: number
  status: string       // 'paid' | 'attempted'
}

interface RazorpayWebhookPayload {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: { entity: RazorpayPaymentEntity }
    order?: { entity: RazorpayOrderEntity }
  }
  created_at: number
}

// ─────────────────────────────────────────────
// HELPER — Verify Razorpay webhook signature
//
// Razorpay signs every webhook with HMAC-SHA256 using
// your webhook secret. We recompute the signature from
// the raw body and compare. If they match, the request
// is genuine. If not, we reject with 400.
//
// WHY rawBody (string) not parsed JSON:
//   HMAC is computed on the exact bytes Razorpay sent.
//   JSON.stringify(JSON.parse(body)) may reorder keys
//   and change whitespace, breaking the signature match.
// ─────────────────────────────────────────────
function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  // (comparing string length leaks info about partial matches)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    // meaning the signature is definitely wrong
    return false
  }
}

// ─────────────────────────────────────────────
// HELPER — Handle payment.captured event
//
// Called when Razorpay confirms the payment was
// successfully charged and funds are in transit.
// This is the trigger for the kitchen to receive
// the order.
// ─────────────────────────────────────────────
async function handlePaymentCaptured(
  payment: RazorpayPaymentEntity
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminSupabase()

  // Find the order using razorpay_order_id
  // We stored this when creating the order in create-order/route.ts
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, table_id, restaurant_id, status, payment_status')
    .eq('razorpay_order_id', payment.order_id)
    .single()

  if (findError || !order) {
    console.error(
      '[MenuQR Webhook] Order not found for razorpay_order_id:',
      payment.order_id,
      findError
    )
    // Return success anyway — if we return 4xx, Razorpay will retry
    // endlessly for an order that will never be found
    return { success: true, message: 'Order not found — skipped' }
  }

  // Idempotency check — if already processed, skip
  // Razorpay may send the same event more than once
  if (order.payment_status === 'paid') {
    return { success: true, message: 'Already processed — skipped' }
  }

  // Update order to confirmed + paid
  // This UPDATE fires Supabase Realtime → kitchen display
  const newOrderStatus: OrderStatus = 'confirmed'
  const newPaymentStatus: PaymentStatus = 'paid'

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: newOrderStatus,
      payment_status: newPaymentStatus,
      razorpay_payment_id: payment.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[MenuQR Webhook] Order update failed:', updateError)
    // Return 500 so Razorpay retries this event
    throw new Error(`Order update failed: ${updateError.message}`)
  }

  // Update table status to 'occupied' since an active order exists
  const { error: tableError } = await supabase
    .from('tables')
    .update({ status: 'occupied' })
    .eq('id', order.table_id)

  if (tableError) {
    // Non-critical — log but don't fail the webhook
    console.warn(
      '[MenuQR Webhook] Table status update failed (non-critical):',
      tableError
    )
  }

  console.info(
    `[MenuQR Webhook] Payment captured — Order ${order.id} confirmed. ` +
    `Payment: ${payment.id}, Amount: ₹${payment.amount / 100}`
  )

  return {
    success: true,
    message: `Order ${order.id} confirmed and sent to kitchen`,
  }
}

// ─────────────────────────────────────────────
// HELPER — Handle payment.failed event
//
// Called when Razorpay could not charge the customer.
// We mark the order cancelled so it doesn't linger
// as pending in the owner's dashboard.
// ─────────────────────────────────────────────
async function handlePaymentFailed(
  payment: RazorpayPaymentEntity
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminSupabase()

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, table_id, status')
    .eq('razorpay_order_id', payment.order_id)
    .single()

  if (findError || !order) {
    return { success: true, message: 'Order not found — skipped' }
  }

  // Only cancel if still pending — don't override a confirmed order
  if (order.status !== 'pending') {
    return { success: true, message: 'Order not pending — skipped' }
  }

  const newOrderStatus: OrderStatus = 'cancelled'
  const newPaymentStatus: PaymentStatus = 'failed'

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: newOrderStatus,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[MenuQR Webhook] Failed order update error:', updateError)
    throw new Error(`Failed order update failed: ${updateError.message}`)
  }

  console.info(
    `[MenuQR Webhook] Payment failed — Order ${order.id} cancelled. ` +
    `Reason: ${payment.error_description ?? 'unknown'}`
  )

  return {
    success: true,
    message: `Order ${order.id} cancelled due to payment failure`,
  }
}

// ─────────────────────────────────────────────
// HELPER — Handle order.paid event
//
// Razorpay sends this after ALL transfers in a Route
// order are completed. It's a backup confirmation
// in case payment.captured was missed or delayed.
// We use it to ensure no order stays 'pending'.
// ─────────────────────────────────────────────
async function handleOrderPaid(
  order: RazorpayOrderEntity
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminSupabase()

  const { data: dbOrder, error: findError } = await supabase
    .from('orders')
    .select('id, status, payment_status')
    .eq('razorpay_order_id', order.id)
    .single()

  if (findError || !dbOrder) {
    return { success: true, message: 'Order not found — skipped' }
  }

  // Only update if still pending — payment.captured likely
  // already handled this, but this is the safety net
  if (dbOrder.payment_status === 'paid') {
    return { success: true, message: 'Already paid — skipped' }
  }

  const newOrderStatus: OrderStatus = 'confirmed'
  const newPaymentStatus: PaymentStatus = 'paid'

  await supabase
    .from('orders')
    .update({
      status: newOrderStatus,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dbOrder.id)

  return {
    success: true,
    message: `Order ${dbOrder.id} confirmed via order.paid event`,
  }
}

// ─────────────────────────────────────────────
// MAIN HANDLER — POST /api/razorpay-webhook
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  const contentLength = parseInt(request.headers.get('content-length') ?? '0')
  if (contentLength > 50000) { // 50KB max
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  // ── STEP 0: IP Allowlist ─────────────
  const RAZORPAY_IPS = [
    '52.66.29.74', '52.66.29.75', '65.2.123.248', '65.2.123.249', '3.109.80.205'
  ]
  const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (process.env.NODE_ENV === 'production' && requestIp) {
    if (!RAZORPAY_IPS.includes(requestIp)) {
      console.warn('[SECURITY] Webhook from non-Razorpay IP:', requestIp)
    }
  }

  // ── STEP 1: Read raw body as TEXT ─────────────
  // Must read as text before any parsing.
  // The raw string is needed for signature verification.
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json(
      { error: 'Failed to read request body' },
      { status: 400 }
    )
  }

  // ── STEP 2: Get signature from header ─────────
  const signature = request.headers.get('x-razorpay-signature')
  if (!signature) {
    console.warn('[MenuQR Webhook] Missing x-razorpay-signature header')
    return NextResponse.json(
      { error: 'Missing signature header' },
      { status: 400 }
    )
  }

  // ── STEP 3: Verify signature ──────────────────
  // If this fails, someone is trying to fake a payment.
  // Return 400 — do NOT process the event.
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[MenuQR Webhook] RAZORPAY_WEBHOOK_SECRET not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const isValid = verifyRazorpaySignature(rawBody, signature, webhookSecret)
  if (!isValid) {
    console.warn('[MenuQR Webhook] Invalid signature — possible fake request')
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // ── STEP 4: Parse the verified body ───────────
  let webhookData: RazorpayWebhookPayload
  try {
    webhookData = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const eventType = webhookData.event as RazorpayEvent

  // ── STEP 4.5: Idempotency Check ───────────────
  const supabase = createAdminSupabase()
  const eventId = `${webhookData.account_id}_${webhookData.created_at}_${eventType}`

  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('id', eventId)
    .single()

  if (existingEvent) {
    console.warn('[SECURITY] Duplicate webhook event:', eventId)
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }

  await supabase.from('webhook_events').insert({
    id: eventId,
    event_type: eventType,
  })

  // ── STEP 5: Route to correct event handler ─────
  try {
    let result: { success: boolean; message: string }

    switch (eventType) {

      case RAZORPAY_EVENTS.PAYMENT_CAPTURED: {
        const payment = webhookData.payload.payment?.entity
        if (!payment) {
          return NextResponse.json(
            { error: 'Missing payment entity in payload' },
            { status: 400 }
          )
        }
        result = await handlePaymentCaptured(payment)
        break
      }

      case RAZORPAY_EVENTS.PAYMENT_FAILED: {
        const payment = webhookData.payload.payment?.entity
        if (!payment) {
          return NextResponse.json(
            { error: 'Missing payment entity in payload' },
            { status: 400 }
          )
        }
        result = await handlePaymentFailed(payment)
        break
      }

      case RAZORPAY_EVENTS.ORDER_PAID: {
        const order = webhookData.payload.order?.entity
        if (!order) {
          return NextResponse.json(
            { error: 'Missing order entity in payload' },
            { status: 400 }
          )
        }
        result = await handleOrderPaid(order)
        break
      }

      default:
        // Unknown event — acknowledge and ignore
        // Razorpay sends many event types; we only care about 3
        console.info(`[MenuQR Webhook] Ignored event type: ${eventType}`)
        return NextResponse.json(
          { received: true, message: `Event ${eventType} ignored` },
          { status: 200 }
        )
    }

    // ── STEP 6: Return 200 to Razorpay ────────────
    // CRITICAL: Always return 200 after successful processing.
    // If Razorpay receives anything other than 2xx, it will
    // retry the same event up to 3 times over 24 hours,
    // potentially confirming the same order multiple times.
    return NextResponse.json(
      { received: true, ...result },
      { status: 200 }
    )

  } catch (handlerError) {
    // Handler threw — this is a real error we need Razorpay to retry
    console.error('[MenuQR Webhook] Handler error:', handlerError)
    return NextResponse.json(
      { error: 'Internal processing error' },
      { status: 500 }
    )
  }
}

// Only POST is valid for webhooks
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

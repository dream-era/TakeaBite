export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase'
import { z } from 'zod'

const UpdateStatusSchema = z.object({
  type: z.enum(['item', 'order', 'payment']),
  id: z.string().uuid(),
  status: z.enum(['pending', 'preparing', 'done', 'ready', 'served', 'cancelled', 'paid']),
  restaurantId: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = createAdminSupabase()

  try {
    const sessionFingerprint = request.headers.get('x-kitchen-session')
    let isAuthorized = false
    let currentStaffName = null
    let currentStaffId = null

    if (sessionFingerprint) {
      const staffId = request.headers.get('x-staff-id')
      if (staffId) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('session_expires_at, name, id')
          .eq('id', staffId)
          .single()

        if (staffData) {
          // Allow if session has not expired. We don't strictly enforce fingerprint match
          // because multiple tablets might share the same PIN in a kitchen.
          if (new Date(staffData.session_expires_at) > new Date()) {
            isAuthorized = true
            currentStaffName = staffData.name
            currentStaffId = staffData.id
          }
        }
      }
    }
    
    // Fallback to owner/admin Supabase Auth if staff check failed or wasn't provided
    if (!isAuthorized) {
      const serverSupabase = createServerSupabase()
      const { data: { user } } = await serverSupabase.auth.getUser()
      if (user) {
        isAuthorized = true
        currentStaffId = user.id
        currentStaffName = 'Owner / Admin'
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = UpdateStatusSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { type, id, status } = parsed.data

    if (type === 'item') {
      const { data: itemData } = await supabase.from('order_items').select('order_id').eq('id', id).single()
      if (!itemData) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

      if (currentStaffId && (status === 'preparing' || status === 'done')) {
        const { data: currentOrderData } = await supabase.from('orders').select('assigned_staff_id').eq('id', itemData.order_id).single()
        if (currentOrderData?.assigned_staff_id && currentOrderData.assigned_staff_id !== currentStaffId) {
          return NextResponse.json({ error: 'Order is already assigned to another cook' }, { status: 409 })
        }
      }

      // Update item status
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ status })
        .eq('id', id)

      if (updateError) throw updateError

      // Check if all items in this order are done
      if (itemData) {
        const { data: siblingItems } = await supabase.from('order_items').select('status').eq('order_id', itemData.order_id)
        if (siblingItems) {
          const allDone = siblingItems.every(i => i.status === 'done')
          const anyPreparing = siblingItems.some(i => i.status === 'preparing' || i.status === 'done')

          let newOrderStatus = null
          if (allDone) newOrderStatus = 'ready'
          else if (anyPreparing) newOrderStatus = 'preparing'

          if (newOrderStatus) {
            const updatePayload: any = { status: newOrderStatus }
            if (newOrderStatus === 'preparing' && currentStaffId) {
              updatePayload.assigned_staff_id = currentStaffId
              updatePayload.assigned_staff_name = currentStaffName
              updatePayload.assigned_at = new Date().toISOString()
            }
            await supabase.from('orders').update(updatePayload).eq('id', itemData.order_id)
          }
        }
      }

      return NextResponse.json({ success: true })
    } else if (type === 'payment') {
      // Update payment status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_status: status })
        .eq('id', id)

      if (updateError) throw updateError

      return NextResponse.json({ success: true })
    } else {
      // Update order status
      const updatePayload: any = { status }
      if (status === 'preparing' && currentStaffId) {
        updatePayload.assigned_staff_id = currentStaffId
        updatePayload.assigned_staff_name = currentStaffName
        updatePayload.assigned_at = new Date().toISOString()
      }
      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) throw updateError

      // If order is served or cancelled, free the table
      if (status === 'served' || status === 'cancelled') {
        const { data: orderData } = await supabase.from('orders').select('table_id').eq('id', id).single()
        if (orderData?.table_id) {
          // Check if table has other active orders before freeing
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', orderData.table_id)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
            
          if (count === 0) {
            await supabase.from('tables').update({ status: 'available' }).eq('id', orderData.table_id)
          }
        }
      }

      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

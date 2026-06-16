"use server";

import { createAdminSupabase } from "@/lib/supabase";
import { z } from "zod";

const LinkPhoneSchema = z.object({
  customerId: z.string().uuid(),
  phone: z.string().min(10).max(15)
});

export async function linkCustomerPhone(customerId: string, phone: string) {
  const parsed = LinkPhoneSchema.safeParse({ customerId, phone });
  if (!parsed.success) {
    return { success: false, error: "Invalid phone number format." };
  }

  const supabase = createAdminSupabase();
  
  // Update the customer profile with the phone number
  const { error } = await supabase
    .from('customer_profiles')
    .update({ phone: parsed.data.phone, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.customerId);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: "This phone number is already linked to another device." };
    }
    return { success: false, error: "Failed to link phone number." };
  }

  return { success: true };
}

export async function recoverCustomerId(phone: string) {
  if (!phone || phone.length < 10) {
    return { success: false, error: "Invalid phone number format." };
  }

  const supabase = createAdminSupabase();
  
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return { success: false, error: "No order history found for this phone number." };
  }

  return { success: true, data: { customerId: data.id } };
}

export async function getCustomerOrder(orderId: string, orderToken?: string) {
  if (!orderId) return { success: false, error: "Order ID required" };

  const supabase = createAdminSupabase();
  
  let query = supabase
    .from('orders')
    .select(`
      id,
      status, 
      payment_status, 
      payment_method, 
      daily_order_number,
      created_at,
      tables ( table_number, table_name ),
      order_items (
        id,
        quantity,
        price,
        menu_items ( name )
      )
    `)
    .eq('id', orderId);

  if (orderToken) {
    query = query.eq('order_token', orderToken);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return { success: false, error: "Order not found or unauthorized" };
  }

  return { success: true, data };
}

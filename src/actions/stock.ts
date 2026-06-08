"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Toggles the availability (in stock / out of stock) of a menu item.
 */
export async function toggleItemAvailability(itemId: string, isAvailable: boolean, workspaceId: string) {
  try {
    const supabase = createServerSupabase();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId)
      .eq('restaurant_id', workspaceId); // Ensure they only modify items in their workspace

    if (error) {
      console.error("[stock] Error updating availability:", error);
      return { success: false, error: error.message };
    }

    // Since this is real-time we don't strictly need revalidatePath for the clients using the hook,
    // but it helps Next.js SWR cache to update for fresh page loads.
    revalidatePath(`/shop/${workspaceId}`);
    revalidatePath(`/staff/stock`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update item availability" };
  }
}

"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";

export async function adminSignUpDev(email: string, password: string, fullName: string) {
  try {
    const supabase = createAdminSupabase();

    // Create the user directly via Admin API, bypassing rate limits and email confirmation
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create user" };
  }
}

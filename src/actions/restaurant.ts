/**
 * ============================================================
 * MENUQR — RESTAURANT SERVER ACTIONS
 * File: src/actions/restaurant.ts
 *
 * Next.js Server Actions that power the 6-step onboarding
 * wizard and the Settings page. Called directly from React
 * components with no fetch() needed — Next.js handles the
 * RPC transport automatically.
 *
 * WHY SERVER ACTIONS (not API routes):
 *  - No separate fetch() + error handling boilerplate
 *  - Type-safe end-to-end — component and action share types
 *  - Automatic CSRF protection built into Next.js
 *  - Can be called from Server Components too
 *  - Revalidates Next.js cache automatically after mutations
 *
 * ACTIONS IN THIS FILE:
 *
 *  Onboarding wizard (called in order):
 *   1. createRestaurant()       — Step 1: shop details
 *   2. saveBusinessSetup()      — Step 3: business info
 *   3. connectRazorpayAccount() — Step 4: bank account
 *   4. completeOnboarding()     — Step 6: mark complete
 *
 *  Restaurant management (Settings page):
 *   5. updateRestaurantProfile() — name, logo, hours, etc.
 *   6. uploadRestaurantLogo()    — Supabase Storage upload
 *   7. getRestaurantBySlug()     — public page data fetch
 *
 * ACTION RETURN PATTERN:
 *  All actions return { success: true, data: T }
 *                  or { success: false, error: string }
 *  Components check success flag before reading data.
 *  This avoids try/catch in every component.
 *
 * CONNECTS TO:
 *  ← Onboarding wizard pages call these step by step
 *  ← Settings page calls updateRestaurantProfile()
 *  ← authStore.updateRestaurant() called after each action
 *    to keep dashboard UI in sync without page reload
 *  → lib/supabase.ts (createServerSupabase for auth,
 *                     createAdminSupabase for writes)
 *  → types/database.ts (Restaurant, RestaurantInsert,
 *                        BusinessType, WorkingHours)
 *  → Razorpay API (connectRazorpayAccount creates linked account)
 *  → Supabase Storage (uploadRestaurantLogo uploads PNG/JPG)
 *  → migrations/001_initial.sql (restaurants table schema)
 * ============================================================
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import type {
  Restaurant,
  BusinessType,
} from '@/types/database'

// ─────────────────────────────────────────────
// RAZORPAY INSTANCE
// Used only in connectRazorpayAccount() to create
// linked accounts via Razorpay Route API.
// ─────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// ─────────────────────────────────────────────
// STANDARD ACTION RESULT TYPE
// All actions return this shape — components
// never need try/catch, just check success flag.
// ─────────────────────────────────────────────
type ActionResult<T = Restaurant> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─────────────────────────────────────────────
// HELPER — Get authenticated owner
// Every action calls this first.
// Returns the Supabase auth user or throws if not
// authenticated — prevents unauthenticated mutations.
// ─────────────────────────────────────────────
async function getAuthenticatedOwner() {
  const supabase = createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorised — please log in')
  }
  return user
}

// ─────────────────────────────────────────────
// HELPER — Generate URL-safe slug from shop name
// "Sree Juice Shop Tiruppur" → "sree-juice-shop-tiruppur"
// Appends random 4-char suffix to handle duplicates.
// Must match the URL pattern: /order/{slug}/{tableId}
// ─────────────────────────────────────────────
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .slice(0, 40)                  // Max 40 chars for base

  // 4-char random suffix to prevent slug collisions
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

// ─────────────────────────────────────────────
// HELPER — Verify restaurant ownership
// Used by update actions to ensure the owner
// can only modify their own restaurant.
// ─────────────────────────────────────────────
async function verifyOwnership(
  restaurantId: string,
  ownerId: string
): Promise<boolean> {
  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', ownerId)
    .single()
  return !!data
}

// ─────────────────────────────────────────────
// LOGO STORAGE BUCKET
// Same bucket structure as QR codes but different prefix.
// Path: restaurant-assets/{restaurantId}/logo.{ext}
// ─────────────────────────────────────────────
const ASSETS_BUCKET = 'restaurant-assets'

// ============================================================
// ACTION 1 — createRestaurant
// Onboarding Step 1: shop details form submit.
//
// Creates the restaurant row in Supabase with basic info.
// Generates a URL slug from the shop name.
// Also creates the initial tables based on table_count.
// Returns the full Restaurant row — authStore stores it.
// ============================================================
const CreateRestaurantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  type: z.string().min(1, 'Shop type is required'),
  phone: z.string().min(10, 'Valid phone number required').max(15).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  description: z.string().max(200).optional(),
})

export async function createRestaurant(
  input: z.infer<typeof CreateRestaurantSchema>
): Promise<ActionResult<Restaurant>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    // Validate input
    const parsed = CreateRestaurantSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const { name, type, phone, address, city, description } =
      parsed.data

    // Check owner doesn't already have a restaurant
    const { data: existing } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existing) {
      // If they already have a restaurant, just return it so they can proceed
      // Stringify and parse to ensure Next.js Server Action serialization works properly
      return {
        success: true,
        data: JSON.parse(JSON.stringify(existing)) as Restaurant,
      }
    }

    // Generate unique slug
    const slug = generateSlug(name)

    // Insert restaurant row
    const { data: restaurant, error: insertError } = await supabase
      .from('restaurants')
      .insert({
        owner_id: user.id,
        name,
        slug,
        type,
        phone: phone ?? null,
        address: address ?? null,
        city: city ?? null,
        description: description ?? null,
        is_active: true,
        status: 'active',
        plan: 'basic',
        payment_enabled: false,
        commission_percent: 3.0,
        onboarding_complete: false,
      })
      .select('*')
      .single()

    if (insertError || !restaurant) {
      console.error('[MenuQR] createRestaurant insert error:', insertError)
      return {
        success: false,
        error: 'Failed to create restaurant. Please try again.',
      }
    }

    // Revalidate onboarding page so server components refresh
    revalidatePath('/onboarding')

    return { 
      success: true, 
      data: JSON.parse(JSON.stringify(restaurant)) as Restaurant 
    }
  } catch (err) {
    console.error('[MenuQR] createRestaurant error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 2 — saveBusinessSetup
// Onboarding Step 3: business details form submit.
//
// Saves business type, tax numbers, and working hours.
// These are needed for Razorpay linked account creation
// in Step 4 — especially business_type and pan_number.
// ============================================================
const BusinessSetupSchema = z.object({
  restaurantId: z.string().uuid(),
  businessType: z.enum([
    'individual',
    'proprietorship',
    'partnership',
    'private_limited',
  ] as const),
  gstNumber: z.string().max(15).optional(),
  fssaiNumber: z.string().max(14).optional(),
  panNumber: z.string().length(10, 'PAN must be exactly 10 characters').optional(),
  workingHours: z
    .object({
      open: z.string(),
      close: z.string(),
      days: z.array(z.string()),
    })
    .optional(),
})

export async function saveBusinessSetup(
  input: z.infer<typeof BusinessSetupSchema>
): Promise<ActionResult<Restaurant>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = BusinessSetupSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const {
      restaurantId,
      businessType,
      gstNumber,
      fssaiNumber,
      panNumber,
      contactEmail,
      workingHours,
    } = parsed.data

    // Verify ownership
    const isOwner = await verifyOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Access denied' }
    }

    const { data: restaurant, error: updateError } = await supabase
      .from('restaurants')
      .update({
        business_type: businessType as BusinessType,
        gst_number: gstNumber ?? null,
        fssai_number: fssaiNumber ?? null,
        pan_number: panNumber ?? null,
        working_hours: workingHours ?? null,
      })
      .eq('id', restaurantId)
      .select('*')
      .single()

    if (updateError || !restaurant) {
      return {
        success: false,
        error: 'Failed to save business details. Please try again.',
      }
    }

    revalidatePath('/onboarding')
    revalidatePath('/dashboard/settings')

    return { success: true, data: restaurant as Restaurant }
  } catch (err) {
    console.error('[MenuQR] saveBusinessSetup error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 3 — connectRazorpayAccount
// Onboarding Step 4: bank account connect.
//
// Creates a Razorpay Route linked account for the restaurant.
// This is the account that receives split payments when
// customers pay online via create-order/route.ts.
// Saves the razorpay_account_id + sets payment_enabled=true.
//
// RAZORPAY LINKED ACCOUNT:
//  - Created via POST /v2/accounts (Route API)
//  - Requires: account holder name, bank account, IFSC, PAN
//  - Razorpay verifies via penny drop (sends ₹1 to account)
//  - Once verified: payment_enabled = true in our DB
// ============================================================
const ConnectRazorpaySchema = z.object({
  restaurantId: z.string().uuid(),
  accountHolderName: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100),
  bankAccountNumber: z
    .string()
    .min(9, 'Invalid account number')
    .max(18, 'Invalid account number'),
  ifscCode: z
    .string()
    .length(11, 'IFSC must be exactly 11 characters')
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
  panNumber: z
    .string()
    .length(10, 'PAN must be exactly 10 characters')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format'),
})

export async function connectRazorpayAccount(
  input: z.infer<typeof ConnectRazorpaySchema>
): Promise<ActionResult<{ razorpayAccountId: string; restaurant: Restaurant }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = ConnectRazorpaySchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const {
      restaurantId,
      accountHolderName,
      bankAccountNumber,
      ifscCode,
      panNumber,
    } = parsed.data

    // Verify ownership
    const isOwner = await verifyOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Access denied' }
    }

    // Fetch restaurant for business details
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, business_type, gst_number, city')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) {
      return { success: false, error: 'Restaurant not found' }
    }

    // Map our business_type to Razorpay's expected values
    const razorpayBusinessType: Record<string, string> = {
      individual: 'individual',
      proprietorship: 'proprietorship',
      partnership: 'partnership',
      private_limited: 'private_limited',
    }

    // Create Razorpay linked account
    // Route API: POST /v2/accounts
    let razorpayAccount: { id: string }
    try {
      razorpayAccount = await (razorpay as unknown as {
        accounts: {
          create: (data: Record<string, unknown>) => Promise<{ id: string }>
        }
      }).accounts.create({
        email: user.email,
        profile: {
          category: 'food_and_beverage',
          subcategory: 'restaurant',
          addresses: {
            registered: {
              street1: restaurant.city ?? 'India',
              city: restaurant.city ?? 'India',
              state: 'TN',
              postal_code: '641001',
              country: 'IN',
            },
          },
        },
        legal_info: {
          pan: panNumber,
          gst: restaurant.gst_number ?? undefined,
        },
        type: 'route',
        legal_business_name: restaurant.name,
        business_type:
          razorpayBusinessType[restaurant.business_type ?? 'individual'],
        bank_account: {
          name: accountHolderName,
          ifsc: ifscCode,
          account_number: bankAccountNumber,
        },
      })
    } catch (razorpayError) {
      console.error('[MenuQR] Razorpay account creation error:', razorpayError)
      return {
        success: false,
        error:
          'Failed to connect with Razorpay. Please verify your bank details and try again.',
      }
    }

    // Save Razorpay account ID + bank details + enable payments
    const { data: updatedRestaurant, error: updateError } = await supabase
      .from('restaurants')
      .update({
        razorpay_account_id: razorpayAccount.id,
        payment_enabled: true,
        bank_account_number: bankAccountNumber,
        bank_ifsc: ifscCode,
        bank_holder_name: accountHolderName,
        pan_number: panNumber,
      })
      .eq('id', restaurantId)
      .select('*')
      .single()

    if (updateError || !updatedRestaurant) {
      return {
        success: false,
        error: 'Razorpay account created but failed to save. Contact support.',
      }
    }

    revalidatePath('/onboarding')
    revalidatePath('/dashboard/settings')

    return {
      success: true,
      data: {
        razorpayAccountId: razorpayAccount.id,
        restaurant: updatedRestaurant as Restaurant,
      },
    }
  } catch (err) {
    console.error('[MenuQR] connectRazorpayAccount error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 4 — completeOnboarding
// Onboarding Step 6: "All set" screen.
//
// Sets onboarding_complete = true.
// After this, middleware.ts stops redirecting the owner
// to /onboarding and allows full dashboard access.
// authStore.setOnboardingComplete() is called by the
// component after this action succeeds.
// ============================================================
export async function completeOnboarding(
  restaurantId: string
): Promise<ActionResult<Restaurant>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const isOwner = await verifyOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Access denied' }
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update({ onboarding_complete: true })
      .eq('id', restaurantId)
      .select('*')
      .single()

    if (error || !restaurant) {
      return {
        success: false,
        error: 'Failed to complete onboarding. Please try again.',
      }
    }

    // Revalidate dashboard so server components get fresh data
    revalidatePath('/dashboard')
    revalidatePath('/onboarding')

    return { success: true, data: restaurant as Restaurant }
  } catch (err) {
    console.error('[MenuQR] completeOnboarding error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 5 — updateRestaurantProfile
// Settings page: save name, description, hours, contact.
//
// Partial update — only updates fields that are provided.
// Regenerates slug if name changes (with a redirect warning
// since existing QR codes encode the old slug).
// authStore.updateRestaurant() is called by component after.
// ============================================================
const UpdateProfileSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(200).optional(),
  phone: z.string().max(15).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  workingHours: z
    .object({
      open: z.string(),
      close: z.string(),
      days: z.array(z.string()),
    })
    .optional(),
})

export async function updateRestaurantProfile(
  input: z.infer<typeof UpdateProfileSchema>
): Promise<ActionResult<Restaurant & { slugChanged: boolean }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const parsed = UpdateProfileSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      }
    }

    const {
      restaurantId,
      name,
      description,
      phone,
      contactEmail,
      address,
      city,
      workingHours,
    } = parsed.data

    const isOwner = await verifyOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Access denied' }
    }

    // Fetch current restaurant to detect name change
    const { data: current } = await supabase
      .from('restaurants')
      .select('name, slug')
      .eq('id', restaurantId)
      .single()

    // Regenerate slug only if name actually changed
    // IMPORTANT: Changing slug breaks existing printed QR codes
    // The component should warn the owner about this
    const nameChanged = name && name !== current?.name
    const newSlug = nameChanged ? generateSlug(name) : undefined

    const updates: Record<string, unknown> = {}
    if (name) updates.name = name
    if (newSlug) updates.slug = newSlug
    if (description !== undefined) updates.description = description
    if (phone !== undefined) updates.phone = phone
    if (address !== undefined) updates.address = address
    if (city !== undefined) updates.city = city
    if (contactEmail !== undefined) updates.contact_email = contactEmail || null
    if (workingHours !== undefined) updates.working_hours = workingHours

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No changes to save' }
    }

    const { data: restaurant, error: updateError } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurantId)
      .select('*')
      .single()

    if (updateError || !restaurant) {
      return {
        success: false,
        error: 'Failed to update profile. Please try again.',
      }
    }

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        ...(restaurant as Restaurant),
        slugChanged: !!newSlug,
      },
    }
  } catch (err) {
    console.error('[MenuQR] updateRestaurantProfile error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// ACTION 6 — uploadRestaurantLogo
// Settings page + Onboarding Step 1: logo upload.
//
// Receives a File from the form, uploads to Supabase Storage,
// updates restaurants.logo_url with the public URL.
// Returns the new logo_url for immediate display.
// Path: restaurant-assets/{restaurantId}/logo.{ext}
// ============================================================
export async function uploadRestaurantLogo(
  restaurantId: string,
  formData: FormData
): Promise<ActionResult<{ logoUrl: string; restaurant: Restaurant }>> {
  try {
    const user = await getAuthenticatedOwner()
    const supabase = createAdminSupabase()

    const isOwner = await verifyOwnership(restaurantId, user.id)
    if (!isOwner) {
      return { success: false, error: 'Access denied' }
    }

    const file = formData.get('logo') as File | null
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type + size (max 2MB)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Logo must be PNG, JPEG, or WebP',
      }
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Logo must be under 2MB' }
    }

    // Determine file extension
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const filePath = `${restaurantId}/logo.${ext}`

    // Convert File to ArrayBuffer for Supabase Storage upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage (upsert — overwrites existing logo)
    const { error: uploadError } = await supabase.storage
      .from(ASSETS_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('[MenuQR] Logo upload error:', uploadError)
      return { success: false, error: 'Failed to upload logo. Please try again.' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ASSETS_BUCKET)
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Save URL to restaurant row
    const { data: restaurant, error: updateError } = await supabase
      .from('restaurants')
      .update({ logo_url: logoUrl })
      .eq('id', restaurantId)
      .select('*')
      .single()

    if (updateError || !restaurant) {
      return {
        success: false,
        error: 'Logo uploaded but failed to save URL. Contact support.',
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')

    return {
      success: true,
      data: { logoUrl, restaurant: restaurant as Restaurant },
    }
  } catch (err) {
    console.error('[MenuQR] uploadRestaurantLogo error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

export async function getRestaurantProfile(restaurantId: string): Promise<ActionResult<unknown>> {
  try {
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single()

    if (error || !data) {
      return { success: false, error: 'Restaurant not found' }
    }

    return { success: true, data }
  } catch (err) {
    console.error('getRestaurantProfile error:', err)
    return { success: false, error: 'Internal Server Error' }
  }
}

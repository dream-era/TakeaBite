import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { z } from 'zod'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'

const QR_BUCKET = 'qr-codes'

const QR_OPTIONS: QRCode.QRCodeToBufferOptions = {
  type: 'png',
  width: 400,
  margin: 2,
  errorCorrectionLevel: 'M',
  color: {
    dark: '#1a1a1a',
    light: '#ffffff',
  },
}

const SingleQRSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  tableId: z.string().uuid('Invalid table ID'),
  mode: z.literal('single').optional().default('single'),
})

const UniversalQRSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  mode: z.literal('universal'),
})

const BulkQRSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  mode: z.literal('bulk'),
})

const GenerateQRSchema = z.union([SingleQRSchema, BulkQRSchema, UniversalQRSchema])

type GenerateQRInput = z.infer<typeof GenerateQRSchema>

interface QRResult {
  tableId?: string
  tableNumber?: number
  tableName?: string | null
  qrCodeBase64: string
  qrCodeUrl: string
  orderUrl: string
  type: 'universal' | 'table'
}

function buildTableOrderUrl(workspaceId: string, tableId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menuqr.in'
  return `${appUrl}/shop/${workspaceId}/table/${tableId}`
}

function buildUniversalOrderUrl(workspaceId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menuqr.in'
  return `${appUrl}/shop/${workspaceId}`
}

async function generateQRBuffer(url: string): Promise<{ buffer: Buffer; base64: string }> {
  const buffer = await QRCode.toBuffer(url, QR_OPTIONS)
  const base64 = `data:image/png;base64,${buffer.toString('base64')}`
  return { buffer, base64 }
}

async function uploadQRToStorage(
  restaurantId: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const supabase = createAdminSupabase()
  const filePath = `${restaurantId}/${fileName}.png`

  const { error: uploadError } = await supabase.storage
    .from(QR_BUCKET)
    .upload(filePath, buffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(QR_BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

async function processTable(
  table: {
    id: string
    table_number: number
    table_name: string | null
    restaurant_id: string
  }
): Promise<QRResult> {
  const supabase = createAdminSupabase()
  const orderUrl = buildTableOrderUrl(table.restaurant_id, table.id)
  const { buffer, base64 } = await generateQRBuffer(orderUrl)
  const qrCodeUrl = await uploadQRToStorage(table.restaurant_id, table.id, buffer)

  const { error: updateError } = await supabase
    .from('tables')
    .update({ qr_code_url: qrCodeUrl })
    .eq('id', table.id)

  if (updateError) {
    console.warn(`[MenuQR QR] Failed to save qr_code_url for table ${table.id}:`, updateError)
  }

  return {
    type: 'table',
    tableId: table.id,
    tableNumber: table.table_number,
    tableName: table.table_name,
    qrCodeBase64: base64,
    qrCodeUrl,
    orderUrl,
  }
}

async function processUniversal(restaurantId: string): Promise<QRResult> {
  const supabase = createAdminSupabase()
  const orderUrl = buildUniversalOrderUrl(restaurantId)
  const { buffer, base64 } = await generateQRBuffer(orderUrl)
  const qrCodeUrl = await uploadQRToStorage(restaurantId, 'universal', buffer)

  const { error: updateError } = await supabase
    .from('restaurants')
    .update({ universal_qr_url: qrCodeUrl })
    .eq('id', restaurantId)

  if (updateError) {
    console.warn(`[MenuQR QR] Failed to save universal_qr_url for restaurant ${restaurantId}:`, updateError)
  }

  return {
    type: 'universal',
    qrCodeBase64: base64,
    qrCodeUrl,
    orderUrl,
  }
}

export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = GenerateQRSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const input = parsed.data as GenerateQRInput
  const adminSupabase = createAdminSupabase()

  const { data: restaurant, error: restaurantError } = await adminSupabase
    .from('restaurants')
    .select('id, slug, name, owner_id, is_active')
    .eq('id', input.restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found or access denied' }, { status: 403 })
  }

  if (!restaurant.is_active) {
    return NextResponse.json({ error: 'Restaurant is inactive' }, { status: 403 })
  }

  const results: QRResult[] = []
  const errors: { id: string; error: string }[] = []

  if (input.mode === 'universal') {
    try {
      const res = await processUniversal(restaurant.id)
      results.push(res)
    } catch (err) {
      console.error(`[MenuQR QR] Failed to process universal QR:`, err)
      errors.push({ id: 'universal', error: err instanceof Error ? err.message : 'Unknown error' })
    }
  } else if (input.mode === 'bulk') {
    // Generate universal QR first
    try {
      const res = await processUniversal(restaurant.id)
      results.push(res)
    } catch (err) {
      console.error(`[MenuQR QR] Failed to process universal QR:`, err)
      errors.push({ id: 'universal', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    const { data: tables, error: tablesError } = await adminSupabase
      .from('tables')
      .select('id, table_number, table_name, restaurant_id')
      .eq('restaurant_id', input.restaurantId)
      .eq('is_active', true)
      .order('table_number', { ascending: true })

    if (!tablesError && tables) {
      await Promise.allSettled(
        tables.map((table) =>
          processTable(table).then(
            (result) => results.push(result),
            (err) => {
              console.error(`[MenuQR QR] Failed to process table ${table.id}:`, err)
              errors.push({ id: table.id, error: err instanceof Error ? err.message : 'Unknown error' })
            }
          )
        )
      )
    }
  } else {
    const { data: table, error: tableError } = await adminSupabase
      .from('tables')
      .select('id, table_number, table_name, restaurant_id')
      .eq('id', input.tableId)
      .eq('restaurant_id', input.restaurantId)
      .single()

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    try {
      const res = await processTable(table)
      results.push(res)
    } catch (err) {
      console.error(`[MenuQR QR] Failed to process table ${table.id}:`, err)
      errors.push({ id: table.id, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  // Sort results (tables by number, universal first)
  results.sort((a, b) => {
    if (a.type === 'universal') return -1
    if (b.type === 'universal') return 1
    return (a.tableNumber ?? 0) - (b.tableNumber ?? 0)
  })

  if (results.length === 0) {
    return NextResponse.json(
      { error: 'All QR code generations failed', errors },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    mode: input.mode,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    generated: results.length,
    failed: errors.length,
    qrCodes: results,
    ...(errors.length > 0 && { errors }),
  })
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

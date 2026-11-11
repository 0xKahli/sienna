import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
// heic-convert is CJS — use require to avoid ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require('heic-convert') as (opts: {
  buffer: Uint8Array
  format: 'JPEG' | 'PNG'
  quality?: number
}) => Promise<ArrayBuffer>
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'sienna'

const HEIC_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

function isHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif'
}

function checkPassword(req: NextRequest): boolean {
  const pw = req.headers.get('x-upload-password')
  return pw === process.env.UPLOAD_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  let buffer = Buffer.from(arrayBuffer)
  let contentType = file.type
  let outputExt: string

  if (isHeic(file)) {
    // Convert HEIC to lossless PNG first to prevent double-compression artifacts
    const converted = await heicConvert({
      buffer: Uint8Array.from(buffer),
      format: 'PNG',
    })
    // High-fidelity JPEG: 96% quality, 4:4:4 color chroma (no color blur), mozjpeg trellis quantization
    buffer = await sharp(Buffer.from(converted))
      .rotate()
      .jpeg({
        quality: 96,
        chromaSubsampling: '4:4:4',
        mozjpeg: true,
      })
      .toBuffer()
    contentType = 'image/jpeg'
    outputExt = 'jpg'
  } else {
    outputExt = file.name.split('.').pop() ?? 'jpg'
  }

  // Build a unique storage path
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${outputExt}`
  const storagePath = `photos/${uniqueName}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get the public URL
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  // Insert into database
  const { data: photo, error: dbError } = await supabaseAdmin
    .from('photos')
    .insert({ url: publicUrl, storage_path: storagePath })
    .select()
    .single()

  if (dbError) {
    // Attempt to clean up the orphaned file
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(photo, { status: 201 })
}

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
import { checkUploadPassword } from '@/lib/auth'

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

export async function POST(req: NextRequest) {
  if (!checkUploadPassword(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const originalBuffer = Buffer.from(arrayBuffer)
  const isInputHeic = isHeic(file)

  let displayBuffer: Buffer
  let displayContentType = 'image/jpeg'
  let originalUrl: string | null = null
  let originalStoragePath: string | null = null

  const uniqueBase = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  if (isInputHeic) {
    // 1. Store the untouched, original HEIC file for direct download
    originalStoragePath = `photos/originals/${uniqueBase}.heic`
    const { error: origUploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(originalStoragePath, originalBuffer, {
        contentType: 'image/heic',
        upsert: false,
      })

    if (origUploadError) {
      return NextResponse.json({ error: origUploadError.message }, { status: 500 })
    }

    const { data: origUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(originalStoragePath)
    originalUrl = origUrlData.publicUrl

    // 2. Convert HEIC to high-fidelity JPEG for web browsers to render in gallery
    const converted = await heicConvert({
      buffer: Uint8Array.from(originalBuffer),
      format: 'PNG',
    })
    displayBuffer = await sharp(Buffer.from(converted))
      .rotate()
      .jpeg({
        quality: 96,
        chromaSubsampling: '4:4:4',
        mozjpeg: true,
      })
      .toBuffer()
  } else {
    // Non-HEIC image (JPEG, PNG, WebP)
    displayBuffer = originalBuffer
    displayContentType = file.type || 'image/jpeg'
  }

  // Extract dimensions
  const imageInfo = await sharp(displayBuffer).rotate().metadata()
  let width = imageInfo.width || null
  let height = imageInfo.height || null
  if (width && height && imageInfo.orientation && imageInfo.orientation >= 5 && imageInfo.orientation <= 8) {
    const temp = width
    width = height
    height = temp
  }

  // Generate lightweight inline blur placeholder (~300 bytes)
  const blurBuffer = await sharp(displayBuffer)
    .rotate()
    .resize(24, 24, { fit: 'inside' })
    .jpeg({ quality: 25 })
    .toBuffer()
  const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`

  // Generate fast preview thumbnail (WebP ~30KB) for instant loading
  const thumbBuffer = await sharp(displayBuffer)
    .rotate()
    .resize(720, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 65 })
    .toBuffer()

  const thumbMeta = await sharp(thumbBuffer).metadata()
  if (thumbMeta.width && thumbMeta.height) {
    width = thumbMeta.width
    height = thumbMeta.height
  }

  const thumbStoragePath = `photos/thumbnails/${uniqueBase}.webp`
  const { error: thumbUploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(thumbStoragePath, thumbBuffer, {
      contentType: 'image/webp',
      upsert: false,
    })

  let thumbnailUrl: string | null = null
  if (!thumbUploadError) {
    const { data: thumbUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(thumbStoragePath)
    thumbnailUrl = thumbUrlData.publicUrl
  }

  // 3. Upload display version (full resolution)
  const displayExt = isInputHeic ? 'jpg' : (file.name.split('.').pop() ?? 'jpg')
  const storagePath = `photos/${uniqueBase}.${displayExt}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, displayBuffer, {
      contentType: displayContentType,
      upsert: false,
    })

  if (uploadError) {
    const toClean = [thumbStoragePath]
    if (originalStoragePath) toClean.push(originalStoragePath)
    await supabaseAdmin.storage.from(BUCKET).remove(toClean)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public display URL
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  // 4. Insert into database (placed at the top of the gallery)
  const { data: minPosData } = await supabaseAdmin
    .from('photos')
    .select('position')
    .order('position', { ascending: true })
    .limit(1)

  const newPosition = typeof minPosData?.[0]?.position === 'number'
    ? minPosData[0].position - 1
    : 0

  const { data: photo, error: dbError } = await supabaseAdmin
    .from('photos')
    .insert({
      url: publicUrl,
      storage_path: storagePath,
      original_url: originalUrl,
      original_storage_path: originalStoragePath,
      thumbnail_url: thumbnailUrl,
      blur_data_url: blurDataUrl,
      width,
      height,
      position: newPosition,
    })
    .select()
    .single()

  if (dbError) {
    const toRemove = [storagePath, thumbStoragePath]
    if (originalStoragePath) toRemove.push(originalStoragePath)
    await supabaseAdmin.storage.from(BUCKET).remove(toRemove)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(photo, { status: 201 })
}

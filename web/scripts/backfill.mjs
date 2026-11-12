import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const SUPABASE_URL = 'https://goqumfwyhaqxteczlhjo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcXVtZnd5aGFxeHRlY3psaGpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDQwODY0NiwiZXhwIjoyMTA5OTg0NjQ2fQ.DcY9EyrNr4t1567JHi8AsXKQl3txIR68vRmjz2-D0Bc'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function backfill() {
  console.log('Fetching photos to backfill...')
  const { data: photos, error } = await supabase.from('photos').select('*')
  if (error || !photos) {
    console.error('Failed to fetch photos:', error)
    return
  }

  console.log(`Found ${photos.length} photos. Processing...`)

  for (const photo of photos) {
    console.log(`Processing photo ${photo.id}...`)
    try {
      const res = await fetch(photo.url)
      if (!res.ok) {
        console.warn(`Failed to fetch photo url for ${photo.id}: ${res.status}`)
        continue
      }
      const arrayBuf = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)

      const image = sharp(buffer).rotate()
      const metadata = await image.metadata()

      // 1. Generate ultra-lightweight blur data URL (around 300-500 bytes)
      const blurBuffer = await sharp(buffer)
        .rotate()
        .resize(24, 24, { fit: 'inside' })
        .jpeg({ quality: 25 })
        .toBuffer()
      const blur_data_url = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`

      // 2. Generate fast preview thumbnail (WebP ~30KB)
      const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(720, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 65 })
        .toBuffer()

      const thumbPath = `photos/thumbnails/${photo.id}.webp`
      const { error: uploadErr } = await supabase.storage.from('sienna').upload(thumbPath, thumbBuffer, {
        contentType: 'image/webp',
        upsert: true,
      })

      if (uploadErr) {
        console.error(`Failed to upload thumbnail for ${photo.id}:`, uploadErr)
      }

      const { data: urlData } = supabase.storage.from('sienna').getPublicUrl(thumbPath)
      const thumbnail_url = urlData.publicUrl

      // 3. Update database row
      const { error: updateErr } = await supabase.from('photos').update({
        blur_data_url,
        thumbnail_url,
        width: metadata.width || 800,
        height: metadata.height || 1200,
      }).eq('id', photo.id)

      if (updateErr) {
        console.error(`Failed to update DB for ${photo.id}:`, updateErr)
      } else {
        console.log(`✓ Photo ${photo.id} backfilled successfully (${metadata.width}x${metadata.height})`)
      }
    } catch (err) {
      console.error(`Error processing photo ${photo.id}:`, err)
    }
  }

  console.log('Backfill complete!')
}

backfill()

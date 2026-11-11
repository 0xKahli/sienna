import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkPassword(req: NextRequest): boolean {
  const pw = req.headers.get('x-upload-password')
  return pw === process.env.UPLOAD_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { photoIds } = (await req.json()) as { photoIds?: string[] }

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'photoIds array is required' }, { status: 400 })
  }

  // Update position for each photo: position = index (0, 1, 2, ...)
  const updates = photoIds.map((id, index) =>
    supabaseAdmin
      .from('photos')
      .update({ position: index })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const failure = results.find((r) => r.error)

  if (failure && failure.error) {
    return NextResponse.json({ error: failure.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

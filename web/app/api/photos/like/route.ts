import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const photoId = body?.photoId

    if (!photoId || typeof photoId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid photoId' }, { status: 400 })
    }

    // Read current likes cookie
    const rawCookie = req.cookies.get('sienna_likes')?.value || ''
    let likedIds: string[] = []
    if (rawCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawCookie))
        if (Array.isArray(parsed)) likedIds = parsed
      } catch {
        likedIds = []
      }
    }

    const alreadyLiked = likedIds.includes(photoId)
    const delta = alreadyLiked ? -1 : 1
    const newLiked = !alreadyLiked

    // Atomic update in Supabase via RPC increment_like
    const { data: newCount, error } = await supabaseAdmin.rpc('increment_like', {
      photo_id: photoId,
      delta,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update the likedIds list
    let updatedLikedIds: string[]
    if (newLiked) {
      updatedLikedIds = [...likedIds, photoId]
    } else {
      updatedLikedIds = likedIds.filter((id) => id !== photoId)
    }

    const res = NextResponse.json({
      success: true,
      liked: newLiked,
      likes_count: typeof newCount === 'number' ? newCount : 0,
    })

    // Set cookie valid for 400 days (accessible to client for instant initial state)
    res.cookies.set('sienna_likes', encodeURIComponent(JSON.stringify(updatedLikedIds)), {
      path: '/',
      maxAge: 400 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: false,
    })

    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

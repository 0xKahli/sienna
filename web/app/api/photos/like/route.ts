import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function parseDevice(userAgent: string, secPlatform?: string | null, isMobileHeader?: boolean) {
  let deviceType = isMobileHeader ? 'mobile' : 'desktop'
  let os = secPlatform || 'Unknown'
  let browser = 'Unknown'

  const ua = userAgent.toLowerCase()

  if (ua.includes('iphone')) {
    deviceType = 'mobile'
    os = 'iOS (iPhone)'
  } else if (ua.includes('ipad')) {
    deviceType = 'tablet'
    os = 'iPadOS'
  } else if (ua.includes('android')) {
    deviceType = ua.includes('mobile') ? 'mobile' : 'tablet'
    os = 'Android'
  } else if (ua.includes('macintosh') || ua.includes('mac os x')) {
    deviceType = 'desktop'
    os = 'macOS'
  } else if (ua.includes('windows')) {
    deviceType = 'desktop'
    os = 'Windows'
  } else if (ua.includes('linux')) {
    deviceType = 'desktop'
    os = 'Linux'
  }

  if (ua.includes('edg/')) {
    browser = 'Edge'
  } else if (ua.includes('chrome') && !ua.includes('edg/')) {
    browser = 'Chrome'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari'
  } else if (ua.includes('firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    browser = 'Opera'
  }

  return { deviceType, os, browser }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const photoId = body?.photoId

    if (!photoId || typeof photoId !== 'string' || !UUID_REGEX.test(photoId)) {
      return NextResponse.json({ error: 'Missing or invalid photoId' }, { status: 400 })
    }

    // 1. Read current likes cookie
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

    // 2. Atomic update in Supabase via RPC increment_like
    const { data: newCount, error } = await supabaseAdmin.rpc('increment_like', {
      photo_id: photoId,
      delta,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. Extract detailed device and location info
    const forwarded = req.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || 'Unknown')
    const userAgent = req.headers.get('user-agent') || 'Unknown'
    const secPlatform = req.headers.get('sec-ch-ua-platform')?.replace(/"/g, '') || null
    const isMobileHeader = req.headers.get('sec-ch-ua-mobile') === '?1'

    const country = req.headers.get('x-vercel-ip-country') || null
    const region = req.headers.get('x-vercel-ip-country-region') || null
    const cityRaw = req.headers.get('x-vercel-ip-city')
    const city = cityRaw ? decodeURIComponent(cityRaw) : null

    const { deviceType, os, browser } = parseDevice(userAgent, secPlatform, isMobileHeader)

    let visitorId = req.cookies.get('sienna_visitor_id')?.value
    let isNewVisitor = false
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      isNewVisitor = true
    }

    // 4. Log device info to Supabase photo_like_logs table
    const logAction = newLiked ? 'like' : 'unlike'
    await supabaseAdmin.from('photo_like_logs').insert({
      photo_id: photoId,
      action: logAction,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      os,
      browser,
      country,
      region,
      city,
      visitor_id: visitorId,
    })

    console.log(`[DEVICE LIKE LOG] Photo: ${photoId} | Action: ${logAction.toUpperCase()} | Device: ${deviceType} (${os}, ${browser}) | IP: ${ipAddress} | Location: ${city || 'Unknown'}, ${country || 'Unknown'}`)

    // 5. Update the likedIds list in cookie
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

    // Set cookie valid for 400 days
    res.cookies.set('sienna_likes', encodeURIComponent(JSON.stringify(updatedLikedIds)), {
      path: '/',
      maxAge: 400 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: false,
    })

    if (isNewVisitor) {
      res.cookies.set('sienna_visitor_id', visitorId, {
        path: '/',
        maxAge: 400 * 24 * 60 * 60,
        sameSite: 'lax',
        httpOnly: true,
      })
    }

    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkPassword(req: NextRequest): boolean {
  const pw = req.headers.get('x-upload-password')
  return pw === process.env.UPLOAD_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('photo_like_logs')
    .select(`
      id,
      photo_id,
      action,
      ip_address,
      user_agent,
      device_type,
      os,
      browser,
      country,
      region,
      city,
      visitor_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

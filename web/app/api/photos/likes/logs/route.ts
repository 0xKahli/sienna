import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkUploadPassword } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!checkUploadPassword(req)) {
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

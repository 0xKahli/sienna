import { NextRequest, NextResponse } from 'next/server'
import { checkUploadPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const candidate = body?.password || req.headers.get('x-upload-password')

    if (!checkUploadPassword(req, candidate)) {
      return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

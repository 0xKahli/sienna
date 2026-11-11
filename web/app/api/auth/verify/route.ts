import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const password = body?.password || req.headers.get('x-upload-password')

    if (!password || password !== process.env.UPLOAD_PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

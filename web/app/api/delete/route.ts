import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'sienna'

function checkPassword(req: NextRequest): boolean {
  const pw = req.headers.get('x-upload-password')
  return pw === process.env.UPLOAD_PASSWORD
}

export async function DELETE(req: NextRequest) {
  if (!checkPassword(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, storage_path, original_storage_path } = (await req.json()) as {
    id: string
    storage_path: string
    original_storage_path?: string | null
  }

  if (!id || !storage_path) {
    return NextResponse.json({ error: 'id and storage_path are required' }, { status: 400 })
  }

  // Remove from storage
  const pathsToRemove = [storage_path]
  if (original_storage_path) {
    pathsToRemove.push(original_storage_path)
  }

  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove(pathsToRemove)

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  // Delete from database
  const { error: dbError } = await supabaseAdmin
    .from('photos')
    .delete()
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

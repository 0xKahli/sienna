import 'server-only'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Timing-safe authentication check for admin/uploader endpoints.
 * Protects against timing attacks and rejects any request if UPLOAD_PASSWORD is not configured.
 */
export function checkUploadPassword(req: NextRequest, candidatePassword?: string | null): boolean {
  const configured = process.env.UPLOAD_PASSWORD
  if (!configured || configured.trim().length === 0) {
    return false
  }

  const pw = candidatePassword ?? req.headers.get('x-upload-password')
  if (!pw || typeof pw !== 'string') {
    return false
  }

  const bufA = Buffer.from(pw)
  const bufB = Buffer.from(configured)

  if (bufA.length !== bufB.length) {
    return false
  }

  return crypto.timingSafeEqual(bufA, bufB)
}

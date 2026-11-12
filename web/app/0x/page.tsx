'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import UploadDropzone from '@/components/UploadDropzone'
import { Photo } from '@/lib/types'
import {
  isBiometricsAvailable,
  hasBiometricEnrollment,
  enrollBiometrics,
  authenticateWithBiometrics,
  clearBiometrics,
} from '@/lib/webauthn'

interface FileWithPreview {
  file: File
  preview: string | null   // null for HEIC (browser can't decode)
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface LikeLog {
  id: string
  photo_id: string
  action: string
  ip_address: string
  device_type: string
  os: string
  browser: string
  country: string | null
  region: string | null
  city: string | null
  created_at: string
}

function FaceIdIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3H5a2 2 0 0 0-2 2v2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M3 17v2a2 2 0 0 0 2 2h2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
      <path d="M10 14a2.5 2.5 0 0 0 4 0" />
      <path d="M12 11v2" />
    </svg>
  )
}

function LockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default function UploadPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [supportsBiometrics, setSupportsBiometrics] = useState(false)
  const [hasEnrolled, setHasEnrolled] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState('')

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [originalPhotos, setOriginalPhotos] = useState<Photo[]>([])
  const [isOrderDirty, setIsOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [likeLogs, setLikeLogs] = useState<LikeLog[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchLogs = useCallback(async () => {
    if (!password) return
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/photos/likes/logs', {
        headers: { 'x-upload-password': password },
      })
      if (res.ok) {
        const data = await res.json()
        setLikeLogs(data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false)
    }
  }, [password])

  // Check biometrics capability on mount.
  // Note: We deliberately do NOT auto-unlock from permanent storage so that
  // user authenticates with Face ID or password EACH TIME they open the page!
  useEffect(() => {
    // Clean up any legacy plaintext passwords stored permanently
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sienna_password')
    }

    async function checkSupport() {
      const supported = await isBiometricsAvailable()
      setSupportsBiometrics(supported)
      setHasEnrolled(hasBiometricEnrollment())
    }
    checkSupport()
  }, [])

  const fetchPhotos = useCallback(async () => {
    const res = await fetch('/api/photos')
    if (res.ok) {
      const data = await res.json()
      setPhotos(data)
      setOriginalPhotos(data)
      setIsOrderDirty(false)
    }
  }, [])

  useEffect(() => {
    if (authed) fetchPhotos()
  }, [authed, fetchPhotos])

  // --- Password Auth ---
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      setAuthError('Please enter the password.')
      return
    }

    setIsVerifying(true)
    setAuthError('')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      if (res.ok) {
        setAuthed(true)
        setAuthError('')
      } else {
        setAuthError('Incorrect password.')
      }
    } catch {
      setAuthError('Network error verifying password.')
    } finally {
      setIsVerifying(false)
    }
  }

  // --- Biometric Auth (Face ID on iPhone) ---
  async function handleBiometricAuth() {
    setIsVerifying(true)
    setAuthError('')

    const result = await authenticateWithBiometrics()
    if (result.success && result.password) {
      // Verify recovered password against backend
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: result.password }),
        })

        if (res.ok) {
          setPassword(result.password)
          setAuthed(true)
          setAuthError('')
        } else {
          setAuthError('Stored biometric credential is outdated. Please enter password.')
          clearBiometrics()
          setHasEnrolled(false)
        }
      } catch {
        setAuthError('Network error completing authentication.')
      }
    } else {
      setAuthError(result.error || 'Face ID authentication cancelled or failed.')
    }

    setIsVerifying(false)
  }

  // --- Enroll Biometrics ---
  async function handleEnrollBiometrics() {
    if (!password) return
    setIsEnrolling(true)
    setEnrollSuccessMessage('')

    const res = await enrollBiometrics(password)
    if (res.success) {
      setHasEnrolled(true)
      setEnrollSuccessMessage('Face ID registered for this device!')
      setTimeout(() => setEnrollSuccessMessage(''), 4000)
    } else {
      alert(res.error || 'Failed to enroll Face ID.')
    }
    setIsEnrolling(false)
  }

  function handleRemoveBiometrics() {
    if (confirm('Remove Face ID shortcut on this device?')) {
      clearBiometrics()
      setHasEnrolled(false)
    }
  }

  function handleLock() {
    setAuthed(false)
    setPassword('')
    setFiles([])
  }

  // --- Desktop Drag & Drop Reordering ---
  function handleDragStart(index: number) {
    setDraggedPhotoIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedPhotoIndex === null || draggedPhotoIndex === index) return

    setPhotos((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(draggedPhotoIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    setDraggedPhotoIndex(index)
    setIsOrderDirty(true)
  }

  function handleDragEnd() {
    setDraggedPhotoIndex(null)
  }

  // --- Mobile / Touch Drag & Swipe Reordering ---
  function handleTouchStart(index: number) {
    setDraggedPhotoIndex(index)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (draggedPhotoIndex === null) return
    const touch = e.touches[0]
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-photo-index]')
    if (targetEl) {
      const targetIdx = Number(targetEl.getAttribute('data-photo-index'))
      if (!isNaN(targetIdx) && targetIdx !== draggedPhotoIndex) {
        setPhotos((prev) => {
          const updated = [...prev]
          const [moved] = updated.splice(draggedPhotoIndex, 1)
          updated.splice(targetIdx, 0, moved)
          return updated
        })
        setDraggedPhotoIndex(targetIdx)
        setIsOrderDirty(true)
      }
    }
  }

  function handleTouchEnd() {
    setDraggedPhotoIndex(null)
  }

  function resetOrder() {
    setPhotos(originalPhotos)
    setIsOrderDirty(false)
  }

  async function saveOrder() {
    if (savingOrder) return
    setSavingOrder(true)

    try {
      const photoIds = photos.map((p) => p.id)
      const res = await fetch('/api/photos/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upload-password': password,
        },
        body: JSON.stringify({ photoIds }),
      })

      if (res.ok) {
        setOriginalPhotos(photos)
        setIsOrderDirty(false)
      } else {
        alert('Failed to save photo order.')
      }
    } catch {
      alert('Network error saving photo order.')
    } finally {
      setSavingOrder(false)
    }
  }

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => {
      const isHeic = /heic|heif/i.test(file.name.split('.').pop() ?? '') ||
        /heic|heif/i.test(file.type)
      return {
        file,
        preview: isHeic ? null : URL.createObjectURL(file),
        status: 'pending' as const,
      }
    })
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  async function compressImageClient(file: File): Promise<File> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || /heic|heif/i.test(file.type) || /heic|heif/i.test(file.name)) {
        return resolve(file)
      }

      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let { width, height } = img

        const maxDim = 2400
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(file)

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressed)
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(file)
      }
      img.src = url
    })
  }

  async function uploadSingleFile(item: FileWithPreview, compressIfLarge = false): Promise<boolean> {
    setFiles((prev) =>
      prev.map((f) => (f.file === item.file ? { ...f, status: 'uploading', error: undefined } : f))
    )

    let fileToUpload = item.file
    if (compressIfLarge && fileToUpload.size > 4 * 1024 * 1024) {
      try {
        fileToUpload = await compressImageClient(fileToUpload)
      } catch {
        // fallback
      }
    }

    const formData = new FormData()
    formData.append('file', fileToUpload)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-upload-password': password },
        body: formData,
      })

      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => (f.file === item.file ? { ...f, status: 'done', error: undefined } : f))
        )
        return true
      } else {
        let errorMsg = res.status === 413 ? 'Error 413' : 'Upload failed'
        if (res.status !== 413) {
          try {
            const body = await res.json()
            if (body?.error) errorMsg = body.error
          } catch {
            errorMsg = res.statusText || `Error ${res.status}`
          }
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.file === item.file ? { ...f, status: 'error', error: errorMsg } : f
          )
        )
        return false
      }
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === item.file ? { ...f, status: 'error', error: 'Network error' } : f
        )
      )
      return false
    }
  }

  async function retrySingleFile(item: FileWithPreview) {
    const is413 = item.error?.includes('413')
    const success = await uploadSingleFile(item, is413)
    if (success) {
      await fetchPhotos()
    }
  }

  async function uploadAll() {
    if (uploading) return
    setUploading(true)

    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error')

    for (const item of pending) {
      const is413 = item.error?.includes('413')
      await uploadSingleFile(item, is413)
    }

    setUploading(false)
    await fetchPhotos()
  }

  async function deletePhoto(photo: Photo) {
    const res = await fetch('/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-password': password,
      },
      body: JSON.stringify({
        id: photo.id,
        storage_path: photo.storage_path,
        original_storage_path: photo.original_storage_path,
      }),
    })

    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    } else {
      alert('Failed to delete photo.')
    }
  }

  function clearDone() {
    setFiles((prev) => prev.filter((f) => f.status !== 'done'))
  }

  // ==========================================
  // --- Lock Screen (Each time user visits) ---
  // ==========================================
  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-sm flex flex-col gap-6">
          {/* Logo & Header */}
          <div className="text-center space-y-1">
            <h2
              className="text-3xl tracking-wide text-[#8b7355] dark:text-[#a89482]"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              sienna
            </h2>
            <p className="text-xs uppercase tracking-widest text-[#8b7355]/70 dark:text-[#a89482]/70 font-light">
              authenticate to continue
            </p>
          </div>

          {/* Biometrics Option (Face ID) */}
          {supportsBiometrics && hasEnrolled && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isVerifying}
                className="w-full flex items-center justify-center gap-2.5 bg-[#c17f52] hover:bg-[#a86a40] text-white py-3 px-4 rounded-lg font-medium text-sm tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
              >
                <FaceIdIcon className="w-5 h-5 text-white/95" />
                <span>{isVerifying ? 'Verifying…' : 'Unlock with Face ID'}</span>
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-[#c8b89a]/30 dark:bg-[#423730]" />
                <span className="text-[10px] text-[#8b7355]/60 dark:text-[#a89482]/60 uppercase tracking-widest">
                  or use password
                </span>
                <div className="flex-1 h-px bg-[#c8b89a]/30 dark:bg-[#423730]" />
              </div>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="upload password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isVerifying}
              autoFocus={!hasEnrolled}
              className="border border-[#c8b89a] dark:border-[#423730] rounded-lg px-4 py-2.5 bg-white/40 dark:bg-[#221c19]/40 text-[#2c2420] dark:text-[#ede7e1] placeholder-[#c8b89a] dark:placeholder-[#6a5b51] focus:outline-none focus:border-[#8b7355] dark:focus:border-[#a89482] text-sm tracking-wide transition-colors"
            />

            {authError && (
              <p className="text-red-400 dark:text-red-300 text-xs text-center px-1 font-light">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className={`rounded-lg px-4 py-2.5 text-sm tracking-widest uppercase font-medium transition-all cursor-pointer ${
                hasEnrolled
                  ? 'border border-[#c8b89a]/60 dark:border-[#423730] text-[#8b7355] dark:text-[#a89482] hover:bg-[#8b7355]/10'
                  : 'bg-[#8b7355] dark:bg-[#a89482] text-[#faf7f4] dark:text-[#181412] hover:bg-[#c17f52] dark:hover:bg-[#d48b5e] shadow-sm'
              }`}
            >
              {isVerifying ? 'checking…' : 'enter'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // --- Upload UI (Authenticated) ---
  // ==========================================
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header row with Face ID setup & Lock button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg tracking-widest text-[#8b7355] dark:text-[#a89482]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            0x
          </h2>
          {enrollSuccessMessage && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-light animate-fade-in">
              {enrollSuccessMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Biometrics Setup / Status */}
          {supportsBiometrics && !hasEnrolled && (
            <button
              type="button"
              onClick={handleEnrollBiometrics}
              disabled={isEnrolling}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#c17f52] dark:text-[#d48b5e] border border-[#c17f52]/40 dark:border-[#d48b5e]/40 hover:bg-[#c17f52]/10 rounded-md transition-colors tracking-wide cursor-pointer"
              title="Enable Face ID for one-tap unlock next time"
            >
              <FaceIdIcon className="w-3.5 h-3.5" />
              <span>{isEnrolling ? 'enrolling…' : 'enable Face ID'}</span>
            </button>
          )}

          {supportsBiometrics && hasEnrolled && (
            <button
              type="button"
              onClick={handleRemoveBiometrics}
              className="text-[11px] text-[#8b7355]/60 dark:text-[#a89482]/60 hover:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Click to remove Face ID for this device"
            >
              ✓ Face ID active
            </button>
          )}

          {/* Lock / Sign Out */}
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-1.5 text-xs text-[#c8b89a] dark:text-[#6a5b51] hover:text-[#8b7355] dark:hover:text-[#a89482] transition-colors tracking-widest uppercase cursor-pointer"
            title="Lock session"
          >
            <LockIcon className="w-3.5 h-3.5" />
            <span>lock</span>
          </button>
        </div>
      </div>

      {/* Dropzone */}
      <UploadDropzone onDrop={onDrop} />

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[#8b7355] dark:text-[#a89482] tracking-widest uppercase">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-3">
              {files.some((f) => f.status === 'done') && (
                <button
                  onClick={clearDone}
                  className="text-xs text-[#c8b89a] dark:text-[#6a5b51] hover:text-[#8b7355] dark:hover:text-[#a89482] transition-colors tracking-widest"
                >
                  clear done
                </button>
              )}
              {files.some((f) => f.status === 'pending') && (
                <button
                  onClick={uploadAll}
                  disabled={uploading}
                  className="text-xs bg-[#8b7355] dark:bg-[#a89482] text-[#faf7f4] dark:text-[#181412] rounded px-4 py-1.5 tracking-widest hover:bg-[#c17f52] dark:hover:bg-[#d48b5e] transition-colors disabled:opacity-50"
                >
                  {uploading ? 'uploading…' : 'upload all'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {files.map((item, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded bg-[#ede8e1] dark:bg-[#221c19]">
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // HEIC placeholder — browser can't render it, server will convert
                  <div className="w-full h-full bg-[#ede8e1] dark:bg-[#221c19] flex flex-col items-center justify-center gap-1">
                    <span className="text-[#8b7355] dark:text-[#d48b5e] text-xs font-medium tracking-widest">HEIC</span>
                    <span className="text-[#c8b89a] dark:text-[#6a5b51] text-[10px] tracking-wide truncate max-w-[80px] px-1">
                      {item.file.name}
                    </span>
                  </div>
                )}
                {/* Status overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center text-xs font-medium transition-opacity ${
                    item.status === 'pending'
                      ? 'opacity-0 pointer-events-none'
                      : 'opacity-100 bg-black/55 text-white'
                  }`}
                >
                  {item.status === 'uploading' && (
                    <div className="flex flex-col items-center gap-1.5">
                      <svg
                        className="animate-spin w-5 h-5 text-white/90"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span className="text-[10px] text-white/80 tracking-widest uppercase">uploading</span>
                    </div>
                  )}
                  {item.status === 'done' && (
                    <span className="text-xl text-emerald-400 font-bold">✓</span>
                  )}
                  {item.status === 'error' && (
                    <div className="flex flex-col items-center justify-center gap-2 p-2 text-center w-full">
                      <span className="text-xs font-semibold text-red-300 drop-shadow-sm tracking-wide">
                        {item.error || 'Error 413'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          retrySingleFile(item)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/25 hover:bg-white/35 active:scale-95 text-white text-[11px] font-medium tracking-wider uppercase transition-all backdrop-blur-md border border-white/30 shadow-sm cursor-pointer"
                        title="Retry upload"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                          <path d="M16 21h5v-5" />
                        </svg>
                        retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing photos with Reordering */}
      {photos.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs text-[#8b7355] dark:text-[#a89482] tracking-widest uppercase">
                {photos.length} photo{photos.length !== 1 ? 's' : ''} · drag or swipe to reorder
              </h3>
            </div>
            {isOrderDirty && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetOrder}
                  disabled={savingOrder}
                  className="text-xs text-[#c8b89a] dark:text-[#6a5b51] hover:text-[#8b7355] dark:hover:text-[#a89482] transition-colors tracking-widest uppercase cursor-pointer"
                >
                  reset
                </button>
                <button
                  type="button"
                  onClick={saveOrder}
                  disabled={savingOrder}
                  className="text-xs bg-[#8b7355] dark:bg-[#a89482] text-[#faf7f4] dark:text-[#181412] rounded px-3 py-1 tracking-widest hover:bg-[#c17f52] dark:hover:bg-[#d48b5e] transition-colors font-medium shadow-sm uppercase disabled:opacity-50 cursor-pointer"
                >
                  {savingOrder ? 'saving…' : 'save order'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                data-photo-index={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => handleTouchStart(index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative group aspect-square overflow-hidden rounded bg-[#ede8e1] dark:bg-[#221c19] cursor-grab active:cursor-grabbing transition-all select-none touch-none ${
                  draggedPhotoIndex === index
                    ? 'opacity-60 scale-105 z-20 shadow-2xl ring-2 ring-[#c17f52]'
                    : 'hover:scale-[1.01]'
                }`}
              >
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="(max-width: 672px) 33vw, 224px"
                  className="object-cover pointer-events-none"
                />

                {/* Position Index Badge */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/60 text-white/90 backdrop-blur-sm pointer-events-none">
                  {index + 1}
                </span>

                {/* Delete button — visible on hover/touch */}
                <button
                  type="button"
                  onClick={() => deletePhoto(photo)}
                  aria-label="Delete photo"
                  className="absolute top-1.5 right-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded p-1 text-xs leading-none hover:bg-red-600 cursor-pointer"
                  title="Delete photo"
                >
                  🗑️
                </button>

                {/* Like count badge */}
                {(photo.likes_count ?? 0) > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/60 text-white/90 backdrop-blur-sm pointer-events-none flex items-center gap-1">
                    ♥ {photo.likes_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Activity / Like Logs Section */}
      <div className="mt-20 pt-10 border-t border-[#c8b89a]/30 dark:border-[#423730]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs text-[#8b7355] dark:text-[#a89482] tracking-widest uppercase font-medium">
              Device Activity & Likes Log
            </h3>
            <p className="text-[11px] text-[#8b7355]/70 dark:text-[#a89482]/70 font-light mt-0.5">
              Device, OS, browser, IP, and location logged for every like event
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!showLogs) fetchLogs()
              setShowLogs(!showLogs)
            }}
            className="text-xs px-3 py-1.5 rounded-md border border-[#c8b89a]/50 dark:border-[#423730] text-[#8b7355] dark:text-[#a89482] hover:bg-[#8b7355]/10 transition-colors uppercase tracking-wider cursor-pointer"
          >
            {showLogs ? 'Hide Logs' : 'View Logs'}
          </button>
        </div>

        {showLogs && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#c8b89a]/30 dark:border-[#423730] bg-white/40 dark:bg-[#1f1a17]/40 backdrop-blur-md">
            {loadingLogs ? (
              <div className="py-8 text-center text-xs text-[#8b7355] dark:text-[#a89482] tracking-widest uppercase">
                Loading device logs...
              </div>
            ) : likeLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8b7355]/70 dark:text-[#a89482]/70 font-light">
                No device activity recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#ede8e1]/60 dark:bg-[#28221e]/60 text-[#8b7355] dark:text-[#a89482] border-b border-[#c8b89a]/20 dark:border-[#423730]">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Device / OS</th>
                      <th className="p-3">Browser</th>
                      <th className="p-3">Location / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c8b89a]/15 dark:divide-[#423730]/60">
                    {likeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 text-[11px] whitespace-nowrap text-[#8b7355]/80 dark:text-[#a89482]/80">
                          {new Date(log.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              log.action === 'like'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-sans font-medium text-[#2c2420] dark:text-[#ede7e1]">
                            {log.os || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-[#8b7355]/60 dark:text-[#a89482]/60 ml-1.5 uppercase">
                            ({log.device_type})
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-[#8b7355] dark:text-[#a89482]">
                          {log.browser || 'Unknown'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-[#2c2420] dark:text-[#ede7e1]">
                            {[log.city, log.country].filter(Boolean).join(', ') || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-[#8b7355]/50 dark:text-[#a89482]/50 ml-2">
                            {log.ip_address}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import UploadDropzone from '@/components/UploadDropzone'
import { Photo } from '@/lib/types'

interface FileWithPreview {
  file: File
  preview: string | null   // null for HEIC (browser can't decode)
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function UploadPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)

  // On mount, check localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sienna_password')
    if (stored) {
      setAuthed(true)
      setPassword(stored)
    }
  }, [])

  const fetchPhotos = useCallback(async () => {
    const res = await fetch('/api/photos')
    if (res.ok) {
      const data = await res.json()
      setPhotos(data)
    }
  }, [])

  useEffect(() => {
    if (authed) fetchPhotos()
  }, [authed, fetchPhotos])

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      setAuthError('Enter a password.')
      return
    }
    // We optimistically trust the password here; the API will reject on wrong password
    localStorage.setItem('sienna_password', password.trim())
    setAuthed(true)
    setAuthError('')
  }

  function handleLogout() {
    localStorage.removeItem('sienna_password')
    setAuthed(false)
    setPassword('')
    setFiles([])
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

  async function uploadAll() {
    if (uploading) return
    setUploading(true)

    const pending = files.filter((f) => f.status === 'pending')

    for (const item of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.file === item.file ? { ...f, status: 'uploading' } : f))
      )

      const formData = new FormData()
      formData.append('file', item.file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-upload-password': password },
        body: formData,
      })

      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => (f.file === item.file ? { ...f, status: 'done' } : f))
        )
      } else {
        let errorMsg = 'Upload failed'
        try {
          const body = await res.json()
          if (body?.error) errorMsg = body.error
        } catch {
          // response had no JSON body — use status text
          errorMsg = res.statusText || `Error ${res.status}`
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.file === item.file ? { ...f, status: 'error', error: errorMsg } : f
          )
        )
      }
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
      body: JSON.stringify({ id: photo.id, storage_path: photo.storage_path }),
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

  // --- Password gate ---
  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-col gap-4 w-full max-w-xs"
        >
          <h2
            className="text-center text-lg tracking-widest text-[#8b7355] dark:text-[#a89482]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            upload
          </h2>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-[#c8b89a] dark:border-[#423730] rounded px-4 py-2 bg-transparent text-[#2c2420] dark:text-[#ede7e1] placeholder-[#c8b89a] dark:placeholder-[#6a5b51] focus:outline-none focus:border-[#8b7355] dark:focus:border-[#a89482] text-sm"
          />
          {authError && <p className="text-red-400 text-xs text-center">{authError}</p>}
          <button
            type="submit"
            className="bg-[#8b7355] dark:bg-[#a89482] text-[#faf7f4] dark:text-[#181412] rounded px-4 py-2 text-sm tracking-widest hover:bg-[#c17f52] dark:hover:bg-[#d48b5e] transition-colors"
          >
            enter
          </button>
        </form>
      </div>
    )
  }

  // --- Upload UI ---
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <h2
          className="text-lg tracking-widest text-[#8b7355] dark:text-[#a89482]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          upload
        </h2>
        <button
          onClick={handleLogout}
          className="text-xs text-[#c8b89a] dark:text-[#6a5b51] hover:text-[#8b7355] dark:hover:text-[#a89482] transition-colors tracking-widest"
        >
          sign out
        </button>
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
                      ? 'opacity-0'
                      : 'opacity-100 bg-black/40 text-white'
                  }`}
                >
                  {item.status === 'uploading' && '…'}
                  {item.status === 'done' && '✓'}
                  {item.status === 'error' && (
                    <span className="text-center px-1">{item.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing photos */}
      {photos.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xs text-[#8b7355] dark:text-[#a89482] tracking-widest uppercase mb-4">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square overflow-hidden rounded">
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="(max-width: 672px) 33vw, 224px"
                  className="object-cover"
                />
                {/* Delete button — visible on hover */}
                <button
                  onClick={() => deletePhoto(photo)}
                  aria-label="Delete photo"
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded p-1 text-xs leading-none hover:bg-red-600"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Photo } from '@/lib/types'

interface GalleryProps {
  photos: Photo[]
  initialLikedIds?: string[]
}

function HeartIcon({ filled, className = 'w-3.5 h-3.5' }: { filled: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '2'}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function parseCookieLikes(): Set<string> {
  if (typeof document === 'undefined') return new Set()
  const match = document.cookie.match(/(?:^|;\s*)sienna_likes=([^;]+)/)
  if (!match) return new Set()
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]))
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function ProgressiveImage({ photo, priority = false }: { photo: Photo; priority?: boolean }) {
  const [highResLoaded, setHighResLoaded] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)

  // Use natural aspect ratio so masonry settles instantly with zero layout shift
  const width = photo.width || 800
  const height = photo.height || 1200
  const aspectRatio = `${width} / ${height}`

  const hasDistinctThumb = Boolean(photo.thumbnail_url && photo.thumbnail_url !== photo.url)
  const thumbSrc = photo.thumbnail_url || photo.url
  const highResSrc = photo.url

  return (
    <div
      className="relative w-full overflow-hidden bg-[#ede8e1] dark:bg-[#221c19] select-none"
      style={{ aspectRatio }}
    >
      {/* Tier 0: Inline Base64 Blur Placeholder (Instant, 0ms network latency) */}
      {photo.blur_data_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.blur_data_url}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover scale-110 filter blur-xl transition-opacity duration-700 pointer-events-none ${
            highResLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* Tier 1: Fast Preview Thumbnail (~25KB, loads in ~20-50ms) */}
      {hasDistinctThumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setThumbLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.02] ${
            thumbLoaded ? 'opacity-100' : 'opacity-0'
          } ${highResLoaded ? 'opacity-0 pointer-events-none' : ''}`}
        />
      )}

      {/* Tier 2: Full-Resolution Image (loads automatically in background, crossfades in) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={highResSrc}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setHighResLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02] ${
          highResLoaded
            ? 'opacity-100'
            : hasDistinctThumb
            ? 'opacity-0'
            : 'opacity-100'
        }`}
      />
    </div>
  )
}

export default function Gallery({ photos, initialLikedIds = [] }: GalleryProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // Track liked photos via cookie Set
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set(initialLikedIds))

  // Track photo like counts
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const p of photos) {
      initial[p.id] = p.likes_count ?? 0
    }
    return initial
  })

  // Synchronize with cookie on client mount if initialLikedIds was empty
  useEffect(() => {
    const clientLikes = parseCookieLikes()
    if (clientLikes.size > 0) {
      setLikedSet((prev) => new Set([...prev, ...clientLikes]))
    }
  }, [])

  // Keep counts in sync when photos prop changes
  useEffect(() => {
    setCounts((prev) => {
      const updated = { ...prev }
      for (const p of photos) {
        if (updated[p.id] === undefined) {
          updated[p.id] = p.likes_count ?? 0
        }
      }
      return updated
    })
  }, [photos])

  const handleNextPhoto = useCallback(() => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0))
  }, [selectedPhotoIndex, photos.length])

  const handlePrevPhoto = useCallback(() => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1))
  }, [selectedPhotoIndex, photos.length])

  // Keyboard navigation & body scroll locking for enlarged popup modal
  useEffect(() => {
    if (selectedPhotoIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhotoIndex(null)
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto()
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [selectedPhotoIndex, handleNextPhoto, handlePrevPhoto])

  const handleToggleLike = async (photoId: string) => {
    const isCurrentlyLiked = likedSet.has(photoId)
    const currentCount = counts[photoId] ?? 0
    const newLiked = !isCurrentlyLiked
    const delta = newLiked ? 1 : -1
    const newCount = Math.max(0, currentCount + delta)

    // Optimistic UI updates
    setLikedSet((prev) => {
      const next = new Set(prev)
      if (newLiked) next.add(photoId)
      else next.delete(photoId)
      return next
    })

    setCounts((prev) => ({
      ...prev,
      [photoId]: newCount,
    }))

    // Heart pop animation
    setAnimatingId(photoId)
    setTimeout(() => setAnimatingId(null), 350)

    try {
      const res = await fetch('/api/photos/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      })

      if (res.ok) {
        const data = await res.json()
        if (typeof data.likes_count === 'number') {
          setCounts((prev) => ({
            ...prev,
            [photoId]: data.likes_count,
          }))
        }
      } else {
        // Rollback on failure
        rollback(isCurrentlyLiked, currentCount)
      }
    } catch {
      rollback(isCurrentlyLiked, currentCount)
    }

    function rollback(wasLiked: boolean, oldCount: number) {
      setLikedSet((prev) => {
        const next = new Set(prev)
        if (wasLiked) next.add(photoId)
        else next.delete(photoId)
        return next
      })
      setCounts((prev) => ({
        ...prev,
        [photoId]: oldCount,
      }))
    }
  }

  const handleDownload = async (photo: Photo) => {
    try {
      setDownloadingId(photo.id)
      const downloadUrl = photo.original_url || photo.url
      const isHeic = downloadUrl.toLowerCase().includes('.heic')
      const ext = isHeic ? 'heic' : 'jpg'
      const filename = `sienna-${photo.id.slice(0, 8)}.${ext}`

      const res = await fetch(downloadUrl)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(photo.original_url || photo.url, '_blank')
    } finally {
      setTimeout(() => setDownloadingId(null), 500)
    }
  }

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Pinterest-style Masonry Columns */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 sm:gap-6 [column-fill:_balance]">
        {photos.map((photo, index) => {
          const isLiked = likedSet.has(photo.id)
          const likeCount = counts[photo.id] ?? photo.likes_count ?? 0

          return (
            <div
              key={photo.id}
              onClick={() => setSelectedPhotoIndex(index)}
              className="photo-fade-in break-inside-avoid mb-4 sm:mb-6 group relative rounded-2xl overflow-hidden bg-[#ede8e1] dark:bg-[#221c19] shadow-[0_2px_12px_-2px_rgba(44,36,32,0.06)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_28px_-6px_rgba(44,36,32,0.14)] dark:hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7)] transition-all duration-300 cursor-pointer"
            >
              {/* Progressive Fast Loading Image */}
              <ProgressiveImage photo={photo} priority={index < 4} />

              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Format badge if original is HEIC (top left) */}
              {photo.original_url?.toLowerCase().includes('.heic') && (
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] tracking-widest font-mono font-medium bg-black/40 backdrop-blur-md text-white/90 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                  HEIC
                </span>
              )}

              {/* Small Download Button (bottom left) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(photo)
                }}
                disabled={downloadingId === photo.id}
                aria-label={photo.original_url?.toLowerCase().includes('.heic') ? 'Download HEIC photo' : 'Download photo'}
                title={photo.original_url?.toLowerCase().includes('.heic') ? 'Download original HEIC' : 'Download photo'}
                className="absolute bottom-3 left-3 p-2 rounded-full bg-white/90 dark:bg-[#181412]/90 backdrop-blur-md text-[#2c2420] dark:text-[#ede7e1] shadow-md hover:bg-white dark:hover:bg-[#241f1c] hover:scale-110 active:scale-95 transition-all duration-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 disabled:opacity-75 cursor-pointer z-10"
              >
                {downloadingId === photo.id ? (
                  // Loading spinner
                  <svg
                    className="animate-spin w-4 h-4 text-[#c17f52] dark:text-[#d48b5e]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  // Minimal download tray & arrow icon
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
              </button>

              {/* Like Button & Counter (bottom right) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleLike(photo.id)
                }}
                aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                title={isLiked ? 'Unlike' : 'Like'}
                className={`absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md shadow-md transition-all duration-200 select-none cursor-pointer z-10 ${
                  isLiked
                    ? 'bg-white/95 dark:bg-[#181412]/95 text-[#c17f52] dark:text-[#d48b5e] ring-1 ring-[#c17f52]/40 shadow-[0_2px_12px_rgba(193,127,82,0.25)]'
                    : 'bg-black/35 sm:bg-black/30 dark:bg-black/50 hover:bg-white/95 dark:hover:bg-[#181412]/95 text-white/95 hover:text-[#2c2420] dark:hover:text-[#ede7e1]'
                } ${
                  animatingId === photo.id
                    ? 'scale-110'
                    : 'hover:scale-105 active:scale-90'
                }`}
              >
                <HeartIcon
                  filled={isLiked}
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    animatingId === photo.id ? 'scale-125' : ''
                  } ${isLiked ? 'text-[#c17f52] dark:text-[#d48b5e]' : ''}`}
                />
                <span className="text-xs font-mono font-medium leading-none tracking-tight">
                  {likeCount}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Enlarged Pop-up Window Modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedPhotoIndex(null)}
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return
            const diff = touchStartX - e.changedTouches[0].clientX
            if (diff > 50) handleNextPhoto()
            else if (diff < -50) handlePrevPhoto()
            setTouchStartX(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 dark:bg-black/92 backdrop-blur-xl animate-in fade-in duration-200 select-none"
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-8 sm:right-8 flex items-center justify-between z-60 pointer-events-none">
            {/* Counter */}
            <span className="px-3 py-1 rounded-full bg-white/10 dark:bg-black/40 text-white/80 backdrop-blur-md text-xs font-mono tracking-widest pointer-events-auto">
              {selectedPhotoIndex! + 1} / {photos.length}
            </span>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              aria-label="Close enlarged view"
              className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/40 dark:hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer pointer-events-auto shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Previous Arrow Button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePrevPhoto()
              }}
              aria-label="Previous photo"
              title="Previous (Left arrow)"
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/40 dark:hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer z-60 shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 sm:w-6 sm:h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Next Arrow Button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleNextPhoto()
              }}
              aria-label="Next photo"
              title="Next (Right arrow)"
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-white/10 hover:bg-white/25 dark:bg-black/40 dark:hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer z-60 shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 sm:w-6 sm:h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Central Enlarged Image Wrapper */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center justify-center max-w-full max-h-full"
          >
            {/* The Enlarged Image */}
            <div className="relative max-h-[78vh] sm:max-h-[82vh] max-w-[94vw] sm:max-w-[85vw] flex items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={selectedPhoto.id}
                src={selectedPhoto.url}
                alt=""
                className="max-h-[78vh] sm:max-h-[82vh] w-auto max-w-full object-contain block transition-transform duration-300"
              />
            </div>

            {/* Bottom Floating Action Bar inside Modal */}
            <div className="mt-4 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 dark:bg-black/70 border border-white/15 backdrop-blur-xl shadow-xl">
              {/* Like Button */}
              {(() => {
                const isLiked = likedSet.has(selectedPhoto.id)
                const count = counts[selectedPhoto.id] ?? selectedPhoto.likes_count ?? 0
                return (
                  <button
                    type="button"
                    onClick={() => handleToggleLike(selectedPhoto.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-white/20 text-[#c17f52] dark:text-[#d48b5e]'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <HeartIcon
                      filled={isLiked}
                      className={`w-4 h-4 transition-transform ${
                        animatingId === selectedPhoto.id ? 'scale-125' : ''
                      }`}
                    />
                    <span>{count}</span>
                  </button>
                )
              })()}

              <div className="w-px h-4 bg-white/20" />

              {/* Download Button */}
              <button
                type="button"
                onClick={() => handleDownload(selectedPhoto)}
                disabled={downloadingId === selectedPhoto.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/85 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadingId === selectedPhoto.id ? (
                  <svg
                    className="animate-spin w-4 h-4 text-[#c17f52] dark:text-[#d48b5e]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                <span>
                  {selectedPhoto.original_url?.toLowerCase().includes('.heic')
                    ? 'Download HEIC'
                    : 'Download'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

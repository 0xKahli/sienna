'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Photo } from '@/lib/types'

interface GalleryProps {
  photos: Photo[]
}

export default function Gallery({ photos }: GalleryProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (url: string, id: string) => {
    try {
      setDownloadingId(id)
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `sienna-${id.slice(0, 8)}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    } finally {
      setTimeout(() => setDownloadingId(null), 500)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Pinterest-style Masonry Columns */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 sm:gap-6 [column-fill:_balance]">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="photo-fade-in break-inside-avoid mb-4 sm:mb-6 group relative rounded-2xl overflow-hidden bg-[#ede8e1] dark:bg-[#221c19] shadow-[0_2px_12px_-2px_rgba(44,36,32,0.06)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_28px_-6px_rgba(44,36,32,0.14)] dark:hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7)] transition-all duration-300"
          >
            {/* Image */}
            <div className="relative w-full overflow-hidden">
              <Image
                src={photo.url}
                alt=""
                width={800}
                height={1200}
                unoptimized
                priority={index < 4}
                loading={index < 4 ? 'eager' : 'lazy'}
                style={{ width: '100%', height: 'auto' }}
                className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </div>

            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Small Download Button */}
            <button
              onClick={() => handleDownload(photo.url, photo.id)}
              disabled={downloadingId === photo.id}
              aria-label="Download photo"
              title="Download photo"
              className="absolute bottom-3 right-3 p-2.5 rounded-full bg-white/90 dark:bg-[#181412]/90 backdrop-blur-md text-[#2c2420] dark:text-[#ede7e1] shadow-md hover:bg-white dark:hover:bg-[#241f1c] hover:scale-110 active:scale-95 transition-all duration-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 disabled:opacity-75"
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
          </div>
        ))}
      </div>
    </div>
  )
}

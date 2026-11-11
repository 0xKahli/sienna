'use client'

import Image from 'next/image'
import { Photo } from '@/lib/types'

interface GalleryProps {
  photos: Photo[]
}

export default function Gallery({ photos }: GalleryProps) {
  return (
    <div className="flex flex-col items-center gap-12 sm:gap-16 px-4 sm:px-6 pb-24">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="photo-fade-in w-full max-w-3xl lg:max-w-4xl"
        >
          <div className="relative w-full overflow-hidden">
            <Image
              src={photo.url}
              alt=""
              width={1920}
              height={1080}
              unoptimized
              priority={index < 2}
              loading={index < 2 ? 'eager' : 'lazy'}
              style={{ width: '100%', height: 'auto' }}
              className="photo-fade-in block"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

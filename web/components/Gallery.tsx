'use client'

import Image from 'next/image'
import { Photo } from '@/lib/types'

interface GalleryProps {
  photos: Photo[]
}

// Editorial magazine rhythm — varying widths, alignments, and organic negative space
const EDITORIAL_VARIANTS = [
  // 0: Centered Grand Hero (expansive)
  {
    wrapper: 'w-full max-w-4xl self-center my-6 sm:my-10 md:my-16',
  },
  // 1: Left-aligned medium (generous space on right)
  {
    wrapper: 'w-full max-w-xl self-start md:ml-6 lg:ml-16 my-6 sm:my-10 md:my-14',
  },
  // 2: Right-aligned intimate shot
  {
    wrapper: 'w-full max-w-lg self-end md:mr-8 lg:mr-20 my-6 sm:my-10 md:my-16',
  },
  // 3: Off-center right (broad piece shifted right)
  {
    wrapper: 'w-full max-w-3xl self-center md:translate-x-8 lg:translate-x-16 my-6 sm:my-12 md:my-20',
  },
  // 4: Deep left compact detail shot
  {
    wrapper: 'w-full max-w-md self-start md:ml-12 lg:ml-28 my-6 sm:my-8 md:my-12',
  },
  // 5: Centered quiet pause
  {
    wrapper: 'w-full max-w-2xl self-center my-6 sm:my-10 md:my-16',
  },
  // 6: Off-center left (dramatic shift to left)
  {
    wrapper: 'w-full max-w-3xl self-center md:-translate-x-8 lg:-translate-x-14 my-6 sm:my-12 md:my-20',
  },
  // 7: Right medium float
  {
    wrapper: 'w-full max-w-xl self-end md:mr-4 lg:mr-12 my-6 sm:my-10 md:my-14',
  },
]

export default function Gallery({ photos }: GalleryProps) {
  return (
    <div className="max-w-7xl mx-auto flex flex-col w-full px-4 sm:px-8 md:px-12 lg:px-16 pb-32">
      {photos.map((photo, index) => {
        const variant = EDITORIAL_VARIANTS[index % EDITORIAL_VARIANTS.length]

        return (
          <div
            key={photo.id}
            className={`photo-fade-in transition-transform duration-700 ease-out ${variant.wrapper}`}
          >
            <div className="relative w-full overflow-hidden shadow-[0_2px_20px_-4px_rgba(44,36,32,0.06)] dark:shadow-[0_4px_30px_-6px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_-6px_rgba(44,36,32,0.12)] dark:hover:shadow-[0_8px_35px_-4px_rgba(0,0,0,0.7)] transition-shadow duration-500">
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
        )
      })}
    </div>
  )
}

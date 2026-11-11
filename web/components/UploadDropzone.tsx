'use client'

import { useDropzone } from 'react-dropzone'

interface UploadDropzoneProps {
  onDrop: (files: File[]) => void
}

export default function UploadDropzone({ onDrop }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    multiple: true,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg px-8 py-14 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-[#c17f52] bg-[#c17f5210] dark:bg-[#c17f52]/20'
          : 'border-[#c8b89a] hover:border-[#8b7355] dark:border-[#3d332d] dark:hover:border-[#a89482]'
      }`}
    >
      <input {...getInputProps()} />
      {/* Upload icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto mb-4 text-[#c8b89a] dark:text-[#5c4d44]"
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>

      {isDragActive ? (
        <p className="text-sm text-[#8b7355] dark:text-[#d48b5e] tracking-widest">drop here</p>
      ) : (
        <div>
          <p className="text-sm text-[#8b7355] dark:text-[#a89482] tracking-widest">
            drag &amp; drop images
          </p>
          <p className="text-xs text-[#c8b89a] dark:text-[#6a5b51] mt-2 tracking-widest">
            or click to select · jpg, png, heic &amp; more
          </p>
        </div>
      )}
    </div>
  )
}

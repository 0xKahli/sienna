'use client'

import { useState, useEffect } from 'react'

export default function AboutModal() {
  const [isOpen, setIsOpen] = useState(false)

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Top-left Info Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="About Sienna"
        title="About"
        className="w-8 h-8 flex items-center justify-center rounded-full text-[#8b7355] dark:text-[#a89482] hover:text-[#2c2420] dark:hover:text-[#ede7e1] hover:bg-[#2c2420]/5 dark:hover:bg-[#ede7e1]/5 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#faf7f4] dark:bg-[#1f1a17] text-[#2c2420] dark:text-[#ede7e1] border border-[#c8b89a]/30 dark:border-[#3d332d] shadow-2xl transition-all"
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="absolute top-5 right-5 p-1 rounded-full text-[#8b7355] dark:text-[#a89482] hover:text-[#2c2420] dark:hover:text-[#ede7e1] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Title */}
            <h2
              className="text-2xl italic tracking-widest text-[#8b7355] dark:text-[#a89482] mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              sienna
            </h2>

            {/* Editable Content (User can customize anytime) */}
            <div className="space-y-3 text-sm leading-relaxed text-[#2c2420]/80 dark:text-[#ede7e1]/80">
              <p>
                A personal archive of captured moments, quiet spaces, and visual notes.
              </p>
              <p className="text-xs text-[#8b7355] dark:text-[#a89482] pt-2">
                Curated by 0xKahli.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

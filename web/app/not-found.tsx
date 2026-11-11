import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <span
          className="text-8xl sm:text-9xl font-light tracking-tighter text-[#c8b89a]/50 dark:text-[#423730] select-none block"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          404
        </span>

        <div className="space-y-2">
          <h1
            className="text-xl sm:text-2xl tracking-wide text-[#8b7355] dark:text-[#a89482] font-normal"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            page not found
          </h1>
          <p className="text-sm text-[#8b7355]/70 dark:text-[#a89482]/70 font-light max-w-xs mx-auto">
            the page you are looking for doesn’t exist or has moved.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8b7355] dark:bg-[#a89482] text-[#faf7f4] dark:text-[#181412] text-xs uppercase tracking-widest hover:bg-[#c17f52] dark:hover:bg-[#d48b5e] transition-all shadow-sm hover:shadow active:scale-95"
          >
            <span>←</span>
            <span>return home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

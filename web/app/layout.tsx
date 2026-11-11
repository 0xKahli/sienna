import type { Metadata } from 'next'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import './globals.css'

export const metadata: Metadata = {
  title: 'sienna',
  description: 'a personal image archive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('sienna_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#faf7f4] text-[#2c2420] dark:bg-[#181412] dark:text-[#ede7e1] transition-colors duration-300 antialiased">
        <header className="relative max-w-7xl mx-auto px-4 sm:px-8 py-8 flex items-center justify-between">
          <div className="w-8" />
          <Link
            href="/"
            className="text-2xl italic tracking-widest text-[#8b7355] dark:text-[#a89482] hover:opacity-80 transition-opacity"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            sienna
          </Link>
          <ThemeToggle />
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}

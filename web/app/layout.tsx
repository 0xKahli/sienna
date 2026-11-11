import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'sienna',
  description: 'a personal image archive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#faf7f4', color: '#2c2420' }}>
        <header className="py-8 text-center">
          <h1
            className="text-2xl italic tracking-widest text-[#8b7355]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            sienna
          </h1>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}

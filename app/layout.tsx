import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'CROWN OR GRAVE — Five enter. One remains.',
  description: 'Awaken your power in Crown or Grave, a five-player browser survival arena. Fifteen unique abilities. One mysterious egg. One last survivor. Created by Sajib Ayan.',
  keywords: ['crown or grave', 'browser game', 'multiplayer survival', 'arena game', 'sajib ayan', '5 player game', 'survival game'],
  authors: [{ name: 'Sajib Ayan' }],
  creator: 'Sajib Ayan',
  generator: 'Next.js',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Crown or Grave — Five enter. One remains.',
    description: 'A five-player browser survival arena with 15 unique abilities. Created by Sajib Ayan.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#101211',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${display.variable} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

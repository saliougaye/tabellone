import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import { QueryProvider } from '@/lib/query-provider'
import { strings } from '@/strings'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const description = 'Arrivi e partenze in tempo reale per le stazioni italiane'

export const metadata: Metadata = {
  title: strings.appName,
  description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/apple-touch-icon.png',
    other: [{ rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#007578' }],
  },
  openGraph: {
    type: 'website',
    title: strings.appName,
    description,
    images: [{ url: '/icons/og-image.png', width: 1200, height: 630, alt: strings.appName }],
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0f12' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={plexSans.variable}>
      <body>
        {/* data-vaul-drawer-wrapper: what the bottom sheet scales down behind itself
            (`shouldScaleBackground`), the way a phone sheet pushes the screen back. */}
        <div data-vaul-drawer-wrapper className="bg-surface">
          <SerwistProvider swUrl="/serwist/sw.js">
            <QueryProvider>{children}</QueryProvider>
          </SerwistProvider>
        </div>
        <Analytics />
      </body>
    </html>
  )
}

import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { IconProvider } from '@/components/ui/icon'
import { QueryProvider } from '@/lib/query-provider'
import { siteUrl } from '@/lib/site'
import { strings } from '@/strings'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

/**
 * Two families, two jobs (theme.css §1).
 *
 * Archivo is the signage face: a grotesk drawn for high-contrast, high-legibility
 * environments, and — the reason it is here rather than any other grotesk — it carries a
 * real width axis, so a station name can be set genuinely expanded instead of being faked
 * with letter-spacing on a normal-width font. That is what makes a plate read as signage.
 *
 * IBM Plex Mono carries every number on the board: times, delays, platforms, train numbers,
 * counts. A departure board is a table of figures that change while you read them, and a
 * proportional face makes a digit move its neighbours when it changes. Mono plus the
 * tabular-figure declarations in §3 means a column of times is a column, not an argument.
 */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
})

const description = 'Arrivi e partenze in tempo reale per le stazioni italiane'

export const metadata: Metadata = {
  // Every absolute URL Next builds for us (canonical links, OG images) resolves against
  // this. Without it the OG image of a shared board is a relative path, which no crawler
  // can fetch.
  metadataBase: new URL(siteUrl),
  title: strings.appName,
  description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/apple-touch-icon.png',
    // The mark's teal, as --brand-mark resolves in the light theme. Safari wants a plain
    // hex here (a var cannot reach a manifest field), so the value is written out with the
    // token it mirrors named beside it.
    other: [{ rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#009e9a' }],
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
  // --surface in each theme, resolved to hex: the browser chrome has to match the page it
  // sits above, and these two values are the only place in the app where a token is
  // duplicated as a literal. Change one, change the other.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0f12' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        {/* data-vaul-drawer-wrapper: what the bottom sheet scales down behind itself
            (`shouldScaleBackground`), the way a phone sheet pushes the screen back. */}
        <div data-vaul-drawer-wrapper className="bg-surface">
          <SerwistProvider swUrl="/serwist/sw.js">
            <QueryProvider>
              <IconProvider>{children}</IconProvider>
            </QueryProvider>
          </SerwistProvider>
        </div>
        <Analytics />
      </body>
    </html>
  )
}

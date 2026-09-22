import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import type { ReactNode } from 'react'
import { IconProvider } from '@/components/ui/icon'
import { QueryProvider } from '@/lib/query-provider'
import { siteUrl } from '@/lib/site'
import { strings } from '@/strings'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

/**
 * One family: Figtree, a friendly geometric sans with tabular figures (the fifth pass's
 * choice over the system face — a consumer app, not a settings screen). Variable weight,
 * so heavy display and regular body come from one file. Figures are tabular through
 * font-variant-numeric; theme.css reads it as --font-figtree.
 */
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

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
    // The mark's sodium amber, sitting between the two halves of --brand-mark: Safari wants
    // a plain hex here (a var cannot reach a manifest field, and a pinned tab has no theme),
    // so it takes the one fixed value the committed icon assets are drawn in.
    other: [{ rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#df870a' }],
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
  // sits above. These two and manifest.ts's pair are the only places in the app where a
  // token is duplicated as a literal. Change one, change all three.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131c18' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={figtree.variable}>
      <body>
        <SerwistProvider swUrl="/serwist/sw.js">
          <QueryProvider>
            <IconProvider>{children}</IconProvider>
          </QueryProvider>
        </SerwistProvider>
        <Analytics />
      </body>
    </html>
  )
}

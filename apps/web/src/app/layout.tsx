import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Saira } from 'next/font/google'
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
 * Saira is the signage face: a neo-grotesque with squared-off terminals and a real width
 * axis (wdth 50–125), which is the reason it is here rather than any other grotesk — a
 * station name can be set genuinely expanded instead of being faked with letter-spacing on
 * a normal-width font. That is what makes a plate read as signage. Its narrow apertures and
 * flat joins are the drawing an enamel platform sign has, where Archivo's rounder,
 * bookish grotesque was closer to a UI face.
 *
 * JetBrains Mono carries every number on the board: times, delays, platforms, train
 * numbers, counts. A departure board is a table of figures that change while you read them,
 * and a proportional face makes a digit move its neighbours when it changes. Mono plus the
 * tabular-figure declarations in §3 means a column of times is a column, not an argument.
 * Its dotted zero is the second reason: on a board, 0 and O sit in the same string
 * (platform 0, train CB710) and must never be the same shape.
 */
const saira = Saira({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-saira',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
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
    { media: '(prefers-color-scheme: light)', color: '#f2f4f6' },
    { media: '(prefers-color-scheme: dark)', color: '#080a0d' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${saira.variable} ${jetbrainsMono.variable}`}>
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

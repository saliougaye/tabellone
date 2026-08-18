import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import { strings } from '@/strings'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: strings.appName,
  description: 'Arrivi e partenze in tempo reale per le stazioni italiane',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={plexSans.variable}>
      <body>{children}</body>
    </html>
  )
}

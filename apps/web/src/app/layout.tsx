import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { strings } from '@/strings'

export const metadata: Metadata = {
  title: strings.appName,
  description: 'Arrivi e partenze in tempo reale per le stazioni italiane',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}

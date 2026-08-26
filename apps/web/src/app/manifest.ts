import type { MetadataRoute } from 'next'
import { strings } from '@/strings'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: strings.appName,
    short_name: strings.appName,
    description: 'Arrivi e partenze in tempo reale per le stazioni italiane',
    start_url: '/',
    display: 'standalone',
    // --surface in the light theme, resolved to hex. A manifest cannot read a var, so this
    // is the third and last place the token is written out as a literal, beside the two in
    // layout.tsx's viewport.themeColor. Change one, change all three.
    background_color: '#f2f4f6',
    theme_color: '#f2f4f6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icons/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    ],
  }
}

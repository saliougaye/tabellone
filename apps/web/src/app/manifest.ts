import type { MetadataRoute } from 'next'
import { strings } from '@/strings'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: strings.appName,
    short_name: strings.appName,
    description: 'Arrivi e partenze in tempo reale per le stazioni italiane',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#f9fafb',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

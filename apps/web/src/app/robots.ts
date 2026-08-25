/**
 * Everything is crawlable except the API and the service-worker route: they answer JSON and
 * JavaScript, and a crawler that indexes `/api/board/roma-termini` has indexed a snapshot of
 * a board that was true for twenty seconds.
 */
import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/serwist/'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

/**
 * The sitemap: the picker plus both board routes for every station in the catalogue
 * (ADR-011 — the two path routes are the canonical, indexable ones, so those are what is
 * listed; the bare `/stazioni/:slug` route canonicals onto them and is deliberately absent
 * here). At ~2400 stations that is ~4900 URLs, comfortably inside the 50 000-entry limit,
 * so it stays a single file.
 *
 * Nothing crawls to these pages otherwise: the picker's list is client-side and bounded,
 * and there is no other internal link into a station. Without this file the whole
 * indexable surface of the site is one page.
 *
 * `changeFrequency` says `hourly` rather than `always`: the board's *data* changes every
 * few seconds, but the document a crawler sees is the shell, and telling Google to come
 * back constantly for a page whose HTML rarely changes is asking to be ignored.
 */
import { listStations } from '@tabellone/core'
import type { MetadataRoute } from 'next'
import { canonicalBoardPath } from '@/lib/board-routes'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const stations = listStations()
  const boards = stations.flatMap((station) =>
    (['departures', 'arrivals'] as const).map((mode) => ({
      url: `${siteUrl}${canonicalBoardPath(station.slug, mode)}`,
      changeFrequency: 'hourly' as const,
      // A major station is a page worth crawling before a request stop with four trains a
      // day. Relative only: priority orders our own URLs against each other, nothing else.
      priority: station.isMajor ? 0.8 : 0.5,
    })),
  )
  return [{ url: siteUrl, changeFrequency: 'weekly', priority: 1 }, ...boards]
}

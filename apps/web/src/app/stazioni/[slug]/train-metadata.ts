/**
 * `generateMetadata` for the two train detail routes (ADR-012).
 *
 * `noindex, follow`: a board URL is permanent — Roma Termini's departures exist forever —
 * but a train URL is true for an hour. Indexing them would trade a few thousand durable,
 * rankable station pages for hundreds of thousands that are stale within the day, and a
 * search result promising a train that has already left is worse than no result. `follow`,
 * because the links *out* of the page (back to the board) are exactly the pages that should
 * rank.
 */
import type { BoardMode } from '@tabellone/core'
import { findStationBySlug } from '@tabellone/core'
import type { Metadata } from 'next'
import { trainDetailPath } from '@/lib/train-routes'
import { strings } from '@/strings'

export function trainMetadata(slug: string, mode: BoardMode, trainNumber: string): Metadata {
  const station = findStationBySlug(slug)
  const stationName = station?.name ?? slug
  return {
    title: `Treno ${trainNumber} · ${stationName} | ${strings.appName}`,
    description:
      mode === 'arrivals'
        ? `Orario, binario, ritardo e fermate del treno ${trainNumber} in arrivo a ${stationName}.`
        : `Orario, binario, ritardo e fermate del treno ${trainNumber} in partenza da ${stationName}.`,
    robots: { index: false, follow: true },
    alternates: { canonical: trainDetailPath(slug, mode, trainNumber) },
  }
}

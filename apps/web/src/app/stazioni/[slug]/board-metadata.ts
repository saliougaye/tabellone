/**
 * Shared `generateMetadata` builder for the three board entry points (bare
 * `/stazioni/[slug]`, `/stazioni/[slug]/partenze`, `/stazioni/[slug]/arrivi` — see
 * ADR-011). Title and description are mode-specific for the two path routes; the bare
 * route's own metadata just points its canonical link at whichever path route matches its
 * resolved mode, so search engines consolidate on the path URL without the old
 * query-param link breaking (ADR-010).
 */
import type { BoardMode } from '@tabellone/core'
import { findStationBySlug } from '@tabellone/core'
import type { Metadata } from 'next'
import { canonicalBoardPath } from '@/lib/board-routes'
import { strings } from '@/strings'

export function boardMetadata(slug: string, mode: BoardMode): Metadata {
  const station = findStationBySlug(slug)
  const stationName = station?.name ?? slug
  const modeLabel = mode === 'arrivals' ? strings.arrivals : strings.departures
  return {
    // Station first: it is what the reader searched for, and it is what survives the
    // truncation of a result row. One separator of each kind, no trailing space — the
    // previous form shipped both a `·` and a `|` around the app name and a stray space
    // before the closing backtick, in every title tag on the site.
    title: `${stationName} · ${modeLabel} | ${strings.appName}`,
    description:
      mode === 'arrivals'
        ? `Arrivi in tempo reale a ${stationName}: orari, binari e ritardi.`
        : `Partenze in tempo reale da ${stationName}: orari, binari e ritardi.`,
    alternates: {
      canonical: canonicalBoardPath(slug, mode),
    },
  }
}

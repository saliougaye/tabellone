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
    title: `${strings.appName} · ${stationName} | ${modeLabel} `,
    description:
      mode === 'arrivals'
        ? `Arrivi in tempo reale a ${stationName}: orari, binari e ritardi.`
        : `Partenze in tempo reale da ${stationName}: orari, binari e ritardi.`,
    alternates: {
      canonical: canonicalBoardPath(slug, mode),
    },
  }
}

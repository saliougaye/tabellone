/**
 * The canonical, indexable board URL for a mode (ADR-011): `/stazioni/:slug/partenze` or
 * `/stazioni/:slug/arrivi`. Shared by the board pages' `generateMetadata` and by
 * `BoardScreen`'s mode-switch navigation, so the two stay in lockstep by construction.
 */
import type { BoardMode } from '@tabellone/core'

const pathSegment: Record<BoardMode, string> = {
  departures: 'partenze',
  arrivals: 'arrivi',
}

export function canonicalBoardPath(slug: string, mode: BoardMode): string {
  return `/stazioni/${slug}/${pathSegment[mode]}`
}

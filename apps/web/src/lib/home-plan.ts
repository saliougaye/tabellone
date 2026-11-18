/**
 * Which boards the home reads, and in which order they win the budget. Pure: no fetch — the
 * home turns the plan into reads, and each read lands on the same cached entry, lock and
 * ceiling as a board page (ARCHITECTURE 7.2).
 *
 * The budget is **three boards per home open, once, no polling**. The stations of the trains
 * the reader follows come first (the soonest train first), one read per (station, mode) however
 * many followed trains it holds; the station cards — nearest, favourites, recents, majors —
 * fill what is left, always as `departures`. A card for a station a followed train already
 * reads shares that read rather than spending another.
 */
import type { BoardMode } from '@tabellone/core'
import type { FollowedTrain } from './followed-trains'

/** Each board read is one request towards our cache, and perhaps one towards RFI. */
export const HOME_READ_BUDGET = 3

export type HomeRead = { slug: string; mode: BoardMode }

export const readKey = (read: HomeRead) => `${read.slug}:${read.mode}`

export function planHomeReads(
  followed: Pick<FollowedTrain, 'slug' | 'mode' | 'scheduledAt'>[],
  cardSlugs: string[],
  budget: number = HOME_READ_BUDGET,
): HomeRead[] {
  const reads: HomeRead[] = []
  const seen = new Set<string>()
  const add = (read: HomeRead) => {
    if (reads.length >= budget || seen.has(readKey(read))) return
    seen.add(readKey(read))
    reads.push(read)
  }
  const soonestFirst = [...followed].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  )
  for (const train of soonestFirst) add({ slug: train.slug, mode: train.mode })
  for (const slug of cardSlugs) add({ slug, mode: 'departures' })
  return reads
}

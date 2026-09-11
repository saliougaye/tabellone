/**
 * The train detail URL, and the one rule for resolving it back to a row (ADR-012).
 *
 * Nested under the canonical board route: `/stazioni/:slug/partenze/:trainNumber`. The train
 * number is the public identifier here for the same reason the slug is for a station
 * (ADR-007) — it is what is printed on the row, the ticket and the platform sign.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'
import { canonicalBoardPath } from './board-routes'

export function trainDetailPath(slug: string, mode: BoardMode, trainNumber: string): string {
  return `${canonicalBoardPath(slug, mode)}/${encodeURIComponent(trainNumber)}`
}

/**
 * The row a train URL points at: the **first** row with that number, which on a
 * time-ordered board is the soonest one.
 *
 * A train number names a service, not a stop, so it is not unique — a board spanning
 * midnight carries the same number twice, on two service dates. ADR-012 takes that
 * ambiguity deliberately rather than lengthening the URL with a time the reader cannot
 * verify and that a reschedule invalidates.
 *
 * Case-insensitive: `cb710` has to find `CB710`, because a hand-typed URL is a URL.
 */
export function findRowByTrainNumber(rows: BoardRow[], trainNumber: string): BoardRow | null {
  const wanted = trainNumber.trim().toUpperCase()
  return rows.find((row) => row.trainNumber.toUpperCase() === wanted) ?? null
}

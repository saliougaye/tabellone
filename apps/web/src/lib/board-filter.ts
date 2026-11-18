/**
 * Narrowing a board that is already in hand. Pure functions over `BoardRow[]`: no fetch, no
 * Redis, no extra request towards RFI — the rows being filtered are the ones the poll just
 * delivered, so a filter costs nothing at the source (ARCHITECTURE 7: nothing here may raise
 * outbound traffic).
 *
 * One dimension, deliberately: free text. (The operator chips are the header's own control and
 * narrow the list separately; a category filter was dropped with the filters sheet.)
 *
 * What the text matches, and why each part is in:
 * - `headsign` — "destinazione" on a departures board, origin on an arrivals one.
 * - `trainNumber` — alphanumeric, so matched as text like everything else (`CB710`).
 * - `brand` — what the traveller recognises ("Frecciarossa"), and it is already our own enum.
 * - `viaStops` — the row prints those stops in its ladder. A search for «Bologna» that skipped
 *   a train whose ladder says Bologna would read as broken, not as precise.
 *
 * Accents are folded on both sides: a station board is read by someone typing fast on a phone,
 * and «forli» has to find «Forlì».
 */
import type { BoardRow, ViaStop } from '@tabellone/core'

/** Lowercased and stripped of diacritics, so both sides of a comparison are comparable. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function haystack(row: BoardRow): string {
  return fold(
    [row.headsign, row.trainNumber, row.brand ?? '', ...row.viaStops.map((stop) => stop.name)].join(
      ' ',
    ),
  )
}

/**
 * Every term has to match, in any field: «fr 96» finds Frecciarossa 9612, and the order the
 * reader typed the two words in is not a statement about the data.
 */
export function filterRows(rows: BoardRow[], query: string): BoardRow[] {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return rows
  return rows.filter((row) => {
    const text = haystack(row)
    return terms.every((term) => text.includes(term))
  })
}

/**
 * The intermediate stop a row matched through, when that stop is the *only* reason it matched:
 * a search for «Bologna» finds a train going to Milano, and the ticket says "Ferma a Bologna"
 * so the reader sees why it is there. `null` when the headsign, number or brand already
 * explain the match, or when no query is typed.
 */
export function matchedViaStop(row: BoardRow, query: string): ViaStop | null {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return null
  const direct = fold([row.headsign, row.trainNumber, row.brand ?? ''].join(' '))
  if (terms.every((term) => direct.includes(term))) return null
  return row.viaStops.find((stop) => terms.some((term) => fold(stop.name).includes(term))) ?? null
}

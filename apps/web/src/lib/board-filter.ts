/**
 * Narrowing a board that is already in hand. Pure functions over `BoardRow[]`: no fetch, no
 * Redis, no extra request towards RFI — the rows being filtered are the ones the poll just
 * delivered, so a filter costs nothing at the source (ARCHITECTURE 7: nothing here may raise
 * outbound traffic).
 *
 * Two dimensions, deliberately: free text, and category. Operator is not a third one — the
 * tile already says who runs the train, and a traveller looking for a specific train looks
 * for its number or for where it goes, not for its railway undertaking.
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
import type { BoardRow, TrainCategory } from '@tabellone/core'

export type BoardFilter = {
  query: string
  /** Empty means "every category", never "none" — an empty chip row is not a filter. */
  categories: TrainCategory[]
}

export const emptyFilter: BoardFilter = { query: '', categories: [] }

export function isFilterActive(filter: BoardFilter): boolean {
  return filter.query.trim() !== '' || filter.categories.length > 0
}

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
export function filterRows(rows: BoardRow[], filter: BoardFilter): BoardRow[] {
  const terms = fold(filter.query).split(/\s+/).filter(Boolean)
  const categories = new Set(filter.categories)
  if (terms.length === 0 && categories.size === 0) return rows
  return rows.filter((row) => {
    if (categories.size > 0 && !categories.has(row.category)) return false
    if (terms.length === 0) return true
    const text = haystack(row)
    return terms.every((term) => text.includes(term))
  })
}

/** Display order of the category chips: fastest service first, the one that is not a train last. */
const CATEGORY_ORDER: readonly TrainCategory[] = [
  'HIGH_SPEED',
  'INTERCITY',
  'REGIONAL_FAST',
  'REGIONAL',
  'SUBURBAN',
  'BUS',
  'OTHER',
]

/**
 * The categories the chip row offers: the ones on this board, plus any the reader has
 * selected that are not. Chips are built from the rows rather than from the enum — a chip for
 * a category no train on screen belongs to is a control whose only outcome is an empty list —
 * but a *selected* one has to stay drawn even when the board no longer has it (the mode was
 * switched), or the reader is left with an empty board and no visible cause.
 */
export function chipCategories(rows: BoardRow[], selected: TrainCategory[]): TrainCategory[] {
  const present = new Set([...rows.map((row) => row.category), ...selected])
  return CATEGORY_ORDER.filter((category) => present.has(category))
}

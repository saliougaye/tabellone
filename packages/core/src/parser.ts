/**
 * HTML → domain. **Pure functions, zero I/O** (ADR-003): no fetching, no cache, no clock read
 * that is not passed in. This is the module RFI will break, and the only one that must be
 * verifiable in milliseconds against committed fixtures.
 *
 * Binding rules, all of them load-bearing (ARCHITECTURE 2.2):
 *  - cells are found by `id`/`headers` (`RVettore`, `RCategoria`, `RTreno`, `RStazione`,
 *    `ROrario`, `RRitardo`, `RBinario`, `RExLampeggio`, `RDettagli`), never by column position
 *  - operator and category are **images**: the only handle is `alt`, read through explicit
 *    lookup tables, never text heuristics (ADR-008)
 *  - the service date comes from the details button id (`btn_20260816CB710`), and is what turns
 *    `HH:MM` into an instant in `Europe/Rome` — with Luxon, never `Date` (ARCHITECTURE 5.1)
 */
import { NotImplementedError } from './errors'
import type { BoardMode, BoardRow, RawHtml } from './types'

/** One row per train in the window, in the order RFI printed them. Empty list is a valid result. */
export function parseBoard(_html: RawHtml, _mode: BoardMode): BoardRow[] {
  throw new NotImplementedError('parseBoard')
}

/** Board-level announcements, in Italian, shown as-is (ADR-009). */
export function parseNotices(_html: RawHtml): string[] {
  throw new NotImplementedError('parseNotices')
}

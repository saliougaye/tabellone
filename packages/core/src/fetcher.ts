/**
 * The only module in the project allowed to speak HTTP to RFI (ADR-005).
 *
 * Two distinct endpoints, one per mode — arrivals and departures are separate requests, so
 * only the mode actually being displayed is ever fetched (ARCHITECTURE 2.2):
 *
 *   departures  /ArrivalsDepartures/Monitor?placeId={id}&arrivals=False
 *   arrivals    /ArrivalsDepartures/Monitor?placeId={id}&arrivals=True
 *
 * Returns the response body untouched. It is never cached and never stored: the page carries
 * inline base64 logos on every row, and those must not reach our payload.
 */
import { NotImplementedError } from './errors'
import type { BoardMode, RawHtml } from './types'

export type FetchBoardResult = {
  html: RawHtml
  status: number
  /** Round-trip in milliseconds. Logged to `health:rfi` so "RFI is slow" stays distinguishable
   * from "we have been blocked" (ARCHITECTURE 8). */
  latencyMs: number
}

export function fetchBoard(_placeId: string, _mode: BoardMode): Promise<FetchBoardResult> {
  throw new NotImplementedError('fetchBoard')
}

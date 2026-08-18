/**
 * The only module in the project allowed to speak HTTP to RFI (ADR-005).
 *
 * Two distinct endpoints, one per mode — arrivals and departures are separate requests, so
 * only the mode actually being displayed is ever fetched (ARCHITECTURE 2.2). The path carries
 * an `/ArriviPartenze` prefix not spelled out in ARCHITECTURE.md's shorthand — verified by
 * fetching the site directly, since the endpoint without it 404s:
 *
 *   departures  https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?PlaceId={id}&Arrivals=False
 *   arrivals    https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?PlaceId={id}&Arrivals=True
 *
 * The query keys are `PlaceId`/`Arrivals`, capitalised — that's the literal `name` attribute
 * RFI's own station-picker form uses, confirmed the same way.
 *
 * Returns the response body untouched. It is never cached and never stored: the page carries
 * inline base64 logos on every row, and those must not reach our payload. Rate limiting and
 * backoff are policy decisions that live in `store.ts` (ARCHITECTURE 7.2) — this module only
 * makes the call and reports what happened, honestly, including non-2xx statuses, so the
 * caller can act on them instead of having a thrown error hide the status code.
 */
import type { BoardMode, RawHtml } from './types'

const BASE_URL = 'https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor'

/** Generous but bounded: a hung RFI request must not hold the single-flight lock open past its
 * own 15s TTL (ARCHITECTURE 7.2) indefinitely. */
const TIMEOUT_MS = 10_000

export type FetchBoardResult = {
  html: RawHtml
  status: number
  /** Round-trip in milliseconds. Logged to `health:rfi` so "RFI is slow" stays distinguishable
   * from "we have been blocked" (ARCHITECTURE 8). */
  latencyMs: number
}

/**
 * One request to RFI. Resolves with whatever status RFI answered — including 429/5xx, for the
 * caller's backoff logic — and only rejects when the request itself failed to complete (network
 * error, timeout): there is no HTTP status to report in that case.
 */
export async function fetchBoard(placeId: string, mode: BoardMode): Promise<FetchBoardResult> {
  const url = new URL(BASE_URL)
  url.searchParams.set('PlaceId', placeId)
  url.searchParams.set('Arrivals', mode === 'arrivals' ? 'True' : 'False')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Tabellone/0.0 (+https://github.com/tabellone; POC, non-commercial)',
        Accept: 'text/html',
      },
    })
    const html = await response.text()
    return { html, status: response.status, latencyMs: Date.now() - startedAt }
  } finally {
    clearTimeout(timeout)
  }
}

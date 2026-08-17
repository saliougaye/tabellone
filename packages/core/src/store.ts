/**
 * Refresh-on-read orchestration, and the only module that knows the Redis key schema, the
 * TTLs and the lock (ARCHITECTURE 7). Everything stateful is injected: the cache client, the
 * fetcher, the clock. This module owns the *policy*, not the connections (ADR-002, ADR-005).
 *
 * The decision table it implements (ARCHITECTURE 7.1):
 *
 *   read Redis
 *     fresh (< 20 s)   → respond
 *     stale (< 60 s)   → respond immediately, kick off a background refresh
 *     absent           → take the lock, fetch RFI, write, respond
 *
 * Around every RFI call, in order:
 *  1. single-flight lock `SET lock:{placeId}:{mode} 1 NX EX 15` — if held, serve stale.
 *     The mechanism that makes RFI load proportional to active stations, not users.
 *  2. global ceiling: 5 req/s towards RFI, token bucket on the cache.
 *  3. backoff on 429/5xx: double that station's interval up to 5 min, keep serving stale
 *     with `isStale: true`. Never retry immediately.
 *
 * Every RFI response is logged to `health:rfi` with status code and latency, and every
 * unrecognised operator/category/status lands in `unknown:*` so the silent failure becomes
 * noisy (ADR-008, ARCHITECTURE 8).
 */
import { NotImplementedError } from './errors'
import type { FetchBoardResult } from './fetcher'
import type { BoardCache, BoardMode, Clock, StationBoard } from './types'

/** TTLs in seconds, straight from ARCHITECTURE 7.1/7.2. One place, no magic numbers elsewhere. */
export const TTL = {
  /** Below this age a cached board is fresh: respond, touch nothing. */
  fresh: 20,
  /** Below this age it is servable while a background refresh runs. */
  staleWhileRevalidate: 60,
  /** Redis key TTL. Beyond this the board is gone and RFI is read synchronously. */
  key: 90,
  /** Single-flight lock: `NX EX 15`. */
  lock: 15,
  /** Backoff ceiling for a station that keeps failing. */
  maxBackoff: 300,
} as const

/** Global ceiling towards RFI: 5 req/s, token bucket on the cache (ARCHITECTURE 7.2). */
export const RFI_MAX_REQUESTS_PER_SECOND = 5

/**
 * The whole key schema (ARCHITECTURE 7.4). Nothing outside this module may build one of
 * these strings. Note `dep`/`arr` in the board key: the key schema abbreviates, the API
 * does not.
 */
export const keys = {
  board: (placeId: string, mode: BoardMode) =>
    `board:${placeId}:${mode === 'departures' ? 'dep' : 'arr'}`,
  lock: (placeId: string, mode: BoardMode) => `lock:${placeId}:${mode}`,
  /** LIST, capped at the last 100 RFI outcomes. */
  healthRfi: 'health:rfi',
  /** SETs of raw values we failed to map. They feed the alert, not the payload. */
  unknownVettore: 'unknown:vettore',
  unknownCategoria: 'unknown:categoria',
  unknownStatus: 'unknown:status',
} as const

/**
 * Everything `readBoard` needs, handed in by the caller. `apps/web` builds this once from
 * its Redis client and the real fetcher; tests build it from an in-memory cache and a
 * canned fetcher, and lie about the clock.
 */
export type StoreDeps = {
  cache: BoardCache
  fetchBoard: (placeId: string, mode: BoardMode) => Promise<FetchBoardResult>
  clock: Clock
}

/**
 * The one entry point: give me the board for this station, honestly labelled.
 *
 * Always resolves to a `StationBoard` when there is anything at all to serve — fresh,
 * stale-while-revalidating, or stale-because-RFI-is-down (`isStale: true`, old
 * `generatedAt`). Rejects only in the single case the API maps to 503: RFI unreachable
 * *and* nothing cached (ARCHITECTURE 6).
 */
export function readBoard(
  _deps: StoreDeps,
  _placeId: string,
  _mode: BoardMode,
): Promise<StationBoard> {
  throw new NotImplementedError('readBoard')
}

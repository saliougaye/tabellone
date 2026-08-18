/**
 * Refresh-on-read orchestration (ARCHITECTURE 7). Owns the *policy* — when to serve cache,
 * when to refresh, when to give up — not the connections: the store client, the fetcher and
 * the clock are all injected (ADR-002, ADR-005). The literal Redis key schema lives behind
 * the injected `BoardStore`, not here.
 *
 * The decision table it implements (ARCHITECTURE 7.1):
 *
 *   read cache
 *     fresh (< 20 s)               → respond
 *     stale (< 60 s)               → try a refresh, fall back to stale on failure
 *     absent or older than 60 s    → try a refresh, fall back to stale if anything is cached,
 *                                     else reject with `BoardUnavailableError` (→ API 503)
 *
 * Around every refresh attempt, in order: the global rate ceiling, the single-flight lock
 * (if already held, someone else is refreshing — fall back same as a failed fetch), the
 * fetch, a `health:rfi` entry, then the parse. `fetcher`/`parser` are still stubs, so every
 * attempt fails today and every request takes the "nothing cached" path — this file does not
 * need to change again once they are real.
 */
import { BoardUnavailableError } from './errors'
import type { FetchBoardResult } from './fetcher'
import { parseBoard, parseNotices } from './parser'
import type { BoardMode, BoardRow, BoardStore, Clock, Station, StationBoard } from './types'

/** TTLs in seconds, straight from ARCHITECTURE 7.1/7.2. One place, no magic numbers elsewhere. */
export const TTL = {
  /** Below this age a cached board is fresh: respond, touch nothing. */
  fresh: 20,
  /** Below this age it is servable while a refresh is attempted. */
  staleWhileRevalidate: 60,
  /** Redis key TTL. Beyond this the board is gone by itself. */
  key: 90,
  /** Single-flight lock: `NX EX 15`. */
  lock: 15,
  /** Backoff ceiling for a station that keeps failing. */
  maxBackoff: 300,
} as const

/** Global ceiling towards RFI: 5 req/s, token bucket on the cache (ARCHITECTURE 7.2). */
export const RFI_MAX_REQUESTS_PER_SECOND = 5

/**
 * Everything `readBoard` needs, handed in by the caller. `apps/web` builds this once from
 * `createRedisBoardStore` and the real fetcher; tests build it from an in-memory `BoardStore`
 * and a canned fetcher, and lie about the clock.
 */
export type StoreDeps = {
  store: BoardStore
  fetchBoard: (placeId: string, mode: BoardMode) => Promise<FetchBoardResult>
  clock: Clock
}

/**
 * The one entry point: give me the board for this station, honestly labelled.
 *
 * Always resolves to a `StationBoard` when there is anything at all to serve — fresh,
 * refreshed, or stale-because-RFI-is-down (`isStale: true`, old `generatedAt`). Rejects only
 * in the single case the API maps to 503: nothing cached and the refresh failed
 * (ARCHITECTURE 6).
 */
export async function readBoard(
  deps: StoreDeps,
  station: Station,
  mode: BoardMode,
): Promise<StationBoard> {
  const { rfiPlaceId, slug, name } = station
  const cached = await deps.store.getBoard(rfiPlaceId, mode)

  if (cached) {
    const ageSeconds = (deps.clock().getTime() - new Date(cached.generatedAt).getTime()) / 1000
    if (ageSeconds < TTL.fresh) {
      return cached
    }
  }

  const refreshed = await tryRefresh(deps, rfiPlaceId, mode, slug, name)
  if (refreshed) {
    return refreshed
  }
  if (cached) {
    return { ...cached, isStale: true }
  }
  throw new BoardUnavailableError(rfiPlaceId, mode)
}

/** One refresh attempt. `null` means "could not refresh" for any reason — caller decides
 * whether that is fine (something stale to fall back to) or fatal (nothing cached at all). */
async function tryRefresh(
  deps: StoreDeps,
  placeId: string,
  mode: BoardMode,
  slug: string,
  stationName: string,
): Promise<StationBoard | null> {
  const withinBudget = await deps.store.checkRateLimit()
  if (!withinBudget) {
    return null
  }

  const gotLock = await deps.store.acquireBoardLock(placeId, mode)
  if (!gotLock) {
    return null
  }

  try {
    let fetched: FetchBoardResult
    try {
      fetched = await deps.fetchBoard(placeId, mode)
    } catch {
      return null
    }

    await deps.store.logHealthOutcome({ status: fetched.status, latencyMs: fetched.latencyMs })
    if (fetched.status >= 400) {
      return null
    }

    let rows: BoardRow[]
    let notices: string[]
    try {
      rows = parseBoard(fetched.html, mode)
      notices = parseNotices(fetched.html)
    } catch {
      return null
    }

    const board: StationBoard = {
      stationId: slug,
      stationName,
      mode,
      generatedAt: deps.clock().toISOString(),
      isStale: false,
      rows,
      notices,
    }
    await deps.store.saveBoard(placeId, mode, board)
    return board
  } finally {
    await deps.store.releaseBoardLock(placeId, mode)
  }
}

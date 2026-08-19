/**
 * Last board open, session-scoped (`sessionStorage`, not `localStorage` — deliberately
 * distinct from the persistent "recenti" in `saved-stations.ts`). Lets the picker page
 * bounce a returning user straight back to the board they had open, once per session
 * (`consumeRedirect` — design: docs/superpowers/specs/2026-08-19-last-station-redirect-design.md).
 */
import type { BoardMode } from '@tabellone/core'

type LastStation = {
  slug: string
  mode: BoardMode
}

const LAST_STATION_KEY = 'tabellone:last-station'
const REDIRECTED_KEY = 'tabellone:home-redirected'

function read(): LastStation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(LAST_STATION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as LastStation).slug === 'string' &&
      ((parsed as LastStation).mode === 'departures' || (parsed as LastStation).mode === 'arrivals')
    ) {
      return parsed as LastStation
    }
    return null
  } catch {
    return null
  }
}

export function recordLastStation(slug: string, mode: BoardMode): void {
  try {
    window.sessionStorage.setItem(LAST_STATION_KEY, JSON.stringify({ slug, mode }))
  } catch {
    /* quota or private mode: redirect simply won't fire next time */
  }
}

/**
 * Returns the last station, but only on the first call this session — every later
 * call returns null, even once a station has since been recorded. This is what keeps
 * the redirect to at most once per session: the first `/` mount consumes it, so a
 * deliberate return to the picker later in the same session isn't bounced back.
 */
export function consumeRedirect(): LastStation | null {
  if (typeof window === 'undefined') return null
  try {
    if (window.sessionStorage.getItem(REDIRECTED_KEY)) return null
    window.sessionStorage.setItem(REDIRECTED_KEY, '1')
    return read()
  } catch {
    return null
  }
}

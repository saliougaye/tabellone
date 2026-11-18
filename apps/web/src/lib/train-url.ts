/**
 * The open train sheet lives in the URL (ADR-012, amended November 2026): the train page is the
 * board of that station and mode with that train's ticket sheet open.
 *
 * Tapping a ticket *pushes* `/stazioni/:slug/partenze/:trainNumber`, so the link is shareable
 * and Back closes the sheet. Closing from the sheet (X, drag, veil, Escape) goes back when we
 * pushed the entry, and otherwise replaces it with the board URL — a cold visit to a train URL
 * has no board entry behind it. A cold visit renders the board and opens the sheet.
 *
 * Client only. The history calls bypass the Next router on purpose (a sheet is not a page, and
 * the board must not remount), so everything that depends on the URL reads it through
 * `useTrainParam`.
 */
import type { BoardMode } from '@tabellone/core'
import { useSyncExternalStore } from 'react'
import { canonicalBoardPath } from './board-routes'
import { trainDetailPath } from './train-routes'

const CHANGE_EVENT = 'tabellone:train'
const TRAIN_PATH = /^\/stazioni\/[^/]+\/(?:partenze|arrivi)\/([^/]+)\/?$/
/** History entries we pushed on top of a board entry: only those can be closed with Back. */
let pushed = 0

/** The train number in the URL, or '' on a bare board. */
export function trainFromPath(pathname: string): string {
  const match = TRAIN_PATH.exec(pathname)
  if (!match?.[1]) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const read = () => trainFromPath(window.location.pathname)

function subscribe(onChange: () => void) {
  const onPop = () => {
    // Back onto the board entry: nothing of ours is left on top. Forward again: one.
    pushed = read() ? 1 : 0
    onChange()
  }
  window.addEventListener('popstate', onPop)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onPop)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

const emit = () => window.dispatchEvent(new Event(CHANGE_EVENT))

/** The train number in the URL, or null on the bare board. */
export function useTrainParam(): string | null {
  return useSyncExternalStore(subscribe, read, () => '') || null
}

export function openTrain(slug: string, mode: BoardMode, trainNumber: string) {
  // `null`, not `history.state`: Next's router treats a state carrying its own `__NA` marker as
  // an internal call and does not adopt the URL, then writes its stale URL back on the next
  // router update (a prefetch, the 20 s poll) — which closed the sheet by itself.
  window.history.pushState(null, '', trainDetailPath(slug, mode, trainNumber))
  pushed += 1
  emit()
}

/**
 * Closes the open sheet. Resolves once the URL has settled, so a caller that goes on to
 * navigate (the mode tabs) does not race the asynchronous `history.back()`.
 */
export function closeTrain(slug: string, mode: BoardMode): Promise<void> {
  if (!read()) return Promise.resolve()
  if (pushed > 0) {
    pushed -= 1
    return new Promise((resolve) => {
      const done = () => {
        window.removeEventListener('popstate', done)
        window.clearTimeout(fallback)
        resolve()
      }
      const fallback = window.setTimeout(done, 400)
      window.addEventListener('popstate', done)
      window.history.back()
    })
  }
  // Arrived on the train URL directly: there is no board entry behind it to go back to.
  window.history.replaceState(null, '', canonicalBoardPath(slug, mode))
  emit()
  return Promise.resolve()
}

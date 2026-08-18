'use client'

/**
 * Keeps a row on the board for the length of its exit animation after it has already left
 * `board.rows`.
 *
 * This is the one piece of the animation pass that needs real state. Entry needs none — a
 * key that was not in the previous render is a new DOM node, so the browser plays
 * `tab-row-entry` on its first paint by itself. Exit has the opposite problem: between two
 * polls a departed train simply is not in the payload any more, and no keyframe can play on
 * a node React has already unmounted. So the last-seen list is held here, and a key that
 * disappears is kept one more beat, marked `leaving`, with the row object as it was last
 * seen — the caller still has to read `status` off it to choose between the departed and the
 * cancelled exit, and by then the row is gone from the data.
 *
 * Only `leaving` entries are held. `idle` entries always carry the row object from the
 * current `rows` argument, so a poll that changes a delay without changing the key set is
 * passed straight through — the board must never render a stale snapshot of a train that is
 * still on it.
 */
import type { BoardRow } from '@tabellone/core'
import { useEffect, useRef, useState } from 'react'

export type DepartingPhase = 'idle' | 'leaving'

export type DepartingRow<T> = {
  key: string
  row: T
  phase: DepartingPhase
}

/**
 * Floor for how long a `leaving` entry is held. Under `prefers-reduced-motion`
 * `--duration-exit` is 1ms, which is not enough time for React to commit anything: the
 * entry would be scheduled for removal before the render that first showed it as leaving
 * had even painted. 50ms is invisible and gives the commit room.
 */
const MIN_EXIT_MS = 50
/** Only used when `--duration-exit` cannot be read at all (no DOM, no stylesheet). */
const FALLBACK_EXIT_MS = 320

/**
 * Exported for its own test: the point of reading the token instead of hard-coding 320 is
 * that the CSS stays the single source of the exit duration, including its reduced-motion
 * rewrite — a JS constant kept level with the token by hand is a constant that drifts.
 */
export function parseExitDuration(raw: string): number {
  const value = raw.trim()
  const ms = value.endsWith('ms')
    ? Number.parseFloat(value)
    : value.endsWith('s')
      ? Number.parseFloat(value) * 1000
      : Number.NaN
  return Math.max(Number.isFinite(ms) ? ms : FALLBACK_EXIT_MS, MIN_EXIT_MS)
}

function exitDuration(): number {
  if (typeof window === 'undefined') return MIN_EXIT_MS
  return parseExitDuration(
    getComputedStyle(document.documentElement).getPropertyValue('--duration-exit'),
  )
}

/** Which of the two exits a row leaves by. The two shapes are deliberately opposite. */
export function rowExitClass(row: Pick<BoardRow, 'status'>): string {
  return row.status === 'CANCELLED' ? 'animate-exit-cancelled' : 'animate-exit-departed'
}

type State<T> = { signature: string; entries: DepartingRow<T>[] }

export function useDepartingRows<T>(rows: T[], keyFn: (row: T) => string): DepartingRow<T>[] {
  const keys = rows.map(keyFn)
  // Compared by content, not by array identity: the caller slices `board.rows` on every
  // render, so identity changes constantly while the key set does not.
  const signature = `${keys.length}:${keys.join(',')}`

  const [state, setState] = useState<State<T>>(() => ({
    signature,
    entries: rows.map((row) => ({ key: keyFn(row), row, phase: 'idle' })),
  }))

  // Adjust state during render rather than in an effect: an effect would paint one frame of
  // the board without the departing row, which is the exact frame the exit animation exists
  // to replace.
  let entries = state.entries
  if (state.signature !== signature) {
    entries = merge(state.entries, rows, keyFn)
    setState({ signature, entries })
  }

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    const leaving = new Set(
      state.entries.filter((entry) => entry.phase === 'leaving').map((entry) => entry.key),
    )
    // A train back on the board before its timer fired is idle again, and its removal must
    // be called off — otherwise the timer would drop the live row.
    for (const [key, timer] of pending) {
      if (leaving.has(key)) continue
      clearTimeout(timer)
      pending.delete(key)
    }
    for (const key of leaving) {
      if (pending.has(key)) continue
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key)
          setState((previous) => ({
            ...previous,
            entries: previous.entries.filter((entry) => entry.key !== key),
          }))
        }, exitDuration()),
      )
    }
  }, [state.entries])

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const fresh = new Map(rows.map((row) => [keyFn(row), row]))
  return entries.map((entry) => {
    const row = fresh.get(entry.key)
    return row === undefined || row === entry.row ? entry : { ...entry, row }
  })
}

/**
 * Incoming rows in incoming order; every key that was there and is not any more kept as
 * `leaving`, in the gap it used to occupy — anchored to the surviving row above it, so a
 * departing train does not jump to the end of the list on its way out.
 */
function merge<T>(
  previous: DepartingRow<T>[],
  rows: T[],
  keyFn: (row: T) => string,
): DepartingRow<T>[] {
  const incoming: DepartingRow<T>[] = rows.map((row) => ({ key: keyFn(row), row, phase: 'idle' }))
  const incomingKeys = new Set(incoming.map((entry) => entry.key))
  const leaving: Array<{ entry: DepartingRow<T>; afterKey: string | null }> = []
  let survivor: string | null = null
  for (const entry of previous) {
    if (incomingKeys.has(entry.key)) {
      survivor = entry.key
      continue
    }
    leaving.push({
      // Already leaving: keep the same object, so the effect above sees no change and does
      // not restart a timer that is already counting down.
      entry: entry.phase === 'leaving' ? entry : { ...entry, phase: 'leaving' },
      afterKey: survivor,
    })
  }
  if (leaving.length === 0) return incoming

  const out = leaving.filter((held) => held.afterKey === null).map((held) => held.entry)
  for (const entry of incoming) {
    out.push(entry)
    for (const held of leaving) if (held.afterKey === entry.key) out.push(held.entry)
  }
  return out
}

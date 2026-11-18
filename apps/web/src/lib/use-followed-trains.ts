'use client'

/** The followed trains as a reactive value: any tab's change reaches every screen showing them. */
import { useMemo, useSyncExternalStore } from 'react'
import {
  FOLLOWED_EVENT,
  type FollowedTrain,
  parseFollowed,
  readFollowedRaw,
} from './followed-trains'

function subscribe(onChange: () => void) {
  window.addEventListener(FOLLOWED_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(FOLLOWED_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/**
 * `now` is the screen's own clock, so an entry expires on screen without a reload. The snapshot
 * is the raw string (a stable primitive); parsing happens in `useMemo`. On the server it is
 * empty, which is also what the client renders first: no hydration mismatch.
 */
export function useFollowedTrains(now: Date): FollowedTrain[] {
  const raw = useSyncExternalStore(subscribe, readFollowedRaw, () => '')
  return useMemo(() => parseFollowed(raw || null, now), [raw, now])
}

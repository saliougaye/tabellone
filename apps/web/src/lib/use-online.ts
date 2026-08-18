/**
 * Whether the browser currently has a network connection, as a reactive value.
 *
 * The board's failed-read screen and "sei offline" are not the same fact and must not
 * look the same: a failed read means we reached the app and it could not get the station's
 * data (RFI down, our server down), offline means the request never left the device.
 * `navigator.onLine` is the only signal that separates them client-side — a fetch
 * rejection alone cannot.
 *
 * `navigator.onLine === false` is trustworthy (no route at all); `true` only means a route
 * exists, not that anything is reachable, which is why offline *narrows* the failure
 * screen and never replaces it: with `onLine === true` a failed poll still shows the
 * ordinary failed-read state.
 *
 * `useSyncExternalStore` rather than state + effects: the server snapshot is fixed at
 * `true` (a server has no client connectivity to report, and an offline client cannot
 * request the page anyway), so the markup React hydrates against is the online one and
 * hydration never mismatches.
 */
'use client'

import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

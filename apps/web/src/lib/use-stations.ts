/**
 * The station catalogue from `/api/stations`, shared by the picker page and the mobile
 * "cambia stazione" bottom sheet on the board page. One React Query key means the sheet
 * opens with whatever the picker already fetched — and vice versa.
 *
 * The catalogue is served with a long ETag and changes only on deploy, so it is held for
 * the session instead of being refetched on every return to the picker. Fetched once, it
 * therefore survives going offline and the picker keeps working from cache.
 *
 * Without it, offline is reported as a *failure* rather than as pending: React Query's
 * default `networkMode: 'online'` pauses a query while the browser has no connection, so
 * `isPending` would otherwise stay true for as long as the network is down and the picker
 * would show its loading placeholders forever. `offline` rides along so the caller can say
 * which of the two failures it is.
 */
'use client'

import type { Station } from '@tabellone/core'
import { useQuery } from '@tanstack/react-query'
import { useOnline } from './use-online'

export function stationsQueryKey() {
  return ['stations'] as const
}

export async function fetchStations(): Promise<Station[]> {
  const response = await fetch('/api/stations', { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`stations fetch failed: ${response.status}`)
  return (await response.json()) as Station[]
}

export function useStations() {
  const query = useQuery({
    queryKey: stationsQueryKey(),
    queryFn: fetchStations,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })

  const online = useOnline()
  const stations = query.data ?? null

  return {
    stations,
    loading: query.isPending && online,
    failed: query.isError || (!online && stations === null),
    offline: !online,
  }
}

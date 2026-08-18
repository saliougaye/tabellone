/**
 * The station catalogue from `/api/stations`, shared by the picker page and the mobile
 * "cambia stazione" bottom sheet on the board page. One React Query key means the sheet
 * opens with whatever the picker already fetched — and vice versa.
 *
 * The catalogue is served with a long ETag and changes only on deploy, so it is held for
 * the session instead of being refetched on every return to the picker.
 */
'use client'

import type { Station } from '@tabellone/core'
import { useQuery } from '@tanstack/react-query'

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

  return { stations: query.data ?? null, loading: query.isPending, failed: query.isError }
}

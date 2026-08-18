/**
 * Client polling for `/api/board/:slug` (ADR-006): every 20 s, suspended while the
 * document is hidden, an immediate refresh on return — all three now come from React
 * Query (`refetchInterval` + the focus manager) instead of a hand-rolled timer.
 *
 * The hook never throws away the last good board: a failed poll keeps the previous data
 * and raises `error`, so the UI can show stale content with an honest freshness label
 * instead of a blank screen. That is React Query's default too — `data` survives a failed
 * refetch.
 *
 * The cache key is `['board', slug, mode]`, so departures and arrivals are two entries:
 * toggling back to a mode already fetched paints instantly and revalidates behind the
 * scenes, and the very first toggle reports `pending` so the screen can show a skeleton
 * rather than sit on the other mode's rows.
 */
'use client'

import type { BoardMode, StationBoard } from '@tabellone/core'
import { useQuery } from '@tanstack/react-query'

export const POLL_INTERVAL_MS = 20_000

export type BoardQuery = {
  board: StationBoard | null
  /** Set when the latest poll failed; the previous board, if any, is still in `board`. */
  error: boolean
  /** No board for *this* slug+mode yet — first load, or a mode never fetched before. */
  loading: boolean
  refresh: () => void
}

export function boardQueryKey(slug: string, mode: BoardMode) {
  return ['board', slug, mode] as const
}

export async function fetchBoardJson(slug: string, mode: BoardMode): Promise<StationBoard> {
  const response = await fetch(`/api/board/${slug}?mode=${mode}`, {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`board fetch failed: ${response.status}`)
  return (await response.json()) as StationBoard
}

export function useBoard(slug: string, mode: BoardMode): BoardQuery {
  const query = useQuery({
    queryKey: boardQueryKey(slug, mode),
    queryFn: () => fetchBoardJson(slug, mode),
    refetchInterval: POLL_INTERVAL_MS,
    // Default already, spelled out because it is the ADR-006 rule, not an incidental:
    // polling stops while the document is hidden.
    refetchIntervalInBackground: false,
  })

  return {
    board: query.data ?? null,
    error: query.isError,
    loading: query.isPending,
    refresh: () => {
      void query.refetch()
    },
  }
}

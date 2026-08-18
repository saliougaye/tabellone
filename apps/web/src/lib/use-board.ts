/**
 * Client polling for `/api/board/:slug` (ADR-006): every 20 s, suspended while the
 * document is hidden, an immediate refresh on return. The hook never throws away the
 * last good board: a failed poll keeps the data and raises `error`, so the UI can show
 * stale content with an honest freshness label instead of a blank screen.
 */
'use client'

import type { BoardMode, StationBoard } from '@tabellone/core'
import { useCallback, useEffect, useRef, useState } from 'react'

export const POLL_INTERVAL_MS = 20_000

export type BoardQuery = {
  board: StationBoard | null
  /** Set when the latest poll failed; the previous board, if any, is still in `board`. */
  error: boolean
  loading: boolean
  refresh: () => void
}

export function useBoard(slug: string, mode: BoardMode): BoardQuery {
  const [board, setBoard] = useState<StationBoard | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      const response = await fetch(`/api/board/${slug}?mode=${mode}`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`board fetch failed: ${response.status}`)
      const payload = (await response.json()) as StationBoard
      setBoard(payload)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [slug, mode])

  useEffect(() => {
    setLoading(true)
    setError(false)

    const start = () => {
      if (timer.current !== null) return
      timer.current = setInterval(fetchBoard, POLL_INTERVAL_MS)
    }
    const stop = () => {
      if (timer.current === null) return
      clearInterval(timer.current)
      timer.current = null
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        void fetchBoard()
        start()
      }
    }

    void fetchBoard()
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchBoard])

  return { board, error, loading, refresh: fetchBoard }
}

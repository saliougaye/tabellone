'use client'

/**
 * Live wiring of the board page: polls `/api/board/:slug` (20 s, hidden-suspended),
 * keeps the `view` query param in sync (ADR-010), records the visit and toggles the
 * favourite in `localStorage`. Rendering is delegated to the presentational BoardView.
 *
 * While the backend does not exist the API answers 501 on purpose: this screen then
 * shows the failed-read state — which is exactly the behaviour wanted when RFI is
 * unreachable with no cache.
 */
import type { BoardMode } from '@tabellone/core'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isFavourite, recordVisit, toggleFavourite } from '@/lib/saved-stations'
import { useBoard } from '@/lib/use-board'
import { BoardError, BoardLoading } from './board-states'
import { BoardView } from './board-view'

export function BoardScreen({ slug, initialMode }: { slug: string; initialMode: BoardMode }) {
  const router = useRouter()
  const [mode, setMode] = useState<BoardMode>(initialMode)
  const [favourite, setFavourite] = useState(false)
  const { board, error, loading, refresh } = useBoard(slug, mode)

  const stationName = board?.stationName ?? slug

  useEffect(() => {
    setFavourite(isFavourite(slug))
  }, [slug])

  useEffect(() => {
    recordVisit(slug, stationName)
  }, [slug, stationName])

  const switchMode = (next: BoardMode) => {
    setMode(next)
    router.replace(next === 'arrivals' ? `/${slug}?view=arrivals` : `/${slug}`, { scroll: false })
  }

  return (
    <main
      className="flex min-h-dvh flex-col"
      style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 3vw, 40px) var(--sp-20)' }}
    >
      {board ? (
        <BoardView
          board={error ? { ...board, isStale: true } : board}
          now={new Date()}
          onSwitchMode={switchMode}
          pickerHref="/"
          favourite={{
            active: favourite,
            onToggle: () => setFavourite(toggleFavourite(slug, stationName)),
          }}
        />
      ) : loading ? (
        <BoardLoading stationLabel={stationName} />
      ) : (
        <BoardError stationLabel={stationName} onRetry={refresh} />
      )}
    </main>
  )
}

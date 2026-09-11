'use client'

/**
 * Live wiring of the train page. It subscribes to **the board's** query — same key, same
 * 20 s poll, same hidden-suspension (ADR-006) — and picks one row out of it (ADR-012).
 * Arriving from the board that row is already in the cache, so the page paints with no
 * request at all; arriving cold, it triggers exactly the read the board route would have
 * made. There is no per-train fetch anywhere, and there must not be one: RFI has no
 * per-train source.
 *
 * The states are the board's, read in the same order and for the same reasons — offline
 * before loading, because React Query pauses rather than fails while the browser reports no
 * connection — plus one of its own: the board is here and the train is not (`TrainGone`).
 */
import type { BoardMode } from '@tabellone/core'
import { useEffect, useRef } from 'react'
import { BoardError, BoardLoading, BoardOffline } from '@/components/board/board-states'
import { AppHeader } from '@/components/shell/app-header'
import { canonicalBoardPath } from '@/lib/board-routes'
import { recordLastStation } from '@/lib/last-station'
import { findRowByTrainNumber } from '@/lib/train-routes'
import { useBoard } from '@/lib/use-board'
import { useOnline } from '@/lib/use-online'
import { useScrolledPast } from '@/lib/use-scrolled-past'
import { TrainGone } from './train-states'
import { TrainView } from './train-view'

export function TrainScreen({
  slug,
  mode,
  trainNumber,
  catalogName,
}: {
  slug: string
  mode: BoardMode
  trainNumber: string
  catalogName?: string
}) {
  const { board, error, loading, refresh } = useBoard(slug, mode)
  const online = useOnline()

  const heading = useRef<HTMLDivElement>(null)
  const headingGone = useScrolledPast(heading)

  const row = board ? findRowByTrainNumber(board.rows, trainNumber) : null
  const stationName = board?.stationName ?? catalogName
  const boardPath = canonicalBoardPath(slug, mode)

  // Leaving from a train page, the session's last station is still this station's board:
  // that is what "take me back where I was" means here too.
  useEffect(() => {
    recordLastStation(slug, mode)
  }, [slug, mode])

  const content =
    board && row ? (
      <TrainView
        board={error || !online ? { ...board, isStale: true } : board}
        row={row}
        now={new Date()}
        headingRef={heading}
      />
    ) : !online ? (
      <BoardOffline stationLabel={stationName} onRetry={refresh} />
    ) : loading ? (
      <BoardLoading stationLabel={stationName} />
    ) : board ? (
      <TrainGone trainNumber={trainNumber} stationLabel={stationName} boardPath={boardPath} />
    ) : (
      <BoardError stationLabel={stationName} onRetry={refresh} />
    )

  return (
    <>
      {/* The header takes over the *train*, not the station: on this page the headsign is
          what the reader scrolled away from. */}
      <AppHeader condensedTitle={row?.headsign} condensed={headingGone} />
      <main
        className="flex min-h-[calc(100dvh-4rem)] animate-screen-in flex-col"
        style={{ padding: 'var(--sp-6) var(--screen-margin) var(--sp-20)' }}
      >
        {content}
      </main>
    </>
  )
}

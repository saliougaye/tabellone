'use client'

/**
 * One train's own page (ADR-012): a second reader of the board's React Query entry, never a
 * second fetch. The station banner, the train as a hero flight card, its stops as a rail,
 * and the way back to the board. One state the board does not have: the train has left.
 */
import { ArrowLeft } from '@phosphor-icons/react'
import type { BoardMode } from '@tabellone/core'
import Link from 'next/link'
import { canonicalBoardPath } from '@/lib/board-routes'
import { useNow } from '@/lib/format'
import { findRowByTrainNumber } from '@/lib/train-routes'
import { useBoard } from '@/lib/use-board'
import { strings } from '@/strings'
import { FlightCard, Message } from '../board/parts'
import { StationBanner } from '../board/station-banner'
import { StopsRail } from '../board/train-sheet'

export function TrainScreen({
  slug,
  mode,
  trainNumber,
  catalogName,
  city,
}: {
  slug: string
  mode: BoardMode
  trainNumber: string
  catalogName?: string
  city?: string
}) {
  const { board, loading, error, refresh } = useBoard(slug, mode)
  const now = useNow(30_000)
  const stationName = board?.stationName ?? catalogName ?? slug
  const row = board ? findRowByTrainNumber(board.rows, trainNumber) : null
  const back = canonicalBoardPath(slug, mode)

  return (
    <main className="sh">
      <div className="sh-col">
        <StationBanner stationName={stationName} city={city} />
        <Link href={back} className="sh-btn ghost" style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={16} />
          {strings.backToBoard}
        </Link>
        {loading && !board && <Message title={strings.loading} />}
        {error && !board && (
          <Message
            title={strings.fetchFailed}
            hint={strings.fetchFailedHint}
            action={{ label: strings.retry, onClick: refresh }}
          />
        )}
        {board && !row && <Message title={strings.trainGone} hint={strings.trainGoneHint} />}
        {row && (
          <>
            <ul className="fl-cards">
              <FlightCard
                row={row}
                mode={mode}
                now={now}
                stationName={stationName}
                hero
                onOpen={() => {}}
              />
            </ul>
            <section className="sh-card" style={{ padding: '8px 16px 12px' }}>
              <h2 className="sh-sec-h" style={{ margin: '8px 0 4px' }}>
                {mode === 'departures' ? strings.stopsAt : strings.comesFrom}
              </h2>
              <StopsRail row={row} mode={mode} stationName={stationName} />
            </section>
          </>
        )}
      </div>
    </main>
  )
}

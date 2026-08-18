'use client'

/**
 * The board screen, purely presentational: `StationBoard` in, pixels out. Desktop layout
 * from sheet 10 (rich rows + "Più tardi"), mobile from sheet 11 (hero card + list),
 * split at 600px like the tokens. Fetching, polling and favourites live in the caller.
 */
import type { BoardMode, StationBoard } from '@tabellone/core'
import Link from 'next/link'
import { strings } from '@/strings'
import { FreshnessDot, ModeToggle } from './parts'
import { CompactRow, HeroCard, LaterRow, RichRow } from './rows'

const RICH_ROW_COUNT = 5

export type BoardViewProps = {
  board: StationBoard
  now: Date
  onSwitchMode: (mode: BoardMode) => void
  /** Where the station name leads: the picker. Omit to render a static title (gallery). */
  pickerHref?: string
  favourite?: { active: boolean; onToggle: () => void }
}

export function BoardView({ board, now, onSwitchMode, pickerHref, favourite }: BoardViewProps) {
  const listLabel = board.mode === 'departures' ? strings.nextDepartures : strings.nextArrivals
  const richRows = board.rows.slice(0, RICH_ROW_COUNT)
  const laterRows = board.rows.slice(RICH_ROW_COUNT)
  const [heroRow, ...restRows] = board.rows

  const stationTitle = (
    <span className="flex items-center gap-3 whitespace-nowrap uppercase type-title leading-(--type-dominant-leading)">
      {board.stationName}
      {pickerHref && (
        <svg
          viewBox="0 0 16 16"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
      )}
    </span>
  )

  const favouriteButton = favourite && (
    <button
      type="button"
      onClick={favourite.onToggle}
      aria-pressed={favourite.active}
      title={favourite.active ? strings.unfollow : strings.follow}
      className="inline-flex cursor-pointer items-center justify-center rounded-minimal border border-line text-text-secondary transition-[color,border-color] min-h-(--touch-min) min-w-(--touch-min)"
      style={favourite.active ? { color: 'var(--state-on-time)' } : undefined}
    >
      <svg
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill={favourite.active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
      </svg>
      <span className="sr-only">{favourite.active ? strings.unfollow : strings.follow}</span>
    </button>
  )

  const notices = board.notices.length > 0 && (
    <section className="flex flex-col gap-2 rounded-minimal border border-line bg-surface-raised px-4 py-3">
      <span className="text-text-tertiary type-label">{strings.notices}</span>
      {board.notices.map((notice) => (
        <p key={notice} className="m-0 text-text-secondary type-reading">
          {notice}
        </p>
      ))}
    </section>
  )

  const empty = board.rows.length === 0 && (
    <section className="flex flex-col items-center gap-4 rounded-minimal border border-line bg-surface-raised px-4 py-12 text-center">
      <span className="type-primary" style={{ fontWeight: 'var(--weight-strong)' }}>
        {strings.emptyBoard}
      </span>
      <p className="m-0 max-w-[36ch] text-text-secondary type-reading">{strings.emptyBoardHint}</p>
    </section>
  )

  return (
    <div className={board.isStale ? 'animate-aging' : ''}>
      {/* ── Desktop ≥ 600px (sheet 10) ─────────────────────────────────────── */}
      <div className="mx-auto hidden max-w-(--content-max-width) flex-col gap-8 min-[600px]:flex">
        <header className="flex flex-wrap items-end justify-between gap-8 border-b-2 border-line-strong pb-5">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-text-tertiary">
              <PinIcon />
              <span className="whitespace-nowrap type-label">{strings.currentStation}</span>
            </span>
            <span className="flex items-center gap-3">
              {pickerHref ? (
                <Link href={pickerHref} className="text-text-primary no-underline">
                  {stationTitle}
                </Link>
              ) : (
                stationTitle
              )}
              {favouriteButton}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <FreshnessDot generatedAt={board.generatedAt} isStale={board.isStale} now={now} />
            <ModeToggle mode={board.mode} onChange={onSwitchMode} />
          </div>
        </header>

        {notices}
        {empty}

        {richRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4 px-1">
              <span className="whitespace-nowrap text-text-tertiary type-label">{listLabel}</span>
              <span className="whitespace-nowrap text-text-tertiary type-tertiary">
                {strings.listCount(board.rows.length)}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {richRows.map((row) => (
                <RichRow
                  key={`${row.trainNumber}-${row.scheduledTime}`}
                  row={row}
                  mode={board.mode}
                  originName={board.stationName}
                />
              ))}
            </div>
          </section>
        )}

        {laterRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="border-t-2 border-line-strong px-1 pt-5">
              <span className="text-text-tertiary type-label">{strings.later}</span>
            </div>
            <div className="flex flex-col gap-2">
              {laterRows.map((row) => (
                <LaterRow
                  key={`${row.trainNumber}-${row.scheduledTime}`}
                  row={row}
                  mode={board.mode}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Mobile < 600px (sheet 11) ──────────────────────────────────────── */}
      <div className="flex flex-col gap-5 min-[600px]:hidden">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 border-b border-line pb-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-text-tertiary">
                <PinIcon />
                <span className="whitespace-nowrap type-label">{strings.currentStation}</span>
              </span>
              <FreshnessDot generatedAt={board.generatedAt} isStale={board.isStale} now={now} />
            </div>
            <div className="flex items-center justify-between gap-2">
              {pickerHref ? (
                <Link href={pickerHref} className="min-w-0 text-text-primary no-underline">
                  {stationTitle}
                </Link>
              ) : (
                stationTitle
              )}
              {favouriteButton}
            </div>
          </div>
          <ModeToggle mode={board.mode} onChange={onSwitchMode} />
        </header>

        {notices}
        {empty}

        {heroRow && <HeroCard row={heroRow} mode={board.mode} originName={board.stationName} />}

        {restRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-tertiary type-label">{listLabel}</span>
              <span className="text-text-tertiary type-tertiary">
                {strings.listCount(restRows.length)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {restRows.map((row) => (
                <CompactRow
                  key={`${row.trainNumber}-${row.scheduledTime}`}
                  row={row}
                  mode={board.mode}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 14.2s4.4-4.7 4.4-7.7a4.4 4.4 0 0 0-8.8 0c0 3 4.4 7.7 4.4 7.7Z" />
      <circle cx="8" cy="6.4" r="1.7" />
    </svg>
  )
}

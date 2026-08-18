'use client'

/**
 * The board screen, purely presentational: `StationBoard` in, pixels out. Desktop layout
 * from sheet 10 (rich rows + "Più tardi"), mobile from sheet 11 (hero card + list),
 * split at 600px like the tokens. Fetching, polling and favourites live in the caller.
 */
import type { BoardMode, BoardRow, StationBoard } from '@tabellone/core'
import Link from 'next/link'
import { useState } from 'react'
import { strings } from '@/strings'
import { BoardSkeleton } from './board-states'
import { MarqueeText } from './marquee-text'
import { FreshnessDot, ModeToggle, pressFeedback, pressScale } from './parts'
import { CompactRow, HeroCard, LaterRow, RichRow } from './rows'
import { rowExitClass, useDepartingRows } from './use-departing-rows'

const RICH_ROW_COUNT = 5

/**
 * The row's identity on the board, and therefore its React key: a train number alone is not
 * one, since the same number runs again the next day and, on a board spanning midnight, can
 * appear twice at once.
 */
const rowKey = (row: BoardRow) => `${row.trainNumber}-${row.scheduledTime}`

export type BoardViewProps = {
  board: StationBoard
  now: Date
  onSwitchMode: (mode: BoardMode) => void
  /** Where the station name leads: the picker. Omit to render a static title (gallery). */
  pickerHref?: string
  /**
   * Mobile only: the station name opens the station-switch bottom sheet instead of
   * navigating to `pickerHref`. On a phone leaving the board to change station throws away
   * the board; desktop keeps the link, where the picker is a comfortable two-column page.
   * Omit and mobile falls back to the same link as desktop.
   */
  onOpenPicker?: () => void
  favourite?: { active: boolean; onToggle: () => void }
  /**
   * A board for this mode is still being fetched — the caller is passing the previous
   * board only for its header. Rows are replaced by placeholders and the freshness label
   * is withheld, because it would describe the *other* mode's read.
   */
  pending?: boolean
}

export function BoardView({
  board,
  now,
  onSwitchMode,
  pickerHref,
  onOpenPicker,
  favourite,
  pending = false,
}: BoardViewProps) {
  const listLabel = board.mode === 'departures' ? strings.nextDepartures : strings.nextArrivals
  const richRows = board.rows.slice(0, RICH_ROW_COUNT)
  const laterRows = board.rows.slice(RICH_ROW_COUNT)
  const [heroRow, ...restRows] = board.rows

  // Three independent lists, three independent holds: a train sliding out of the desktop
  // rich block and into "Più tardi" is a departure from one list and an entry into the other,
  // and each side animates it as such.
  const richEntries = useDepartingRows(richRows, rowKey)
  const laterEntries = useDepartingRows(laterRows, rowKey)
  const restEntries = useDepartingRows(restRows, rowKey)

  // Only the star pops, and only on off→on: gaining a favourite is the event worth
  // confirming, losing one is not.
  const [justFavourited, setJustFavourited] = useState(false)

  const stationTitle = (
    <span className="flex min-w-0 items-center gap-3 uppercase type-title leading-(--type-dominant-leading)">
      {/* A long name scrolls instead of being clipped; the chevron stays put beside it. */}
      <MarqueeText text={board.stationName} className="min-w-0" />
      {pickerHref && (
        <svg
          className="flex-none"
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
      onClick={() => {
        // `active` is the state the toggle is about to leave, so this is the off→on edge.
        if (!favourite.active) setJustFavourited(true)
        favourite.onToggle()
      }}
      aria-pressed={favourite.active}
      title={favourite.active ? strings.unfollow : strings.follow}
      className={`inline-flex flex-none cursor-pointer items-center justify-center rounded-minimal border border-line text-text-secondary transition-[color,border-color,scale] min-h-(--touch-min) min-w-(--touch-min) ${pressScale}`}
      style={favourite.active ? { color: 'var(--state-on-time)' } : undefined}
    >
      {/* The pop sits on the star rather than the whole button: it is the star that changes
          meaning, and this also keeps the keyframe's `transform` clear of the button's
          `:active` `scale`, so a tap during the pop still presses. */}
      <svg
        className={justFavourited ? 'animate-favourite-pop' : undefined}
        onAnimationEnd={() => setJustFavourited(false)}
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

  const freshness = pending ? (
    <span className="flex items-center gap-1 text-text-tertiary type-tertiary">
      <span
        className="animate-data-beat"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--data-absent)',
        }}
      />
      <span>{strings.loading}</span>
    </span>
  ) : (
    <FreshnessDot generatedAt={board.generatedAt} isStale={board.isStale} now={now} />
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
    <div className={!pending && board.isStale ? 'animate-aging' : ''}>
      {/* ── Desktop ≥ 600px (sheet 10) ─────────────────────────────────────── */}
      <div className="mx-auto hidden max-w-(--content-max-width) flex-col gap-8 min-[600px]:flex">
        <header className="flex flex-wrap items-end justify-between gap-8 border-b-2 border-line-strong pb-5">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-2 text-text-tertiary">
              <PinIcon />
              <span className="whitespace-nowrap type-label">{strings.currentStation}</span>
            </span>
            <span className="flex min-w-0 items-center gap-3">
              {pickerHref ? (
                <Link href={pickerHref} className="min-w-0 text-text-primary no-underline">
                  {stationTitle}
                </Link>
              ) : (
                stationTitle
              )}
              {favouriteButton}
            </span>
          </div>
          <div className="flex items-center gap-6">
            {freshness}
            <ModeToggle mode={board.mode} onChange={onSwitchMode} />
          </div>
        </header>

        {!pending && notices}
        {!pending && empty}
        {pending && <BoardSkeleton variant="desktop" />}

        {!pending && richRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4 px-1">
              <span className="whitespace-nowrap text-text-tertiary type-label">{listLabel}</span>
              <span className="whitespace-nowrap text-text-tertiary type-tertiary">
                {strings.listCount(board.rows.length)}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {richEntries.map((entry, index) => (
                <RichRow
                  key={entry.key}
                  row={entry.row}
                  mode={board.mode}
                  originName={board.stationName}
                  motion={{
                    index,
                    exitClass: entry.phase === 'leaving' ? rowExitClass(entry.row) : undefined,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {!pending && laterRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="border-t-2 border-line-strong px-1 pt-5">
              <span className="text-text-tertiary type-label">{strings.later}</span>
            </div>
            <div className="flex flex-col gap-2">
              {laterEntries.map((entry, index) => (
                <LaterRow
                  key={entry.key}
                  row={entry.row}
                  mode={board.mode}
                  motion={{
                    index,
                    exitClass: entry.phase === 'leaving' ? rowExitClass(entry.row) : undefined,
                  }}
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
              {freshness}
            </div>
            <div className="flex items-center justify-between gap-2">
              {onOpenPicker ? (
                <button
                  type="button"
                  onClick={onOpenPicker}
                  aria-haspopup="dialog"
                  className={`min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left text-text-primary ${pressFeedback}`}
                >
                  {stationTitle}
                  <span className="sr-only">{strings.changeStation}</span>
                </button>
              ) : pickerHref ? (
                <Link href={pickerHref} className="min-w-0 flex-1 text-text-primary no-underline">
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

        {!pending && notices}
        {!pending && empty}
        {pending && <BoardSkeleton variant="mobile" />}

        {/* Keyed on the train, not on the slot: the hero is one position, so the only way a
            new train arriving in it can animate is by being a new node. */}
        {!pending && heroRow && (
          <HeroCard
            key={rowKey(heroRow)}
            row={heroRow}
            mode={board.mode}
            originName={board.stationName}
          />
        )}

        {!pending && restRows.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-tertiary type-label">{listLabel}</span>
              <span className="text-text-tertiary type-tertiary">
                {strings.listCount(restRows.length)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {restEntries.map((entry, index) => (
                <CompactRow
                  key={entry.key}
                  row={entry.row}
                  mode={board.mode}
                  motion={{
                    index,
                    exitClass: entry.phase === 'leaving' ? rowExitClass(entry.row) : undefined,
                  }}
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

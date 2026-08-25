'use client'

/**
 * The board screen, purely presentational: `StationBoard` in, pixels out. Fetching, polling
 * and favourites live in the caller.
 *
 * The 2026 signage pass rebuilt the composition around the object it has always been: a
 * board. A plate names the station in expanded caps over a heavy rule; under it the mode
 * switch and the freshness reading; under that a single full-width column of bands, the
 * next train first at plate scale and the rest below it. No cards, no panel floating beside
 * a list, no radius. A departure board is rules and figures, and the two-column dashboard
 * that was here before was a layout borrowed from a product this is not.
 *
 * One tree at every width. The composition is the same everywhere and only the grid inside
 * a band changes, which is what lets a phone and a concourse screen show the same object.
 *
 * The board has exactly one heading (`h1`, the station) and one level under it (`h2`, each
 * list), so the routes that are meant to rank have a document outline.
 */
import { CaretDown, Star } from '@phosphor-icons/react'
import type { BoardMode, BoardRow, StationBoard } from '@tabellone/core'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { iconSize } from '@/components/ui/icon'
import { strings } from '@/strings'
import { BoardRow as Row } from './board-row'
import { BoardSkeleton } from './board-states'
import { MarqueeText } from './marquee-text'
import { FreshnessDot, ModeToggle, pressFeedback, pressScale } from './parts'
import { rowExitClass, useDepartingRows } from './use-departing-rows'

/** How many trains are listed before the rest are grouped under "Più tardi". */
const SOON_ROW_COUNT = 6

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
  /** Where the station name leads: the picker. Omit to render a static title. */
  pickerHref?: string
  /**
   * The station name opens the station-switch sheet instead of navigating. The sheet keeps
   * the board underneath it at every width; the link is the fallback for a board rendered
   * without one.
   */
  onOpenPicker?: () => void
  favourite?: { active: boolean; onToggle: () => void }
  /**
   * A board for this mode is still being fetched — the caller is passing the previous board
   * only for its plate. Rows are replaced by placeholders and the freshness reading is
   * withheld, because it would describe the *other* mode's read.
   */
  pending?: boolean
  /** The board's own plate, so the app header can take the station name over from it. */
  headingRef?: React.Ref<HTMLDivElement>
}

export function BoardView({
  board,
  now,
  onSwitchMode,
  pickerHref,
  onOpenPicker,
  favourite,
  pending = false,
  headingRef,
}: BoardViewProps) {
  const listLabel = board.mode === 'departures' ? strings.nextDepartures : strings.nextArrivals
  const [leadRow, ...restRows] = board.rows
  const soonRows = restRows.slice(0, SOON_ROW_COUNT)
  const laterRows = restRows.slice(SOON_ROW_COUNT)

  // Two independent lists, two independent holds: a train sliding out of the first block and
  // into "Più tardi" is a departure from one list and an entry into the other, and each side
  // animates it as such.
  const soonEntries = useDepartingRows(soonRows, rowKey)
  const laterEntries = useDepartingRows(laterRows, rowKey)

  // Only the star pops, and only on off→on: gaining a favourite is the event worth
  // confirming, losing one is not.
  const [justFavourited, setJustFavourited] = useState(false)

  // Which way the board swapped. Adjusted during render rather than in an effect, so the
  // incoming pane is animated on the same commit that mounts it.
  const seenMode = useRef(board.mode)
  const [swapClass, setSwapClass] = useState('')
  if (seenMode.current !== board.mode) {
    seenMode.current = board.mode
    setSwapClass(board.mode === 'arrivals' ? 'animate-swap-forward' : 'animate-swap-back')
  }

  const plate = (
    <span className="flex min-w-0 items-center gap-3 type-plate">
      {/* A long name scrolls instead of being clipped; the caret stays put beside it. */}
      <MarqueeText text={board.stationName} className="min-w-0" />
      {(pickerHref || onOpenPicker) && (
        <CaretDown
          size={iconSize.header}
          color="var(--nav-affordance)"
          className="flex-none"
          aria-hidden="true"
        />
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
      className={`inline-flex flex-none cursor-pointer items-center justify-center rounded-control border border-line-strong bg-transparent text-text-secondary transition-[color,border-color,scale] min-h-(--touch-min) min-w-(--touch-min) ${pressScale}`}
      style={favourite.active ? { color: 'var(--state-on-time)' } : undefined}
    >
      {/* The pop sits on the star rather than on the whole button: it is the star that
          changes meaning, and this keeps the keyframe's `transform` clear of the button's
          `:active` `scale`, so a tap during the pop still presses. */}
      <span
        className={justFavourited ? 'inline-flex animate-favourite-pop' : 'inline-flex'}
        onAnimationEnd={() => setJustFavourited(false)}
      >
        <Star
          size={iconSize.control}
          weight={favourite.active ? 'fill' : 'regular'}
          aria-hidden="true"
        />
      </span>
      <span className="sr-only">{favourite.active ? strings.unfollow : strings.follow}</span>
    </button>
  )

  const freshness = pending ? (
    <span className="flex items-center gap-2 text-text-tertiary type-figures type-tertiary">
      <span className="animate-data-beat block size-1.5 bg-data-absent" />
      <span>{strings.loading}</span>
    </span>
  ) : (
    <FreshnessDot generatedAt={board.generatedAt} isStale={board.isStale} now={now} />
  )

  const notices = board.notices.length > 0 && (
    <section
      aria-label={strings.notices}
      className="flex flex-col gap-2 border-line-strong border-l-2 bg-surface-raised px-4 py-3"
    >
      {board.notices.map((notice) => (
        <p key={notice} className="m-0 text-text-secondary type-reading">
          {notice}
        </p>
      ))}
    </section>
  )

  const empty = board.rows.length === 0 && (
    <section className="flex flex-col gap-3 border-line border-y py-16">
      <span
        className="type-primary-wide type-wide uppercase"
        style={{ fontWeight: 'var(--weight-max)', letterSpacing: '0.03em' }}
      >
        {strings.emptyBoard}
      </span>
      <p className="m-0 max-w-[46ch] text-text-secondary type-reading">{strings.emptyBoardHint}</p>
    </section>
  )

  return (
    <div
      data-board
      className={`mx-auto flex w-full max-w-(--content-max-width) flex-col ${
        !pending && board.isStale ? 'animate-aging' : ''
      }`}
    >
      {/* THE PLATE. Expanded caps over a heavy rule: the one element on the screen that
          names the place the reader is standing in. */}
      <div
        ref={headingRef}
        className="flex items-end justify-between gap-4 border-line-strong border-b-2 pb-4"
      >
        <h1 className="m-0 min-w-0 flex-1">
          {onOpenPicker ? (
            <button
              type="button"
              onClick={onOpenPicker}
              aria-haspopup="dialog"
              className={`min-w-0 max-w-full cursor-pointer border-0 bg-transparent p-0 text-left text-text-primary ${pressFeedback}`}
            >
              {plate}
              <span className="sr-only">{strings.changeStation}</span>
            </button>
          ) : pickerHref ? (
            <Link
              href={pickerHref}
              className="inline-flex min-w-0 max-w-full text-text-primary no-underline"
            >
              {plate}
            </Link>
          ) : (
            plate
          )}
        </h1>
        {favouriteButton}
      </div>

      {/* The reading strip: which board, and how fresh it is. */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-line border-b py-3">
        <ModeToggle mode={board.mode} onChange={onSwitchMode} />
        {freshness}
      </div>

      {/* One pane per mode. The key remounts it on the switch, which is what makes the
          `both`-filled swap keyframe play; the class decides which side it comes from. */}
      <div key={board.mode} className={`flex flex-col ${swapClass}`}>
        {!pending && notices && <div className="pt-6">{notices}</div>}
        {pending ? (
          <div className="pt-6">
            <BoardSkeleton />
          </div>
        ) : board.rows.length === 0 ? (
          <div className="pt-6">{empty}</div>
        ) : (
          <>
            {leadRow && (
              // Keyed on the train, not on the slot: the lead is one position, so the only
              // way a new train arriving in it can animate is by being a new node.
              <Row
                key={rowKey(leadRow)}
                row={leadRow}
                mode={board.mode}
                originName={board.stationName}
                variant="lead"
              />
            )}

            {soonRows.length > 0 && (
              <section className="flex flex-col">
                <ListHead label={listLabel} count={strings.listCount(board.rows.length)} />
                {soonEntries.map((entry, index) => (
                  <Row
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
              </section>
            )}

            {laterRows.length > 0 && (
              <section className="flex flex-col">
                <ListHead label={strings.later} />
                {laterEntries.map((entry, index) => (
                  <Row
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
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The band that names a block of the board. The one place the spaced-caps label style is
 * used on this screen, which is exactly what theme.css rule 2 reserves it for: a label
 * naming a region («PARTENZE», «PIÙ TARDI»), never a value and never a state.
 */
function ListHead({ label, count }: { label: string; count?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-line-strong border-b bg-surface-pressed px-4 py-2">
      <h2 className="m-0 text-text-secondary type-label">{label}</h2>
      {count && <span className="text-text-tertiary type-figures type-tertiary">{count}</span>}
    </div>
  )
}

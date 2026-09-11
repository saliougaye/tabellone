'use client'

/**
 * One train, alone on the screen: the page a traveller keeps open while waiting (ADR-012).
 * Purely presentational — `StationBoard` plus the row picked out of it in, pixels out. It
 * fetches nothing: the row it draws came from the board's own poll.
 *
 * The same signage language as the board, one step louder, because here there is no column
 * of other trains to read this one against: the plate names the *train* (its headsign)
 * instead of the station, the time is set at the lead row's dominant scale, the platform is
 * the filled block, and the route ladder prints every rung rather than folding its middle.
 *
 * The station has not disappeared — it is the first thing on the page, as the way back to
 * the board, and again as the `here` rung of the ladder.
 *
 * The entrance is staged rather than one fade: this screen is reached a handful of times per
 * wait, and the order it arrives in (where am I · which train · when and from where · the
 * rest of the route) is the order the four blocks answer. Steps are two `--stagger-delay`
 * units apart — the token is sized for the cascade of a dense list, and four semantic blocks
 * want about double that to read as staged at all.
 */
import { CaretLeft } from '@phosphor-icons/react'
import type { BoardRow, StationBoard } from '@tabellone/core'
import Link from 'next/link'
import {
  FreshnessDot,
  PlatformBox,
  pressScale,
  RouteLadder,
  ServiceMark,
} from '@/components/board/parts'
import { iconSize } from '@/components/ui/icon'
import { canonicalBoardPath } from '@/lib/board-routes'
import { displayedTime, statusPresentation } from '@/lib/presentation'
import { staggerDelay } from '@/lib/stagger'
import { strings } from '@/strings'

/** One staged block of the entrance. A position, not a duration: the delay is the token's. */
function Block({
  step,
  className = '',
  blockRef,
  children,
}: {
  step: number
  className?: string
  blockRef?: React.Ref<HTMLDivElement>
  children: React.ReactNode
}) {
  return (
    <div
      ref={blockRef}
      className={`animate-row-entry ${className}`}
      style={{ animationDelay: staggerDelay(step * 2) }}
    >
      {children}
    </div>
  )
}

export function TrainView({
  board,
  row,
  now,
  headingRef,
}: {
  board: StationBoard
  row: BoardRow
  now: Date
  /** The plate, so the app header can take the headsign over once it has scrolled away. */
  headingRef?: React.Ref<HTMLDivElement>
}) {
  const status = statusPresentation(row, board.mode)
  const times = displayedTime(row)
  const cancelled = row.status === 'CANCELLED'
  const boardPath = canonicalBoardPath(board.stationId, board.mode)
  const modeLabel = board.mode === 'arrivals' ? strings.arrivals : strings.departures
  // Same rule as a board row: the state edge is drawn only when the state is exceptional, so
  // a train running normally is marked by nothing.
  const edge =
    status.struck ||
    row.status === 'DELAYED' ||
    row.status === 'PARTIAL' ||
    row.status === 'REROUTED'
      ? status.colorVar
      : null

  return (
    <div
      className={`mx-auto flex w-full max-w-(--content-max-width) flex-col ${
        board.isStale ? 'animate-aging' : ''
      }`}
    >
      {/* WHERE AM I. The way back, and how fresh what follows is: the board's own reading
          strip, with the mode toggle replaced by the return link — a train belongs to one of
          the two boards and cannot be switched over to the other. */}
      <Block
        step={0}
        // Wraps like the board's own reading strip: at 390px the station name and the
        // freshness reading do not fit on one line, and the name truncating to make room for
        // a timestamp would be the wrong thing to give up.
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-line border-b py-3"
      >
        <Link
          href={boardPath}
          className={`inline-flex min-w-0 items-center gap-2 text-text-secondary no-underline transition-[color,scale] type-label hover:text-text-primary min-h-(--touch-min) ${pressScale}`}
        >
          <CaretLeft size={iconSize.meta} aria-hidden="true" className="flex-none" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {board.stationName} · {modeLabel}
          </span>
          <span className="sr-only">{strings.backToBoard}</span>
        </Link>
        <FreshnessDot generatedAt={board.generatedAt} isStale={board.isStale} now={now} />
      </Block>

      {/* WHICH TRAIN. The plate, and under it the mark and the number that name it. */}
      <Block
        step={1}
        blockRef={headingRef}
        className="flex flex-col gap-4 border-line-strong border-b-2 pt-6 pb-4"
      >
        <h1
          className="m-0 uppercase type-plate"
          style={{
            color: cancelled ? 'var(--text-tertiary)' : undefined,
            textDecoration: status.struck ? 'line-through' : 'none',
          }}
        >
          {row.headsign}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex min-w-0 items-center gap-(--mark-gap)">
            <ServiceMark row={row} cancelled={cancelled} />
            <span className="text-text-secondary type-figures type-secondary">
              {row.trainNumber}
            </span>
          </span>
          <span className="text-text-tertiary type-label">
            {board.mode === 'arrivals' ? strings.trainArrival : strings.trainDeparture}{' '}
            {board.stationName}
          </span>
        </div>
      </Block>

      {/* WHEN, AND FROM WHERE. The two figures the wait is actually about. */}
      <Block
        step={2}
        className={`border-line border-b ${
          row.blinking || row.status === 'IMMINENT' ? 'animate-halo-pulse' : ''
        }`}
      >
        <div
          className="grid items-start gap-x-6 gap-y-5 py-6"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            ...(edge
              ? {
                  boxShadow: `inset var(--identity-width) 0 0 0 ${edge}`,
                  paddingLeft: 'var(--row-padding-x)',
                }
              : {}),
          }}
        >
          <span className="flex min-w-0 flex-col gap-1">
            {times.replacedTime && (
              <span className="text-text-tertiary line-through type-figures type-tertiary">
                {times.replacedTime}
              </span>
            )}
            <span
              className="type-dominant"
              style={{
                color: cancelled
                  ? 'var(--text-tertiary)'
                  : row.status === 'DELAYED'
                    ? status.colorVar
                    : 'var(--text-primary)',
                textDecoration: status.struck ? 'line-through' : 'none',
              }}
            >
              {times.time}
            </span>
            <span
              className="type-figures type-secondary"
              style={{ color: status.colorVar, fontWeight: status.weightVar }}
            >
              {status.label}
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1.5">
            <span className="text-text-tertiary type-label">{strings.platform}</span>
            <PlatformBox platform={row.platform} large />
          </span>
        </div>
      </Block>

      {/* THE REST OF THE ROUTE. Every rung: this page is one train, there is nothing to
          protect the reader from. */}
      {row.viaStops.length > 0 && (
        <Block step={3} className="border-line border-b py-6">
          <RouteLadder
            originName={board.stationName}
            originTime={times.time}
            viaStops={row.viaStops}
            mode={board.mode}
            cancelled={cancelled}
            startExpanded
          />
        </Block>
      )}

      {board.notices.length > 0 && (
        <Block step={3} className="pt-6">
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
        </Block>
      )}
    </div>
  )
}

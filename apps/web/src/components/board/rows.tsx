'use client'

/**
 * The four row shapes of the board, from design sheets 10–11: the desktop rich row
 * (time · center · route · platform, expandable), the desktop "later" compact row, the
 * mobile hero card and the mobile list row. All purely presentational: `BoardRow` in,
 * pixels out — the row knows nothing about fetching or polling.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'
import { type ReactNode, useState } from 'react'
import { displayedTime, statusPresentation } from '@/lib/presentation'
import { useRolledValue } from '@/lib/use-rolled-value'
import { strings } from '@/strings'
import { PlatformBox, pressFeedback, RouteStrip, ServiceMark, StopsDetail } from './parts'

/**
 * How a row animates on and off the board. Entry needs no state — a row whose key was not
 * in the previous render is a new DOM node, so the keyframe plays on its first paint — but
 * it does need to know where in the list it is, so the cascade staggers. Exit is the
 * opposite: it only exists because `useDepartingRows` held the row back, and the class it
 * comes with encodes which of the two exits (departed / cancelled) this row leaves by.
 */
export type RowMotion = {
  /** Position in its list: staggers the entry keyframe by `--stagger-delay`. */
  index?: number
  /** Set while the row is on its way off the board; replaces the entry animation. */
  exitClass?: string
}

/**
 * The one element that carries the entry/exit keyframe, wrapping rather than sharing the
 * row's own box: `animate-halo-pulse` compiles to the same `animation` shorthand, so a
 * blinking row would keep only whichever of the two classes Tailwind happened to emit last.
 * One animation per element, no ordering to depend on.
 */
function MotionRow({ motion, children }: { motion?: RowMotion; children: ReactNode }) {
  const exiting = motion?.exitClass
  return (
    <div
      // A row fading out is still under the finger for 320ms; it must not answer a tap it
      // no longer has data behind.
      className={exiting ? `${exiting} pointer-events-none` : 'animate-row-entry'}
      style={
        exiting
          ? undefined
          : { animationDelay: `calc(var(--stagger-delay) * ${motion?.index ?? 0})` }
      }
    >
      {children}
    </div>
  )
}

function rowView(row: BoardRow, mode: BoardMode) {
  const status = statusPresentation(row, mode)
  const times = displayedTime(row)
  const cancelled = row.status === 'CANCELLED'
  const imminent = row.status === 'IMMINENT'
  return {
    status,
    times,
    cancelled,
    imminent,
    timeColor: cancelled
      ? 'var(--text-tertiary)'
      : row.status === 'DELAYED'
        ? status.colorVar
        : 'var(--text-primary)',
    headsignColor: cancelled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    strike: status.struck ? 'line-through' : 'none',
    borderClass: imminent || row.blinking ? 'border-line-strong' : 'border-line',
    haloClass: row.blinking ? 'animate-halo-pulse' : '',
  }
}

/** Desktop rich row: four zones, click opens the "Ferma a" detail. */
export function RichRow({
  row,
  mode,
  originName,
  motion,
}: {
  row: BoardRow
  mode: BoardMode
  originName: string
  motion?: RowMotion
}) {
  const [open, setOpen] = useState(false)
  const v = rowView(row, mode)
  const rolled = useRolledValue(row.delayMinutes)

  return (
    <MotionRow motion={motion}>
      <div
        className={`rounded-minimal border bg-surface-raised transition-[border-color] ${v.borderClass} ${v.haloClass}`}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`grid w-full cursor-pointer items-center text-left ${pressFeedback}`}
          style={{
            gridTemplateColumns: 'var(--rich-row-columns)',
            gap: 'var(--rich-row-gap)',
            padding: 'var(--rich-row-padding)',
          }}
        >
          <div className="flex min-w-0 flex-col gap-2">
            {v.times.replacedTime && (
              <span className="text-text-tertiary line-through type-secondary">
                {v.times.replacedTime}
              </span>
            )}
            {/* key, not just the class: --anim-value-* is a `both`-filled keyframe, so it
              only plays on a node React has just mounted. */}
            <span
              key={rolled.key}
              className={`type-dominant ${rolled.className}`}
              style={{ color: v.timeColor, textDecoration: v.strike }}
            >
              {v.times.time}
            </span>
            <span
              className="min-h-[18px] type-secondary"
              style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
            >
              {v.status.label}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <span
              className="overflow-hidden text-ellipsis whitespace-nowrap type-primary-wide"
              style={{
                color: v.headsignColor,
                fontWeight: 'var(--weight-max)',
                textDecoration: v.strike,
              }}
            >
              {row.headsign}
            </span>
            <div className="flex min-w-0 items-center gap-(--mark-gap)">
              <ServiceMark row={row} cancelled={v.cancelled} />
              <span className="whitespace-nowrap text-text-tertiary type-tertiary">
                {row.trainNumber}
              </span>
            </div>
          </div>

          <div className="min-w-0" style={{ display: 'var(--route-visibility)' }}>
            {row.viaStops.length > 0 && (
              <RouteStrip originName={originName} viaStops={row.viaStops} cancelled={v.cancelled} />
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-text-tertiary type-label">{strings.platform}</span>
            <PlatformBox platform={row.platform} large />
          </div>
        </button>

        {open && row.viaStops.length > 0 && <StopsDetail viaStops={row.viaStops} mode={mode} />}
      </div>
    </MotionRow>
  )
}

/**
 * Desktop "Più tardi" row: schedule, headsign, mark, platform digit — nothing else.
 * No value roll here on purpose: this is already the least prominent shape on the board and
 * its time is secondary information, not worth remounting a digit for.
 */
export function LaterRow({
  row,
  mode,
  motion,
}: {
  row: BoardRow
  mode: BoardMode
  motion?: RowMotion
}) {
  const v = rowView(row, mode)
  return (
    <MotionRow motion={motion}>
      <div
        className="grid items-center rounded-minimal border border-line bg-surface-raised px-6 py-4"
        style={{ gridTemplateColumns: 'var(--compact-row-columns)', gap: 'var(--rich-row-gap)' }}
      >
        <span
          className="type-primary"
          style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}
        >
          {v.times.time}
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <span
            className="type-primary"
            style={{
              fontWeight: 'var(--weight-strong)',
              color: v.headsignColor,
              textDecoration: v.strike,
            }}
          >
            {row.headsign}
          </span>
          <div className="flex items-center gap-(--mark-gap)">
            <ServiceMark row={row} cancelled={v.cancelled} />
            <span className="text-text-tertiary type-tertiary">{row.trainNumber}</span>
          </div>
        </div>
        <div className="flex items-baseline justify-end gap-2">
          <span className="text-text-tertiary type-label">{strings.platformShort}</span>
          <PlatformBox platform={row.platform} />
        </div>
      </div>
    </MotionRow>
  )
}

/**
 * Mobile hero: the next train, in a card with the route strip and the halo pulse.
 * A single slot rather than a list, so it takes no stagger and no exit: a train leaving the
 * hero position is a different train arriving in it, which the caller expresses by keying
 * the card on train identity — the key change remounts the card and the entry keyframe
 * plays, crossfading one train into the next.
 */
export function HeroCard({
  row,
  mode,
  originName,
}: {
  row: BoardRow
  mode: BoardMode
  originName: string
}) {
  const v = rowView(row, mode)
  const rolled = useRolledValue(row.delayMinutes)
  const last = row.viaStops.at(-1)
  return (
    <MotionRow>
      <section
        className={`relative flex flex-col gap-4 overflow-hidden rounded-minimal border border-line-strong bg-surface-raised px-4 py-5 ${v.haloClass}`}
      >
        <svg
          viewBox="0 0 16 16"
          width="230"
          height="230"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute opacity-5"
          style={{ right: '-54px', bottom: '-66px' }}
          aria-hidden="true"
        >
          <path d="M2 10.6V7.1L6.2 4.4h7.3v6.2H2zM8.9 4.5v6.1M1.5 13h13" />
        </svg>

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-(--mark-gap)">
              <ServiceMark row={row} cancelled={v.cancelled} />
              <span className="whitespace-nowrap text-text-tertiary type-tertiary">
                {row.trainNumber}
              </span>
            </div>
            <span
              className="type-primary"
              style={{
                fontWeight: 'var(--weight-max)',
                color: v.headsignColor,
                textDecoration: v.strike,
              }}
            >
              {row.headsign}
            </span>
          </div>
          <div className="flex flex-none flex-col items-end gap-1">
            {v.times.replacedTime && (
              <span className="text-text-tertiary line-through type-secondary">
                {v.times.replacedTime}
              </span>
            )}
            <span
              key={rolled.key}
              className={`type-dominant ${rolled.className}`}
              style={{ color: v.timeColor }}
            >
              {v.times.time}
            </span>
            <span
              className="type-secondary"
              style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
            >
              {v.status.label}
            </span>
          </div>
        </div>

        {row.viaStops.length > 0 && (
          <RouteStrip originName={originName} viaStops={row.viaStops} cancelled={v.cancelled} />
        )}

        <div className="relative flex items-end justify-between gap-4 border-t border-line pt-3">
          <div className="flex flex-col gap-2">
            <span className="text-text-tertiary type-label">{strings.platform}</span>
            <PlatformBox platform={row.platform} large />
          </div>
          {last && (
            <div className="flex flex-col items-end gap-2">
              <span className="text-text-tertiary type-label">
                {mode === 'departures' ? strings.terminusArrival : strings.terminusDeparted}
              </span>
              <span
                className="type-primary"
                style={{ fontWeight: 'var(--weight-strong)', color: 'var(--text-secondary)' }}
              >
                {v.cancelled ? strings.platformUnassigned : lastTime(row)}
              </span>
            </div>
          )}
        </div>
      </section>
    </MotionRow>
  )
}

function lastTime(row: BoardRow): string {
  const last = row.viaStops.at(-1)
  // last.time is a bare "HH:MM" as RFI printed it in the popup — no serviceDate to anchor it
  // to (types.ts), so it isn't an ISO instant and must not go through formatTime.
  return last ? last.time : strings.platformUnassigned
}

/** Mobile list row: two bands, expandable "Ferma a" detail. */
export function CompactRow({
  row,
  mode,
  motion,
}: {
  row: BoardRow
  mode: BoardMode
  motion?: RowMotion
}) {
  const [open, setOpen] = useState(false)
  const v = rowView(row, mode)
  const rolled = useRolledValue(row.delayMinutes)
  return (
    <MotionRow motion={motion}>
      <div className={`rounded-minimal border bg-surface-raised ${v.borderClass} ${v.haloClass}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`grid w-full cursor-pointer items-center gap-3 text-left min-h-(--touch-min) ${pressFeedback}`}
          style={{
            gridTemplateColumns: 'var(--column-countdown) minmax(0, 1fr) auto',
            padding: 'var(--row-padding-y) var(--row-padding-x)',
          }}
        >
          <div className="flex flex-col gap-1">
            {v.times.replacedTime && (
              <span className="text-text-tertiary line-through type-tertiary">
                {v.times.replacedTime}
              </span>
            )}
            <span
              key={rolled.key}
              className={`type-primary ${rolled.className}`}
              style={{
                fontWeight: 'var(--weight-max)',
                color: v.timeColor,
                textDecoration: v.strike,
              }}
            >
              {v.times.time}
            </span>
            <span
              className="type-tertiary"
              style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
            >
              {v.status.label}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className="overflow-hidden text-ellipsis whitespace-nowrap type-primary"
              style={{
                fontWeight: 'var(--weight-strong)',
                color: v.headsignColor,
                textDecoration: v.strike,
              }}
            >
              {row.headsign}
            </span>
            <div className="flex min-w-0 items-center gap-(--mark-gap)">
              <ServiceMark row={row} cancelled={v.cancelled} />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-text-tertiary type-tertiary">
                {row.trainNumber}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-text-tertiary type-label">{strings.platformShort}</span>
            <PlatformBox platform={row.platform} />
          </div>
        </button>
        {open && row.viaStops.length > 0 && <StopsDetail viaStops={row.viaStops} mode={mode} />}
      </div>
    </MotionRow>
  )
}

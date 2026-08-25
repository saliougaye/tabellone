'use client'

/**
 * The board's row, in one implementation, in the signage language.
 *
 * The row is not a card. It is a band on a board, bounded by a rule and by the row above
 * it, and everything that used to be a container here — the border on four sides, the
 * radius, the raised surface — is gone. What separates two trains is a 1px line, the same
 * device the printed boards use, and what makes the row read is the mono time on the left
 * and the platform block on the right.
 *
 * Two shapes, one implementation:
 * - `lead`   the next train, at plate scale: the time set large, the route drawn, the
 *            platform as a filled block. One per board, and it is the first band of the
 *            board rather than a panel floating above it.
 * - `row`    every other train, one band each, expandable to its stops.
 *
 * Nothing here fetches or polls: `BoardRow` in, pixels out.
 */
import { CaretDown } from '@phosphor-icons/react'
import type { BoardMode, BoardRow as BoardRowData } from '@tabellone/core'
import { useState } from 'react'
import { iconSize } from '@/components/ui/icon'
import { displayedTime, statusPresentation } from '@/lib/presentation'
import { staggerDelay } from '@/lib/stagger'
import { useRolledValue } from '@/lib/use-rolled-value'
import { strings } from '@/strings'
import { PlatformBox, pressFeedback, RouteStrip, ServiceMark, StopsDetail } from './parts'

export type RowVariant = 'lead' | 'row'

/**
 * How a row animates on and off the board. Entry needs no state — a row whose key was not
 * in the previous render is a new DOM node, so the keyframe plays on its first paint — but
 * it does need to know where in the list it is, so the cascade staggers (capped:
 * `staggerDelay`). Exit is the opposite: it only exists because `useDepartingRows` held the
 * row back, and the class it comes with encodes which of the two exits this row leaves by.
 */
export type RowMotion = {
  index?: number
  exitClass?: string
}

/**
 * The one element carrying the entry or exit keyframe, wrapping the row rather than sharing
 * its box: `animate-halo-pulse` compiles to the same `animation` shorthand, so a pulsing row
 * would keep only whichever of the two classes Tailwind happened to emit last. One animation
 * per element, no ordering to depend on.
 */
function MotionRow({ motion, children }: { motion?: RowMotion; children: React.ReactNode }) {
  const exiting = motion?.exitClass
  return (
    <div
      // A row fading out is still under the finger for 380ms; it must not answer a tap it no
      // longer has data behind.
      className={exiting ? `${exiting} pointer-events-none` : 'animate-row-entry'}
      style={exiting ? undefined : { animationDelay: staggerDelay(motion?.index ?? 0) }}
    >
      {children}
    </div>
  )
}

/** Everything both shapes derive from the row's status, in one place. */
function rowView(row: BoardRowData, mode: BoardMode) {
  const status = statusPresentation(row, mode)
  const cancelled = row.status === 'CANCELLED'
  return {
    status,
    times: displayedTime(row),
    cancelled,
    timeColor: cancelled
      ? 'var(--text-tertiary)'
      : row.status === 'DELAYED'
        ? status.colorVar
        : 'var(--text-primary)',
    headsignColor: cancelled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    strike: status.struck ? ('line-through' as const) : ('none' as const),
    haloClass: row.blinking || row.status === 'IMMINENT' ? 'animate-halo-pulse' : '',
    /**
     * The state edge: a 3px rule down the left of the band in the state's own colour, drawn
     * only when the state is exceptional. On a board the unusual row is marked at the edge,
     * where an eye scanning the column of times passes anyway; a train running normally is
     * marked by nothing, which is what normal should look like.
     */
    edge:
      status.struck ||
      row.status === 'DELAYED' ||
      row.status === 'PARTIAL' ||
      row.status === 'REROUTED'
        ? status.colorVar
        : null,
  }
}

export function BoardRow({
  row,
  mode,
  originName,
  variant = 'row',
  motion,
}: {
  row: BoardRowData
  mode: BoardMode
  /** This station: the origin dot of the route strip. Only read by the lead shape. */
  originName: string
  variant?: RowVariant
  motion?: RowMotion
}) {
  const [open, setOpen] = useState(false)
  const v = rowView(row, mode)
  const rolled = useRolledValue(row.delayMinutes)
  const lead = variant === 'lead'
  const expandable = row.viaStops.length > 0

  const time = (
    <span className="flex min-w-0 flex-col gap-1">
      {v.times.replacedTime && (
        <span className="text-text-tertiary line-through type-figures type-tertiary">
          {v.times.replacedTime}
        </span>
      )}
      {/* `key`, not just the class: --anim-value-* are `both`-filled keyframes, so they only
          play on a node React has just mounted. */}
      <span
        key={rolled.key}
        className={`${lead ? 'type-dominant' : 'type-figures type-primary'} ${rolled.className}`}
        style={{
          color: v.timeColor,
          textDecoration: v.strike,
          fontWeight: lead ? undefined : 'var(--weight-strong)',
          transition: 'var(--motion-worsening)',
        }}
      >
        {v.times.time}
      </span>
      <span
        className={`type-figures ${lead ? 'type-secondary' : 'type-tertiary'}`}
        style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
      >
        {v.status.label}
      </span>
    </span>
  )

  const identity = (
    <span className="flex min-w-0 flex-col gap-2">
      <span
        className={`overflow-hidden text-ellipsis whitespace-nowrap uppercase ${
          lead ? 'type-primary-wide type-wide' : 'type-primary'
        }`}
        style={{
          color: v.headsignColor,
          fontWeight: 'var(--weight-max)',
          letterSpacing: lead ? '0.03em' : '0.01em',
          textDecoration: v.strike,
        }}
      >
        {row.headsign}
      </span>
      <span className="flex min-w-0 items-center gap-(--mark-gap)">
        <ServiceMark row={row} cancelled={v.cancelled} />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-text-tertiary type-figures type-tertiary">
          {row.trainNumber}
        </span>
      </span>
    </span>
  )

  const platform = (
    <span className="flex flex-none flex-col items-end gap-1.5">
      <span className="text-text-tertiary type-label">
        {lead ? strings.platform : strings.platformShort}
      </span>
      <PlatformBox platform={row.platform} large={lead} />
    </span>
  )

  const body = (
    <div
      className={`grid w-full items-start text-left ${lead ? 'gap-x-6 gap-y-5' : 'gap-x-5 gap-y-2'}`}
      style={{
        gridTemplateColumns: lead
          ? 'minmax(0, 1fr) auto'
          : 'minmax(var(--column-countdown), max-content) minmax(0, 1fr) auto',
        gridTemplateAreas: lead ? '"time platform" "identity platform" "route route"' : undefined,
      }}
    >
      {lead ? (
        <>
          <div style={{ gridArea: 'time' }} className="min-w-0">
            {time}
          </div>
          <div style={{ gridArea: 'platform' }} className="self-start">
            {platform}
          </div>
          <div style={{ gridArea: 'identity' }} className="min-w-0">
            {identity}
          </div>
          {expandable && (
            <div style={{ gridArea: 'route' }} className="min-w-0">
              <RouteStrip originName={originName} viaStops={row.viaStops} cancelled={v.cancelled} />
            </div>
          )}
        </>
      ) : (
        <>
          {time}
          {identity}
          <span className="flex items-center gap-3">
            {platform}
            {expandable && (
              <CaretDown
                size={iconSize.meta}
                color="var(--nav-affordance)"
                aria-hidden="true"
                className="flex-none"
                style={{
                  transition: 'var(--motion-header)',
                  transform: open ? 'rotate(180deg)' : 'none',
                }}
              />
            )}
          </span>
        </>
      )}
    </div>
  )

  // `border-b` only: the rule below a row is the rule above the next one, and a list where
  // every row draws both is a list of boxes wearing a table's clothes.
  const padding = lead
    ? 'var(--sp-5) var(--sp-5) var(--sp-6)'
    : 'var(--row-padding-y) var(--row-padding-x)'
  const edgeStyle = v.edge
    ? { boxShadow: `inset var(--identity-width) 0 0 0 ${v.edge}` }
    : undefined

  return (
    <MotionRow motion={motion}>
      <div className={`border-line border-b ${v.haloClass}`} style={edgeStyle}>
        {expandable && !lead ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={`w-full cursor-pointer border-0 bg-transparent text-left hover:bg-surface-pressed min-h-(--touch-min) ${pressFeedback}`}
            style={{ padding, transition: 'var(--motion-state)' }}
          >
            {body}
          </button>
        ) : (
          <div className="min-h-(--touch-min)" style={{ padding }}>
            {body}
          </div>
        )}
        {open && expandable && <StopsDetail viaStops={row.viaStops} mode={mode} />}
      </div>
    </MotionRow>
  )
}

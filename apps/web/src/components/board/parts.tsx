'use client'

/**
 * Small board parts, straight from design sheets 01–02: service mark (logo slot + operator
 * tile), platform box (the three states of ANCHOR C), freshness dot, mode toggle and the
 * route ladder.
 */
import type { BoardMode, BoardRow, Platform, ViaStop } from '@tabellone/core'
import { type CSSProperties, Fragment, useEffect, useRef, useState } from 'react'
import {
  categoryStyle,
  freshnessLabel,
  operatorMark,
  serviceLabel,
  serviceMarkLabel,
} from '@/lib/presentation'
import { strings } from '@/strings'
import { brandLogoInk, brandLogos } from './brand-logos'

/**
 * Touch feedback for every control on the board. `--duration-instant` is documented as
 * covering "screen change, data heartbeat, touch states", so this needs no token of its own,
 * and it already collapses to 1ms under `prefers-reduced-motion`.
 *
 * No JS: `:active` is enough because every control that carries this is a `<button>` with an
 * `onClick`, which is precisely what makes iOS Safari fire `:active` on a tap at all.
 *
 * Two exports because `transition-property` is one declaration: a control that already
 * transitions its colours cannot also be given `transition-transform` — the two classes
 * would fight and the cascade, not the code, would pick a winner. Such a control names
 * `scale` in its own `transition-[…]` list and takes `pressScale` alone. `scale`, not
 * `transform`: Tailwind's `scale-*` compiles to the independent `scale` property, so a list
 * naming only `transform` transitions nothing and the press would snap.
 */
export const pressScale = 'duration-(--duration-instant) ease-standard active:scale-[0.97]'
/** Complete press feedback for a control that transitions nothing else. */
export const pressFeedback = `transition-transform ${pressScale}`

/**
 * What the traveller identifies the train by, in two halves: the brand's logo (or, with no
 * asset for it, the service name as text) in the capped slot of `theme.css` §7, then the
 * operator tile. Two halves because they answer two questions — *which service* and
 * *who runs it* — and a "Regionale" is a different train depending on the second.
 *
 * The slot is capped, not fixed, so a mark sits next to its tile instead of being padded
 * out to a common width — marks here range from 1.30:1 to 3.02:1, and a common width put
 * a 59px hole beside the squarest of them. The cost is that the tile no longer lands at
 * the same x down the column; the gain is that the two halves read as one mark.
 */
export function ServiceMark({ row, cancelled = false }: { row: BoardRow; cancelled?: boolean }) {
  const mark = operatorMark[row.operator] ?? operatorMark.OTHER
  const Logo = row.brand ? brandLogos[row.brand] : undefined
  const ink = (row.brand && brandLogoInk[row.brand]) || { primary: 'var(--identity-mono)' }
  const text = categoryStyle[row.category] ?? categoryStyle.OTHER
  // A two-tone mark declares its second fill as var(--logo-ink-2, currentColor), so
  // leaving the property unset on a cancelled row mutes both halves at once.
  const logoStyle = {
    color: cancelled ? 'var(--text-tertiary)' : ink.primary,
    ...(cancelled || !ink.secondary ? {} : { '--logo-ink-2': ink.secondary }),
  } as CSSProperties

  return (
    // One image, one name: the slot and the tile are announced together, so neither the
    // logo nor the sigla is read out on its own.
    <span
      role="img"
      aria-label={serviceMarkLabel(row)}
      className="inline-flex min-w-0 flex-none items-center gap-(--mark-gap)"
    >
      {/* The slot caps the mark rather than padding it out to a fixed width. §7 sized it
          fixed so "layout does not depend on an image arriving" — but nothing arrives here,
          the assets are inline SVG, so the only thing a fixed width still bought was tile
          alignment down the column, and it cost a 59px hole beside a near-square mark like
          Trenord's (29px wide at 22px tall against an 88px box). */}
      <span
        className="inline-flex min-w-0 flex-none items-center justify-start overflow-hidden"
        style={{ maxWidth: 'var(--logo-width)', height: 'var(--logo-height)' }}
      >
        {Logo ? (
          // States always beat identity — but by muting the slot, not by repainting it
          // --state-cancelled. The tile beside it already carries that colour, and on a
          // Trenitalia row --state-cancelled and --identity-trenitalia are the same red to
          // the eye, so a red logo next to a red tile would read as branding, not as a
          // cancellation. Muted is the same treatment the text fallback gets below.
          // max-* on both axes, against the intrinsic size each mark declares: the SVG
          // then scales down under whichever limit bites first and keeps its ratio. Forcing
          // height and clamping width instead would squash a wide wordmark.
          <Logo className="max-h-full max-w-full" style={logoStyle} />
        ) : (
          <span
            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              fontSize: 'var(--logo-fallback-size)',
              fontWeight: cancelled ? 'var(--logo-fallback-weight)' : text.weightVar,
              letterSpacing: 'var(--logo-fallback-tracking)',
              color: cancelled ? 'var(--text-tertiary)' : text.colorVar,
            }}
          >
            {serviceLabel(row)}
          </span>
        )}
      </span>
      <span
        className="inline-flex flex-none items-center justify-center overflow-hidden whitespace-nowrap rounded-badge text-mark-ink"
        style={{
          width: 'var(--mark-width)',
          height: 'var(--mark-height)',
          background: cancelled ? 'var(--state-cancelled)' : mark.colorVar,
          fontSize: 'var(--mark-size)',
          fontWeight: 'var(--mark-weight)',
          letterSpacing: 'var(--mark-tracking)',
        }}
      >
        {mark.sigla}
      </span>
    </span>
  )
}

/**
 * Unassigned is distinct from unknown (CONTEXT.md): a platform object with no value at
 * all renders the muted dash; a scheduled value renders outlined; a confirmed one flips
 * to the inverted solid block — the app's single overshoot animation.
 */
export function PlatformBox({ platform, large = false }: { platform: Platform; large?: boolean }) {
  const value = platform.actual ?? platform.scheduled
  const base = 'inline-flex items-center justify-center type-figures leading-none'
  const sizeStyle = {
    // --motion-platform-confirm (§6.4): the outline-to-solid change is a state transition,
    // and it is declared once in the token rather than re-listed per call site.
    transition: 'var(--motion-platform-confirm)',
    minWidth: large ? '72px' : 'var(--platform-min-width)',
    minHeight: large ? undefined : 'var(--platform-height)',
    padding: large ? 'var(--sp-2) var(--sp-3)' : 'var(--sp-1) var(--sp-2)',
    fontSize: large ? 'var(--type-dominant-size)' : 'var(--type-primary-size)',
    fontWeight: 'var(--weight-max)',
    letterSpacing: large ? 'var(--type-dominant-tracking)' : 'var(--type-primary-tracking)',
    lineHeight: 1.05,
  } as const

  if (value === null) {
    return (
      <span
        className={`${base} text-platform-absent-text`}
        // A platform digit is set at the level it is read from across a concourse; the words
        // that stand for its absence are not, and at that size they would break the box.
        style={{
          ...sizeStyle,
          fontSize: 'var(--type-secondary-size)',
          letterSpacing: 'var(--type-secondary-tracking)',
          fontWeight: 'var(--weight-medium)',
        }}
      >
        {strings.platformUnassigned}
      </span>
    )
  }
  if (platform.isConfirmed) {
    return (
      <span
        className={`${base} animate-platform-confirm bg-platform-confirmed-surface text-platform-confirmed-text`}
        style={sizeStyle}
      >
        {value}
      </span>
    )
  }
  return (
    <span
      className={`${base} text-platform-scheduled-text`}
      style={{
        ...sizeStyle,
        boxShadow: 'inset 0 0 0 var(--line-width) var(--platform-scheduled-line)',
      }}
    >
      {value}
    </span>
  )
}

export function FreshnessDot({
  generatedAt,
  isStale,
  now,
}: {
  generatedAt: string
  isStale: boolean
  now: Date
}) {
  return (
    // A square marker, not a dot: nothing on this board is round, and the beat reads the
    // same either way. It stops beating when the data goes stale, which is the only reason
    // the marker exists.
    <span className="flex items-center gap-2 text-text-tertiary type-figures type-tertiary">
      <span
        className={isStale ? '' : 'animate-data-beat'}
        style={{
          width: '6px',
          height: '6px',
          background: isStale ? 'var(--data-stale)' : 'var(--data-fresh)',
        }}
      />
      <span>{freshnessLabel(generatedAt, isStale, now)}</span>
    </span>
  )
}

/**
 * No icons. A real board names its two halves in words, in caps, and an arrow glyph beside
 * «PARTENZE» adds nothing a reader of a departure board did not already know.
 */
const modeSegments: Array<{ mode: BoardMode; label: string }> = [
  { mode: 'departures', label: strings.departures },
  { mode: 'arrivals', label: strings.arrivals },
]

/**
 * The two-segment departures/arrivals switch. The active segment's surface is not painted on
 * the segment itself but on a single pill sliding behind both, so the switch reads as one
 * control moving rather than two independently repainting.
 *
 * `left`/`width` rather than `translateX(100%)`: the segments are only equal width below
 * 600px (`flex-1`); on desktop each is as wide as its own label, so there is no percentage
 * that lands on both breakpoints. So the pill is measured off the active button and synced
 * with a `ResizeObserver` — the same measure-and-sync shape `MarqueeText` already uses.
 *
 * Until that first measurement lands the active segment keeps painting its own background,
 * which is what the toggle looked like before the pill existed: server-rendered markup and
 * the first client paint are identical, and the pill takes over in the same commit that
 * removes the background, at exactly the geometry it was already drawn at.
 */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: BoardMode
  onChange: (mode: BoardMode) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const segments = useRef<Array<HTMLButtonElement | null>>([])
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  const activeIndex = modeSegments.findIndex((segment) => segment.mode === mode)

  useEffect(() => {
    const box = container.current
    const button = segments.current[activeIndex]
    if (!box || !button) return
    const measure = () => {
      // offsetLeft is relative to the offsetParent, which is the container: it is the only
      // positioned ancestor here, and the pill is positioned against the same box.
      const width = button.offsetWidth
      // No box at all: this is the copy of the toggle on the far side of the 600px
      // breakpoint. A pill measured at zero width would be a switch with nothing lit, so
      // report nothing and let the active segment paint its own background until the toggle
      // is on screen again.
      setPill(width > 0 ? { left: button.offsetLeft, width } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(button)
    // ResizeObserver skips an element with no box, so it cannot report the one change that
    // matters most here: the breakpoint being crossed, which is exactly when this toggle goes
    // from `display: none` to laid out. The window listener covers that.
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeIndex])

  return (
    <div ref={container} className="relative flex overflow-hidden border border-line-strong">
      {pill && (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 bg-surface-inverse transition-[left,width] duration-(--duration-instant) ease-standard"
          style={{ left: `${pill.left}px`, width: `${pill.width}px` }}
        />
      )}
      {modeSegments.map((segment, index) => {
        const active = segment.mode === mode
        return (
          <button
            key={segment.mode}
            ref={(node) => {
              segments.current[index] = node
            }}
            type="button"
            onClick={() => onChange(segment.mode)}
            aria-pressed={active}
            // `relative`: the pill is absolutely positioned, so it would otherwise paint over
            // the label instead of behind it.
            className={`relative inline-flex flex-1 min-[600px]:flex-none cursor-pointer items-center justify-center gap-2 px-6 py-2.5 type-secondary uppercase tracking-(--track-label) transition-[color,scale] min-h-(--touch-min) ${pressScale} ${
              active
                ? `text-text-inverse ${pill ? '' : 'bg-surface-inverse'}`
                : 'text-text-secondary'
            }`}
            style={{ fontWeight: active ? 'var(--weight-max)' : 'var(--weight-medium)' }}
          >
            <span className="type-wide">{segment.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * THE ROUTE, as a ladder.
 *
 * This replaces the two things the board used to do with a train's stops, both of which
 * were the same mistake made twice: the lead row drew a horizontal rail with three-letter
 * siglas under it (a route only its author could read: BOL, FIR, MIL, and eleven stops
 * crushed into a phone's width), and an expanded row printed the stops as a wrapping run of
 * name-plus-time pairs, which is a paragraph pretending to be a timetable. Neither let you
 * answer the one question a traveller actually has of a route: *when does it get to mine.*
 *
 * A ladder answers it. One rung per stop, top to bottom in the order the train runs them,
 * names in the display face on the left and times in mono on the right — so the times form
 * a column you can run a finger down, which a wrapping list can never do.
 *
 * Position, not mode, decides what a rung is called: the first rung is always the departure
 * and the last is always the arrival, which is true on a departures board (this station,
 * then the destination) and on an arrivals board (where it came from, then this station).
 * `here` marks whichever of the two is the station you are standing in, and that rung is
 * the only one set at full weight.
 *
 * Long routes collapse rather than scroll: a stopping regional service can call at twenty
 * stations, and twenty rungs inside a row is a page, not a row. Beyond `LADDER_MAX_RUNGS`
 * the middle folds into one rung that says how many it is hiding and opens on tap.
 */
type RungKind = 'origin' | 'stop' | 'terminus'

type Rung = {
  key: string
  name: string
  time: string
  kind: RungKind
  /** The station the reader is standing in. Exactly one rung per ladder carries it. */
  here: boolean
}

/** Beyond this many rungs the middle of the ladder folds. Six fits a phone without scroll. */
const LADDER_MAX_RUNGS = 6
/** Rung box height. The rail runs from the centre of the first tick to the centre of the last. */
const RUNG_HEIGHT = 30
/** Half the tick column, so the rail sits under the middle of every tick. */
const RAIL_X = 6

function buildRungs(originName: string, originTime: string, viaStops: ViaStop[], mode: BoardMode) {
  const stops = viaStops.map((stop) => ({
    key: `${stop.name}-${stop.time}`,
    name: stop.name,
    time: stop.time,
    kind: 'stop' as RungKind,
    here: false,
  }))
  const self = {
    key: 'here',
    name: originName,
    time: originTime,
    kind: 'stop' as RungKind,
    here: true,
  }
  const rungs = mode === 'arrivals' ? [...stops, self] : [self, ...stops]
  // Position, not mode, names the ends: first rung is the departure, last is the arrival.
  return rungs.map(
    (rung, index): Rung => ({
      ...rung,
      kind: index === 0 ? 'origin' : index === rungs.length - 1 ? 'terminus' : 'stop',
    }),
  )
}

function Tick({ rung, cancelled }: { rung: Rung; cancelled: boolean }) {
  const terminal = rung.kind !== 'stop'
  const size = rung.here ? 12 : terminal ? 10 : 6
  const ink = cancelled
    ? 'var(--state-cancelled)'
    : rung.here || terminal
      ? 'var(--text-primary)'
      : 'var(--line-strong)'
  return (
    <span
      aria-hidden="true"
      className="flex-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        // Filled for the ends of the journey, hollow for the stops between them. The outer
        // ring is --surface, not a colour: it punches the rail out from behind the tick so
        // the line does not draw through a hollow square.
        background: terminal || rung.here ? ink : 'var(--surface)',
        boxShadow: `0 0 0 ${terminal || rung.here ? 0 : 1.5}px ${ink}, 0 0 0 4px var(--surface)`,
      }}
    />
  )
}

export function RouteLadder({
  originName,
  originTime,
  viaStops,
  mode,
  cancelled,
}: {
  /** This station. The rung marked `here`. */
  originName: string
  /** This station's own time, already formatted: the ladder never does time arithmetic. */
  originTime: string
  viaStops: ViaStop[]
  mode: BoardMode
  cancelled: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const rungs = buildRungs(originName, originTime, viaStops, mode)
  const folded = !expanded && rungs.length > LADDER_MAX_RUNGS
  // Two rungs at each end when folded: one end alone reads as a truncation, two reads as a
  // route with its middle put away.
  const hidden = folded ? rungs.length - 4 : 0
  const shown = folded ? [...rungs.slice(0, 2), ...rungs.slice(-2)] : rungs
  const railInk = cancelled ? 'var(--state-cancelled)' : 'var(--line-strong)'
  // One extra box for the collapsed rung, which sits between the second and third shown.
  const boxes = shown.length + (folded ? 1 : 0)

  return (
    // Capped, not full-bleed: the name is on the left of a rung and the time on the right,
    // and on a 1280px board an uncapped ladder puts a metre of nothing between the two
    // halves of the same fact. 34rem is about as far as the eye tracks a dotted-leader line
    // in a printed timetable before it needs the leader drawn in.
    <div className="flex min-w-0 max-w-[34rem] flex-col gap-2">
      <span className="text-text-tertiary type-label">
        {mode === 'arrivals' ? strings.comesFrom : strings.stopsAt}
      </span>
      <ol className="relative m-0 list-none p-0" style={{ minHeight: `${boxes * RUNG_HEIGHT}px` }}>
        <span
          aria-hidden="true"
          className="absolute"
          style={{
            left: `${RAIL_X}px`,
            top: `${RUNG_HEIGHT / 2}px`,
            bottom: `${RUNG_HEIGHT / 2}px`,
            width: 'var(--line-width-strong)',
            background: railInk,
            transform: 'translateX(-50%)',
          }}
        />
        {shown.map((rung, index) => (
          // The fold is a sibling of the rung it follows, not a child of it, so the pair has
          // to share one key — the rung's own, which is unique across the ladder.
          <Fragment key={rung.key}>
            <li
              className="relative grid items-center gap-x-3"
              style={{
                gridTemplateColumns: `${RAIL_X * 2}px minmax(0, 1fr) auto`,
                minHeight: `${RUNG_HEIGHT}px`,
              }}
            >
              <span className="flex justify-center">
                <Tick rung={rung} cancelled={cancelled} />
              </span>
              <span className="flex min-w-0 items-baseline gap-2">
                <span
                  className={`overflow-hidden text-ellipsis whitespace-nowrap ${
                    rung.here ? 'type-primary' : 'type-secondary'
                  }`}
                  style={{
                    color: cancelled
                      ? 'var(--text-tertiary)'
                      : rung.here || rung.kind !== 'stop'
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    fontWeight: rung.here
                      ? 'var(--weight-max)'
                      : rung.kind === 'stop'
                        ? 'var(--weight-regular)'
                        : 'var(--weight-strong)',
                    textDecoration: cancelled ? 'line-through' : 'none',
                  }}
                >
                  {rung.name}
                </span>
                {rung.kind !== 'stop' && (
                  <span className="flex-none text-text-tertiary type-label">
                    {rung.kind === 'origin' ? strings.routeOrigin : strings.terminusArrival}
                  </span>
                )}
              </span>
              <span
                className="type-figures type-secondary"
                style={{
                  color: cancelled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  fontWeight: rung.here ? 'var(--weight-max)' : 'var(--weight-regular)',
                  textDecoration: cancelled ? 'line-through' : 'none',
                }}
              >
                {rung.time}
              </span>
            </li>
            {folded && index === 1 && (
              <li
                className="relative grid items-center gap-x-3"
                style={{
                  gridTemplateColumns: `${RAIL_X * 2}px minmax(0, 1fr)`,
                  minHeight: `${RUNG_HEIGHT}px`,
                }}
              >
                {/* No tick: the fold is not a place, it is the absence of several. The rail
                    runs through it uninterrupted, which is what says "the train still goes
                    this way, we are just not printing it". */}
                <span />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label={strings.routeShowAll}
                  className={`cursor-pointer justify-self-start border-0 bg-transparent p-0 text-focus underline decoration-1 underline-offset-4 type-secondary ${pressFeedback}`}
                  style={{ fontWeight: 'var(--weight-medium)' }}
                >
                  {strings.routeHiddenStops(hidden)}
                </button>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </div>
  )
}

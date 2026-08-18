/**
 * Small board parts, straight from design sheets 01–02: service mark (logo slot + operator
 * tile), platform box (the three states of ANCHOR C), freshness dot, mode toggle and the
 * route strip of the rich row.
 */
import type { BoardMode, BoardRow, Platform, ViaStop } from '@tabellone/core'
import type { CSSProperties } from 'react'
import {
  categoryStyle,
  freshnessLabel,
  operatorMark,
  serviceLabel,
  serviceMarkLabel,
  stopSigla,
} from '@/lib/presentation'
import { strings } from '@/strings'
import { brandLogoInk, brandLogos } from './brand-logos'

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
  const base =
    'inline-flex items-center justify-center rounded-minimal leading-none transition-[background-color,color,border-color]'
  const sizeStyle = {
    minWidth: large ? '56px' : 'var(--platform-min-width)',
    minHeight: large ? undefined : 'var(--platform-height)',
    padding: large ? 'var(--sp-1) var(--sp-3)' : 'var(--sp-1) var(--sp-2)',
    fontSize: large ? 'var(--type-dominant-size)' : 'var(--type-primary-size)',
    fontWeight: 'var(--weight-max)',
    letterSpacing: large ? 'var(--type-dominant-tracking)' : 'var(--type-primary-tracking)',
    lineHeight: 1.05,
  } as const

  if (value === null) {
    return (
      <span className={`${base} text-platform-absent-text`} style={sizeStyle}>
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
    <span className="flex items-center gap-1 text-text-tertiary type-tertiary">
      <span
        className={isStale ? '' : 'animate-data-beat'}
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: isStale ? 'var(--data-stale)' : 'var(--data-fresh)',
        }}
      />
      <span>{freshnessLabel(generatedAt, isStale, now)}</span>
    </span>
  )
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: BoardMode
  onChange: (mode: BoardMode) => void
}) {
  const segment = (target: BoardMode, label: string, icon: string) => {
    const active = mode === target
    return (
      <button
        type="button"
        onClick={() => onChange(target)}
        aria-pressed={active}
        className={`inline-flex flex-1 min-[600px]:flex-none cursor-pointer items-center justify-center gap-2 px-5 py-3 type-secondary transition-[background-color,color] min-h-(--touch-min) ${
          active ? 'bg-surface-inverse text-text-inverse' : 'bg-transparent text-text-secondary'
        }`}
        style={{ fontWeight: active ? 'var(--weight-max)' : 'var(--weight-medium)' }}
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={icon} />
        </svg>
        <span>{label}</span>
      </button>
    )
  }
  return (
    <div className="flex overflow-hidden rounded-minimal border border-line-strong">
      {segment(
        'departures',
        strings.departures,
        'M1.8 14h12.4M2.6 11V5.2A1.6 1.6 0 0 1 4.2 3.6h4.2A1.6 1.6 0 0 1 10 5.2V11H2.6zM2.6 7.4h7.4M6.3 3.6V7.4M4.2 11l-.9 2M8.4 11l.9 2M11.6 5.6h2.6M11.6 8.2h2.6',
      )}
      {segment(
        'arrivals',
        strings.arrivals,
        'M1.8 14h12.4M13.4 11V5.2A1.6 1.6 0 0 0 11.8 3.6H7.6A1.6 1.6 0 0 0 6 5.2V11h7.4zM6 7.4h7.4M9.7 3.6V7.4M7.8 11l-.9 2M11.8 11l.9 2M1.8 5.6h2.6M1.8 8.2h2.6',
      )}
    </div>
  )
}

/**
 * The route strip of the rich row: this station as the filled origin dot, then the
 * remaining stops, the last one as terminus. Display siglas are derived from names —
 * pure presentation, never an identifier.
 */
export function RouteStrip({
  originName,
  viaStops,
  cancelled,
}: {
  originName: string
  viaStops: ViaStop[]
  cancelled: boolean
}) {
  const dots = [
    { id: originName, sigla: stopSigla(originName), terminal: true, origin: true },
    ...viaStops.map((stop, index) => ({
      id: stop.name,
      sigla: stopSigla(stop.name),
      terminal: index === viaStops.length - 1,
      origin: false,
    })),
  ]
  return (
    <div className="relative px-1 pt-2">
      <span
        className="absolute bg-line"
        style={{ left: '6px', right: '6px', top: '13px', height: 'var(--line-width-strong)' }}
      />
      <div className="relative flex items-start justify-between">
        {dots.map((dot) => (
          <span key={dot.id} className="flex flex-col items-center gap-2">
            <span
              style={{
                width: dot.terminal || dot.origin ? '12px' : '8px',
                height: dot.terminal || dot.origin ? '12px' : '8px',
                borderRadius: '50%',
                background:
                  dot.origin && !cancelled ? 'var(--text-primary)' : 'var(--surface-raised)',
                boxShadow: `0 0 0 ${dot.origin && !cancelled ? '0px' : '1.6px'} ${
                  cancelled
                    ? 'var(--state-cancelled)'
                    : dot.terminal || dot.origin
                      ? 'var(--text-primary)'
                      : 'var(--line-strong)'
                }, 0 0 0 4px var(--surface-raised)`,
              }}
            />
            <span
              className="type-label"
              style={{
                fontWeight:
                  dot.terminal || dot.origin ? 'var(--weight-max)' : 'var(--weight-medium)',
                color:
                  dot.terminal || dot.origin ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              }}
            >
              {dot.sigla}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Expanded detail shared by rich and compact rows: the "Ferma a" list. */
export function StopsDetail({ viaStops, mode }: { viaStops: ViaStop[]; mode: BoardMode }) {
  const last = viaStops.at(-1)
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line px-4 py-4 min-[600px]:px-6">
      <span className="text-text-tertiary type-label">{strings.stopsAt}</span>
      {viaStops.map((stop) => (
        <span key={`${stop.name}-${stop.time}`} className="text-text-secondary type-tertiary">
          {stop.name} {stop.time}
        </span>
      ))}
      {last && mode === 'departures' && (
        <span className="ml-auto text-text-tertiary type-tertiary">
          {strings.terminusArrival} {last.time}
        </span>
      )}
    </div>
  )
}

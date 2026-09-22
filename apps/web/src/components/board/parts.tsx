'use client'

/**
 * The pieces a train is drawn with: its brand mark, its status pill, the route drawn large,
 * and the flight card that puts them together. `BoardRow` in, pixels out; nothing here
 * fetches. Theme: `app/theme.css` (the Rotta pass).
 */
import { Clock, Train } from '@phosphor-icons/react'
import type { BoardMode, BoardRow } from '@tabellone/core'
import type { ComponentType, CSSProperties } from 'react'
import { countdownLabel, minutesUntil, titleCase } from '@/lib/format'
import {
  displayedTime,
  formatTime,
  operatorMark,
  serviceLabel,
  statusPresentation,
} from '@/lib/presentation'
import { strings } from '@/strings'
import { type BrandLogoProps, serviceLogo } from './brand-logos'

/** The row's identity on the board, and therefore its React key (see BoardRow in core). */
export const rowKey = (row: BoardRow) => `${row.trainNumber}-${row.scheduledTime}`

/** A traced brand mark drawing in `currentColor`, with its second ink where it has one. */
export function MarkIcon({
  Mark,
  ink,
  ink2,
  large = false,
}: {
  Mark: ComponentType<BrandLogoProps>
  ink: string
  ink2?: string
  large?: boolean
}) {
  const style = { color: ink, ...(ink2 ? { '--logo-ink-2': ink2 } : {}) } as CSSProperties
  return (
    <span className={`sh-logo${large ? ' lg' : ''}`} aria-hidden="true">
      <Mark style={style} />
    </span>
  )
}

/**
 * The brand's own mark for a row (an asset, not RFI's image). Falls back to the operator dot
 * plus the service name for a brand with no asset (Malpensa Express, unknown operators).
 */
export function Logo({ row, large = false }: { row: BoardRow; large?: boolean }) {
  const { Logo: Mark, ink } = serviceLogo(row)
  if (!Mark) {
    const mark = operatorMark[row.operator] ?? operatorMark.OTHER
    return (
      <span className="sh-badge secondary">
        <i style={{ background: mark.colorVar }} />
        {serviceLabel(row)}
      </span>
    )
  }
  return (
    <span className={`sh-logo${large ? ' lg' : ''}`} role="img" aria-label={serviceLabel(row)}>
      <Mark
        style={
          {
            color: ink.primary,
            ...(ink.secondary ? { '--logo-ink-2': ink.secondary } : {}),
          } as CSSProperties
        }
      />
    </span>
  )
}

/** Logo plus number: the way a traveller names a train. */
export function Service({ row }: { row: BoardRow }) {
  return (
    <span className="sh-svc">
      <Logo row={row} />
      <span className="name">{row.trainNumber}</span>
    </span>
  )
}

export function StateBadge({ row, mode }: { row: BoardRow; mode: BoardMode }) {
  const status = statusPresentation(row, mode)
  if (row.status === 'ON_TIME') return <span className="sh-badge outline">{status.label}</span>
  return (
    <span className="sh-badge state" style={{ '--tone': status.colorVar } as CSSProperties}>
      {status.label}
    </span>
  )
}

/**
 * The journey as a flight card reads it: where and when it leaves, where and when it
 * arrives, how long it takes. On a departures board the far end is the last stop RFI lists;
 * on an arrivals board the near end is the first. Journey time is timetable arithmetic on
 * the HH:MM strings RFI prints, modulo a day, from scheduled to scheduled — a late train does
 * not get a shorter journey.
 */
type JourneyEnd = { name: string; time: string | null; scheduled?: string | null }

export function journey(row: BoardRow, mode: BoardMode, stationName: string) {
  const times = displayedTime(row)
  const here: JourneyEnd = { name: stationName, time: times.time, scheduled: times.replacedTime }
  const farStop = mode === 'departures' ? row.viaStops.at(-1) : row.viaStops[0]
  const far: JourneyEnd = farStop
    ? { name: farStop.name, time: farStop.time }
    : { name: row.headsign, time: null }
  const from = mode === 'departures' ? here : far
  const to = mode === 'departures' ? far : here
  const toMinutes = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const fromScheduled = mode === 'departures' ? formatTime(row.scheduledTime) : from.time
  const toScheduled = mode === 'departures' ? to.time : formatTime(row.scheduledTime)
  let duration: string | null = null
  if (fromScheduled && toScheduled) {
    const d = (toMinutes(toScheduled) - toMinutes(fromScheduled) + 1440) % 1440
    duration =
      d >= 60
        ? strings.journeyHours(Math.floor(d / 60), String(d % 60).padStart(2, '0'))
        : strings.journeyMinutes(d)
  }
  return { from, to, duration }
}

/** The route drawn large: from · dashed line with the train and the journey time · to. */
export function RouteBlock({
  row,
  mode,
  stationName,
}: {
  row: BoardRow
  mode: BoardMode
  stationName: string
}) {
  const { from, to, duration } = journey(row, mode, stationName)
  return (
    <span className="fl-route">
      <span className="end from">
        <small>{titleCase(from.name)}</small>
        <b>
          {from.time ?? '—'}
          {from.scheduled && <s>{strings.scheduledAt(from.scheduled)}</s>}
        </b>
      </span>
      <span className="line" aria-hidden="true">
        <i>
          <Train size={16} weight="fill" />
        </i>
        <span>{duration ?? ''}</span>
      </span>
      <span className="end to">
        <small>{titleCase(to.name)}</small>
        <b>
          {to.time ?? '—'}
          {to.scheduled && <s>{strings.scheduledAt(to.scheduled)}</s>}
        </b>
      </span>
    </span>
  )
}

/**
 * A train as a flight card. `hero` is the next train: bigger, with the destination as a
 * headline. `index` staggers the entrance (theme.css, `--i`), capped at 8 positions.
 */
export function FlightCard({
  row,
  mode,
  now,
  stationName,
  hero = false,
  index = 0,
  onOpen,
}: {
  row: BoardRow
  mode: BoardMode
  now: Date
  stationName: string
  hero?: boolean
  index?: number
  onOpen: () => void
}) {
  const status = statusPresentation(row, mode)
  const platform = row.platform.actual ?? row.platform.scheduled
  const platformState = platform ? (row.platform.isConfirmed ? 'confirmed' : 'scheduled') : 'absent'
  const minutes = minutesUntil(row, now)
  const cancelled = row.status === 'CANCELLED'
  const late = cancelled || row.status === 'DELAYED'
  // With a logo the brand is already said; without one the fallback badge carries the name.
  const hasLogo = Boolean(serviceLogo(row).Logo)
  const when = cancelled
    ? strings.statusCancelled
    : minutes <= 0
      ? mode === 'departures'
        ? strings.departsNow
        : strings.arrivesNow
      : mode === 'departures'
        ? strings.departsIn(countdownLabel(minutes))
        : strings.arrivesIn(countdownLabel(minutes))
  return (
    <li>
      <button
        type="button"
        className={`fl-card${hero ? ' hero' : ''}`}
        data-cancelled={cancelled}
        style={{ '--i': Math.min(index, 8) } as CSSProperties}
        onClick={onOpen}
      >
        <span className="top">
          <span className="who">
            <Logo row={row} large />
            <span className="name">
              {hasLogo ? `${serviceLabel(row)} ${row.trainNumber}` : row.trainNumber}
            </span>
          </span>
          <span
            className={`fl-pill${row.status === 'IMMINENT' ? ' solid' : ''}`}
            style={{ '--tone': status.colorVar } as CSSProperties}
          >
            {status.label}
          </span>
        </span>
        {hero && (
          <span className="dest">
            {mode === 'departures' ? strings.toPrefix : strings.fromPrefix}
            {titleCase(row.headsign)}
            <small>{mode === 'departures' ? strings.nextDeparting : strings.nextArriving}</small>
          </span>
        )}
        <RouteBlock row={row} mode={mode} stationName={stationName} />
        <span className="bottom">
          <span className="plat">
            <b data-state={platformState}>{platform ?? strings.platformUnassigned}</b>
            {platform
              ? row.platform.isConfirmed
                ? strings.platform
                : strings.platformScheduled
              : strings.platformToAssign}
          </span>
          <span className="when" data-tone={late ? 'late' : undefined}>
            <Clock size={15} />
            {when}
          </span>
        </span>
      </button>
    </li>
  )
}

/** A card-shaped message: loading, failed, empty. */
export function Message({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="sh-card sh-empty" role="status">
      <strong>{title}</strong>
      {hint}
      {action && (
        <button type="button" className="sh-btn outline" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

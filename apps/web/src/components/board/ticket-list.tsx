'use client'

import { Star } from '@phosphor-icons/react'
/**
 * The board as tickets (seventh pass). Each train is a perforated ticket: a stub coloured by
 * who runs it carries the time (the old one struck and the new one in yellow when late, the
 * countdown under it), then the destination, the service mark and number, a pill only when
 * something is wrong, and the platform as a black split-flap tile. Tickets are grouped by how
 * soon they go. Tapping one opens its sheet.
 *
 * Search and the operator filter are owned by the header and arrive as `query` and `operator`;
 * this component only reads them. Everything here narrows rows already in hand.
 *
 * The trains the reader follows come first, under "I tuoi treni", with a star — and only there,
 * not again in their horizon's group. They stay tappable like any ticket; the sheet they open
 * is the board's (its open state lives in the URL, ADR-012), so this list only says which row
 * was tapped.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'
import { type CSSProperties, useMemo } from 'react'
import { filterRows, matchedViaStop } from '@/lib/board-filter'
import {
  groupByHorizon,
  type Horizon,
  type OperatorFilter,
  operatorFill,
  platformOf,
  stubCountdown,
  ticketPill,
  ticketServiceLabel,
  upcomingRows,
} from '@/lib/board-view'
import { minutesUntil, titleCase } from '@/lib/format'
import { displayedTime, serviceLabel } from '@/lib/presentation'
import { useFlash } from '@/lib/use-flash'
import { strings } from '@/strings'
import { serviceLogo } from './brand-logos'
import { Flaps } from './flaps'
import { Logo, rowKey } from './parts'

/** Chips, in this order; a chip with no train behind it is not drawn. */
export const OPERATOR_FILTERS: { key: OperatorFilter; label: string; dot?: string }[] = [
  { key: 'all', label: strings.filterAll },
  { key: 'TRENITALIA', label: strings.operatorTrenitalia, dot: 'var(--f-trenitalia)' },
  { key: 'ITALO', label: strings.operatorItalo, dot: 'var(--f-italo)' },
  { key: 'TRENORD', label: strings.operatorTrenord, dot: 'var(--f-trenord)' },
  { key: 'OTHER', label: strings.operatorOther, dot: 'var(--f-other)' },
]

const GROUP_LABEL: Record<Horizon, string> = {
  soon: strings.withinThirtyMinutes,
  hour: strings.withinAnHour,
  later: strings.later,
}

/** The ticket's coloured end: the time as it will really be, the countdown under it. */
export function Stub({ row, mode, now }: { row: BoardRow; mode: BoardMode; now: Date }) {
  const shown = displayedTime(row)
  const flash = useFlash(shown.time)
  return (
    <span className="tk-stub" data-now={row.status === 'IMMINENT'} data-flash={flash}>
      {shown.replacedTime ? (
        <>
          <s>{shown.replacedTime}</s>
          <b className="lateb">{shown.time}</b>
        </>
      ) : (
        <b>{shown.time}</b>
      )}
      <small>{stubCountdown(row, mode, now)}</small>
    </span>
  )
}

/** The platform as a flap tile, or a dashed box while the station has not assigned one. */
export function PlatformTile({
  row,
  roll = false,
  delay = 0,
}: {
  row: BoardRow
  roll?: boolean
  delay?: number
}) {
  const platform = platformOf(row)
  return (
    <span className="mx-plat">
      {platform ? (
        <Flaps text={platform} roll={roll} delay={delay} label={strings.platformAria(platform)} />
      ) : (
        <span className="bt-nd" role="img" aria-label={strings.platformToAssign}>
          –
        </span>
      )}
      <span className="lbl">{strings.platformShort}.</span>
    </span>
  )
}

export function Pill({ row, mode }: { row: BoardRow; mode: BoardMode }) {
  const flash = useFlash(`${row.status}-${row.delayMinutes}`)
  const pill = ticketPill(row, mode)
  if (!pill) return null
  return (
    <span className={`tk-pill ${pill.tone}`} data-flash={flash}>
      {pill.text}
    </span>
  )
}

function Ticket({
  row,
  mode,
  now,
  index,
  via,
  followed,
  onOpen,
}: {
  row: BoardRow
  mode: BoardMode
  now: Date
  index: number
  via: { name: string; time: string } | null
  followed: boolean
  onOpen: () => void
}) {
  const departures = mode === 'departures'
  const label = ticketServiceLabel(row)
  const destination = titleCase(row.headsign)
  return (
    <li
      className="mx"
      style={{ '--i': Math.min(index, 8), '--f': operatorFill(row) } as CSSProperties}
    >
      <button
        type="button"
        className="mx-btn"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={strings.ticketAria(
          serviceLabel(row),
          row.trainNumber,
          departures,
          destination,
          displayedTime(row).time,
          platformOf(row),
        )}
      >
        <Stub row={row} mode={mode} now={now} />
        <span className="mx-main">
          <span className="d">
            {departures ? '' : strings.fromPlaceLead}
            {destination}
          </span>
          <span className="m">
            {serviceLogo(row).Logo && <Logo row={row} />}
            <span className="bn">
              {label && <i>{label} </i>}
              {row.trainNumber}
            </span>
            <Pill row={row} mode={mode} />
            {followed && (
              <span className="star" role="img" aria-label={strings.followedAria}>
                <Star weight="fill" aria-hidden="true" />
              </span>
            )}
          </span>
          {via && <span className="viam">{strings.stopsAtVia(titleCase(via.name), via.time)}</span>}
        </span>
        <PlatformTile row={row} roll={index < 14} delay={index * 40 + 120} />
      </button>
    </li>
  )
}

const narrow = (rows: BoardRow[], query: string, operator: OperatorFilter) =>
  filterRows(rows, query).filter((row) => operator === 'all' || row.operator === operator)

export function TicketList({
  rows,
  mode,
  now,
  query,
  operator,
  followedKeys,
  onOpen,
  onReset,
}: {
  rows: BoardRow[]
  mode: BoardMode
  now: Date
  query: string
  operator: OperatorFilter
  /** `rowKey`s of the rows the reader follows on this board. */
  followedKeys: ReadonlySet<string>
  onOpen: (row: BoardRow) => void
  /** "Mostra tutti": clears the search and the operator chip. */
  onReset: () => void
}) {
  // A followed train stays in "I tuoi treni" even once it is past the list's grace period: it
  // is the one the reader is waiting for. Search and the operator chip still narrow it.
  const mine = useMemo(
    () =>
      narrow(
        rows.filter((row) => followedKeys.has(rowKey(row))),
        query,
        operator,
      ).sort((a, b) => minutesUntil(a, now) - minutesUntil(b, now)),
    [rows, followedKeys, query, operator, now],
  )
  const shown = useMemo(
    () =>
      narrow(
        upcomingRows(rows, now).filter((row) => !followedKeys.has(rowKey(row))),
        query,
        operator,
      ),
    [rows, followedKeys, query, operator, now],
  )
  const groups = useMemo(() => groupByHorizon(shown, now), [shown, now])
  const trimmed = query.trim()
  let position = 0

  const renderTicket = (row: BoardRow) => (
    <Ticket
      key={rowKey(row)}
      row={row}
      mode={mode}
      now={now}
      index={position++}
      via={matchedViaStop(row, query)}
      followed={followedKeys.has(rowKey(row))}
      onOpen={() => onOpen(row)}
    />
  )

  return (
    <div className="bt-list" data-flaps="true">
      {mine.length === 0 && groups.length === 0 ? (
        <div className="mx-empty">
          <b>{trimmed ? strings.noTrainFor(trimmed) : strings.noTrainInCategory}</b>
          {trimmed ? strings.noTrainForHint : strings.noTrainInCategoryHint}
          <button type="button" onClick={onReset}>
            {strings.showAllShort}
          </button>
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <section>
              <h2 className="mx-group">
                {strings.yourTrains}
                <span>{strings.trainCount(mine.length)}</span>
              </h2>
              <ul className="mx-list">{mine.map(renderTicket)}</ul>
            </section>
          )}
          {groups.map((group) => (
            <section key={group.horizon}>
              <h2 className="mx-group">
                {GROUP_LABEL[group.horizon]}
                <span>{strings.trainCount(group.rows.length)}</span>
              </h2>
              <ul className="mx-list">{group.rows.map(renderTicket)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

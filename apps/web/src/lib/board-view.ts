/**
 * How a board in hand becomes the lists on screen: which rows are still worth showing, how soon
 * they go, and how many each operator chip would reveal. Pure functions over `BoardRow[]` and
 * an injected `now` — no fetch, so none of it can raise traffic towards RFI (ARCHITECTURE 7).
 */
import type { BoardMode, BoardRow, Operator } from '@tabellone/core'
import { strings } from '@/strings'
import { filterRows } from './board-filter'
import { minutesUntil, normalize, titleCase } from './format'
import { displayedTime, formatTime, serviceLabel } from './presentation'

/**
 * RFI keeps a train on the board a while after its time; the list keeps it for this long too,
 * because a train that is late by twenty minutes is still the one the reader is waiting for.
 */
export const PAST_GRACE_MINUTES = 30

/** Rows still worth showing, soonest expected time first. */
export function upcomingRows(rows: BoardRow[], now: Date): BoardRow[] {
  return rows
    .filter((row) => minutesUntil(row, now) >= -PAST_GRACE_MINUTES)
    .sort((a, b) => minutesUntil(a, now) - minutesUntil(b, now))
}

export type Horizon = 'soon' | 'hour' | 'later'

export function horizonOf(row: BoardRow, now: Date): Horizon {
  const minutes = minutesUntil(row, now)
  return minutes <= 30 ? 'soon' : minutes <= 60 ? 'hour' : 'later'
}

/** Rows in the three groups the list is drawn in, empty groups left out. Order is preserved. */
export function groupByHorizon(
  rows: BoardRow[],
  now: Date,
): { horizon: Horizon; rows: BoardRow[] }[] {
  const groups: Record<Horizon, BoardRow[]> = { soon: [], hour: [], later: [] }
  for (const row of rows) groups[horizonOf(row, now)].push(row)
  return (['soon', 'hour', 'later'] as const)
    .map((horizon) => ({ horizon, rows: groups[horizon] }))
    .filter((group) => group.rows.length > 0)
}

export type OperatorFilter = Operator | 'all'

/** How many trains each operator chip would show, with the search applied. `all` is the total. */
export function countByOperator(
  rows: BoardRow[],
  now: Date,
  query: string,
): Partial<Record<OperatorFilter, number>> {
  const counts: Partial<Record<OperatorFilter, number>> = { all: 0 }
  for (const row of filterRows(upcomingRows(rows, now), query)) {
    counts.all = (counts.all ?? 0) + 1
    counts[row.operator] = (counts[row.operator] ?? 0) + 1
  }
  return counts
}

/**
 * The countdown printed under the time on a ticket's stub. A train still on the board after its
 * expected time is, as far as RFI says, still about to go: "in partenza", never "partito" —
 * RFI drops a train once it has left, so one that is still listed has not.
 */
export function stubCountdown(row: BoardRow, mode: BoardMode, now: Date): string {
  if (row.status === 'CANCELLED') return strings.ticketSuppressed.toLowerCase()
  const minutes = minutesUntil(row, now)
  if (row.status === 'IMMINENT' || minutes <= 0)
    return mode === 'departures' ? strings.ticketNowDeparting : strings.ticketNowArriving
  if (minutes < 60) return strings.inMinutes(minutes)
  return strings.inHoursShort(Math.floor(minutes / 60), String(minutes % 60).padStart(2, '0'))
}

export type TicketPill = { tone: 'ok' | 'late' | 'bad' | 'now'; text: string }

/**
 * The pill on a ticket. On the list only the exceptions get one — late, cancelled — because
 * "on time" on every ticket is noise; the opened ticket asks for all of them.
 */
export function ticketPill(row: BoardRow, mode: BoardMode, all = false): TicketPill | null {
  if (row.status === 'CANCELLED') return { tone: 'bad', text: strings.ticketSuppressed }
  const delay = row.delayMinutes ?? 0
  if (delay > 0) return { tone: 'late', text: strings.statusDelay(delay) }
  if (!all) return null
  if (row.status === 'IMMINENT')
    return {
      tone: 'now',
      text: mode === 'departures' ? strings.statusImminentDeparture : strings.statusImminentArrival,
    }
  return { tone: 'ok', text: strings.statusOnTime }
}

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** The first word of a station name, accents and dots folded: "Firenze S.M.N." → "firenze". */
const firstWord = (name: string) => normalize(name).split(/[\s.]/)[0]

export type TicketEnd = { time: string | null; late: string | null; place: string }

/**
 * The route of the opened ticket. On a departures board the far end is the last stop RFI
 * lists — **if** that stop is the destination. RFI's list can stop short (an Italo to Roma
 * listed only as far as Firenze), and then its last time is not the arrival: the ticket says
 * nothing rather than something wrong, and the journey time goes with it.
 */
export function ticketRoute(row: BoardRow, mode: BoardMode, stationName: string) {
  const departures = mode === 'departures'
  const scheduled = formatTime(row.scheduledTime)
  const shown = displayedTime(row)
  const here = titleCase(stationName)
  const stops = row.viaStops.map((stop) => ({ name: titleCase(stop.name), time: stop.time }))
  const last = stops.at(-1)
  const arrival = last && firstWord(last.name) === firstWord(row.headsign) ? last : undefined
  const durationMinutes =
    departures && arrival ? (toMinutes(arrival.time) - toMinutes(scheduled) + 1440) % 1440 : null
  const lateTime = shown.replacedTime ? shown.time : null
  const from: TicketEnd = departures
    ? { time: scheduled, late: lateTime, place: here }
    : { time: null, late: null, place: strings.fromPlace(titleCase(row.headsign)) }
  const to: TicketEnd = departures
    ? { time: arrival?.time ?? null, late: null, place: titleCase(row.headsign) }
    : { time: scheduled, late: lateTime, place: here }
  const rail = departures && stops.length ? [{ name: here, time: scheduled }, ...stops] : []
  return { from, to, durationMinutes, stops: rail }
}

/** "1 h 05" · "42 min" */
export function formatTicketDuration(minutes: number): string {
  return minutes >= 60
    ? strings.durationHours(Math.floor(minutes / 60), String(minutes % 60).padStart(2, '0'))
    : strings.minutesShort(minutes)
}

/**
 * The service name printed beside the number on a ticket, or '' when the logo already says it:
 * the Intercity mark reads "Intercity", so only the night service adds a word.
 */
export function ticketServiceLabel(row: BoardRow): string {
  if (row.brand === 'Intercity') return ''
  if (row.brand === 'Intercity Notte') return strings.ticketNight
  return serviceLabel(row)
}

/** The operator's colour: the same three the filter chips use, a custom property of the theme. */
export const operatorFill = (row: Pick<BoardRow, 'operator'>) =>
  `var(--f-${row.operator.toLowerCase()})`

/** The platform to show: the one the station committed to, else the scheduled one. */
export const platformOf = (row: BoardRow) => row.platform.actual ?? row.platform.scheduled

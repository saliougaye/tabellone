/**
 * What a strike notice looks like to the reader, from the two instants the server resolved
 * (ADR-013). The server did the hard part — reading RFI's text, the year, the DST; here the
 * client only compares those instants with "now" to choose a phase, and formats them.
 *
 * Phase is what decides weight on screen, not the mere presence of text:
 *   announced  more than 24 h before the start: a quiet ticket
 *   imminent   under 24 h: it starts to matter
 *   ongoing    the window is open: it is the loudest thing on the board
 *   over       the window closed, for 3 more hours (trains in transit are still late), then gone
 *
 * Formatting is `Intl` in `Europe/Rome`; the only "arithmetic" is calendar days between two
 * formatted dates, which has no DST in it.
 */
import type { BoardNotice, BoardRow } from '@tabellone/core'
import { strings } from '@/strings'

export type StrikeNotice = Extract<BoardNotice, { kind: 'strike' }>
export type InfoNotice = Extract<BoardNotice, { kind: 'info' }>
export type StrikePhase = 'announced' | 'imminent' | 'ongoing' | 'over'

const HOUR_MS = 3_600_000
/** How long after the window closes the strike keeps a (grey) ticket. */
export const OVER_VISIBLE_MS = 3 * HOUR_MS
const TZ = 'Europe/Rome'

export const isStrike = (notice: BoardNotice): notice is StrikeNotice => notice.kind === 'strike'

/** `null` once the strike has been over for more than three hours: nothing left to say. */
export function strikePhase(
  strike: Pick<StrikeNotice, 'from' | 'to'>,
  now: Date,
): StrikePhase | null {
  const at = now.getTime()
  const from = Date.parse(strike.from)
  const to = Date.parse(strike.to)
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  if (at < from - 24 * HOUR_MS) return 'announced'
  if (at < from) return 'imminent'
  if (at < to) return 'ongoing'
  if (at < to + OVER_VISIBLE_MS) return 'over'
  return null
}

export const strikeKey = (strike: Pick<StrikeNotice, 'from' | 'to'>) =>
  `${strike.from}|${strike.to}`

/* ── formatting ────────────────────────────────────────────────────────────────────────── */
const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('it-IT', { timeZone: TZ, ...options }).format(new Date(iso))

/** "21:00" */
export const clock = (iso: string) =>
  format(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** "gio 20 nov" */
export const dayShort = (iso: string) =>
  format(iso, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')

const romeDate = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso)) // YYYY-MM-DD

/** Calendar days from `a`'s Rome date to `b`'s. No clock time in it, so no DST either. */
export function calendarDaysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = romeDate(aIso).split('-').map(Number)
  const [by, bm, bd] = romeDate(bIso).split('-').map(Number)
  return Math.round(
    (Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1) - Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1)) /
      86_400_000,
  )
}

/** "oggi" · "stasera" · "domani" · "gio 20 nov", against `now`. */
export function dayWord(iso: string, now: Date): string {
  const days = calendarDaysBetween(now.toISOString(), iso)
  if (days === 0) return Number(clock(iso).slice(0, 2)) >= 18 ? strings.tonight : strings.today
  if (days === 1) return strings.tomorrow
  return dayShort(iso)
}

/** "stasera alle 21:00" · "domani alle 21:00" · "gio 20 nov alle 21:00" */
export const dayAt = (iso: string, now: Date) => strings.dayAt(dayWord(iso, now), clock(iso))

function inWords(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return strings.minutesShort(Math.max(1, minutes))
  const hours = Math.round(minutes / 60)
  if (hours < 36) return strings.hoursShort(hours)
  return strings.daysLong(Math.round(hours / 24))
}

export type StrikeCopy = { kicker: string; title: string; line: string }

export function strikeCopy(strike: StrikeNotice, phase: StrikePhase, now: Date): StrikeCopy {
  const name = strike.national ? strings.strikeNational : strings.strike
  const from = Date.parse(strike.from)
  const to = Date.parse(strike.to)
  switch (phase) {
    case 'announced': {
      const days = calendarDaysBetween(now.toISOString(), strike.from)
      return {
        kicker: days === 1 ? strings.tomorrowCap : strings.inDays(days),
        title: name,
        line: strings.strikeWindow(
          dayShort(strike.from),
          clock(strike.from),
          dayShort(strike.to),
          clock(strike.to),
        ),
      }
    }
    case 'imminent':
      return {
        kicker: strings.inWords(inWords(from - now.getTime())),
        title: strings.strikeFrom(dayAt(strike.from, now)),
        line: strings.until(dayAt(strike.to, now)),
      }
    case 'ongoing':
      return {
        kicker: strings.strikeOngoingKicker,
        title: strings.strikeOngoing,
        line: strings.strikeUntilEnds(dayAt(strike.to, now), inWords(to - now.getTime())),
      }
    case 'over':
      return {
        kicker: strings.strikeOverKicker,
        title: strings.strikeOver(clock(strike.to)),
        line: strings.strikeOverHint,
      }
  }
}

/** What the strike is doing to this very board, now: trains late by 5+ minutes, and cancelled. */
export function strikeImpact(rows: BoardRow[]): { late: number; cancelled: number } {
  return {
    late: rows.filter((r) => r.status !== 'CANCELLED' && (r.delayMinutes ?? 0) >= 5).length,
    cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
  }
}

/**
 * Board notices, read (ADR-013). RFI gives them as free uppercase text — sometimes with an
 * English copy after " / " — and a strike is the one kind the UI wants placed in time: the
 * window it covers, and who strikes. This module is the **pure** reading: text and a clock in,
 * `BoardNotice` out. No I/O, no Next, and no `Date` arithmetic on wall-clock times: the window
 * is resolved in `Europe/Rome` with Luxon (ARCHITECTURE 5.1), so both DST transitions and the
 * year that the text does not carry are handled on purpose.
 *
 * Reading never throws. Text that talks about a strike but does not match a window shape we
 * know, or names a date that does not exist, degrades to `info` carrying RFI's own words: the
 * cost of a missed strike is a lighter notice on screen, never a failed board.
 */
import { DateTime } from 'luxon'
import type { BoardNotice } from './types'

const ZONE = 'Europe/Rome'
const MONTHS = [
  'GENNAIO',
  'FEBBRAIO',
  'MARZO',
  'APRILE',
  'MAGGIO',
  'GIUGNO',
  'LUGLIO',
  'AGOSTO',
  'SETTEMBRE',
  'OTTOBRE',
  'NOVEMBRE',
  'DICEMBRE',
]

/**
 * "DALLE ORE 21.00 DEL 20 NOVEMBRE ALLE ORE 20.00 DEL 21 NOVEMBRE", with `.` or `:` between
 * hours and minutes, "ORE" optional, an optional comma between the two halves.
 */
const WINDOW_TWO_DAYS =
  /DALLE?\s+(?:ORE\s+)?(\d{1,2})[.:](\d{2})\s+DEL\s+(\d{1,2})\s+([A-Z]+)\s*,?\s+ALLE?\s+(?:ORE\s+)?(\d{1,2})[.:](\d{2})\s+DEL\s+(\d{1,2})\s+([A-Z]+)/

/** "DALLE ORE 09.00 ALLE ORE 17.00 DEL 20 NOVEMBRE": both ends on the same day. */
const WINDOW_ONE_DAY =
  /DALLE?\s+(?:ORE\s+)?(\d{1,2})[.:](\d{2})\s+ALLE?\s+(?:ORE\s+)?(\d{1,2})[.:](\d{2})\s+DEL\s+(\d{1,2})\s+([A-Z]+)/

type Wall = { month: number; day: number; hour: number; minute: number }
type Window = { from: DateTime; to: DateTime }

/** Wall-clock time in Rome → instant. `null` when the date does not exist ("31 NOVEMBRE"). */
function inRome(year: number, wall: Wall): DateTime | null {
  // "ORE 24.00" is midnight at the end of the day, which Luxon spells as 00:00 of the next.
  const midnight = wall.hour === 24 && wall.minute === 0
  const at = DateTime.fromObject(
    {
      year,
      month: wall.month,
      day: wall.day,
      hour: midnight ? 0 : wall.hour,
      minute: wall.minute,
    },
    { zone: ZONE },
  )
  if (!at.isValid) return null
  const day = midnight ? at.plus({ days: 1 }) : at
  // Fall-back night: the same wall time exists twice and Luxon answers with the later one.
  // ARCHITECTURE 5.1 says the earlier occurrence, so step back an hour and keep it if the wall
  // clock still reads the same.
  const earlier = day.minus({ hours: 1 })
  const repeated =
    earlier.offset > day.offset && earlier.hour === day.hour && earlier.minute === day.minute
  return repeated ? earlier : day
}

/**
 * The window's instants. The text has no year, so try the one before, the current one and the
 * next, and keep the one that puts the start closest to `now`: a window announced in December
 * for early January lands in next year, and one that crosses New Year's Eve ends the year
 * after it started.
 */
function resolveWindow(from: Wall, to: Wall, now: DateTime): Window | null {
  let best: Window | null = null
  for (const year of [now.year - 1, now.year, now.year + 1]) {
    const start = inRome(year, from)
    if (!start) continue
    let end = inRome(year, to)
    if (end && end < start) end = inRome(year + 1, to)
    if (!end) continue
    const distance = Math.abs(start.toMillis() - now.toMillis())
    if (!best || distance < Math.abs(best.from.toMillis() - now.toMillis())) {
      best = { from: start, to: end }
    }
  }
  return best
}

/** Drop RFI's English copy ("… / FROM 21.00 ON …"). */
function italianPart(text: string): string {
  const parts = text.split(/\s+\/\s+/)
  const first = parts[0]
  const rest = parts.slice(1).join(' ')
  if (first !== undefined && parts.length > 1 && /\b(THE|TRAINS|FROM|DUE TO|STRIKE)\b/.test(rest)) {
    return first
  }
  return text
}

/** Lowercase, a capital after each full stop, and the names that keep theirs. */
function sentence(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[.!?]\s+)(\p{L})/gu, (_, lead: string, ch: string) => lead + ch.toUpperCase())
    .replace(/\bfs\b/g, 'FS')
    .replace(/\bfs italiane\b/gi, 'FS Italiane')
    .replace(/\bgruppo FS/g, 'Gruppo FS')
    .replace(/\bitalo\b/g, 'Italo')
    .replace(/\btrenord\b/g, 'Trenord')
    .replace(/\btrenitalia\b/g, 'Trenitalia')
    .replace(/\brfi\b/g, 'RFI')
    .replace(/\bmilano\b/g, 'Milano')
    .replace(/\btreviglio\b/g, 'Treviglio')
}

function monthNumber(name: string | undefined): number | null {
  const index = MONTHS.indexOf(name ?? '')
  return index < 0 ? null : index + 1
}

function readWindow(text: string): { from: Wall; to: Wall } | null {
  const two = WINDOW_TWO_DAYS.exec(text)
  if (two) {
    const [, h1, m1, d1, mo1, h2, m2, d2, mo2] = two
    const startMonth = monthNumber(mo1)
    const endMonth = monthNumber(mo2)
    if (!startMonth || !endMonth) return null
    return {
      from: { month: startMonth, day: Number(d1), hour: Number(h1), minute: Number(m1) },
      to: { month: endMonth, day: Number(d2), hour: Number(h2), minute: Number(m2) },
    }
  }
  const one = WINDOW_ONE_DAY.exec(text)
  if (one) {
    const [, h1, m1, h2, m2, day, mo] = one
    const month = monthNumber(mo)
    if (!month) return null
    return {
      from: { month, day: Number(day), hour: Number(h1), minute: Number(m1) },
      to: { month, day: Number(day), hour: Number(h2), minute: Number(m2) },
    }
  }
  return null
}

/** One notice, read. `now` anchors the year the text does not carry. */
export function readNotice(raw: string, now: Date): BoardNotice {
  const italian = italianPart(raw).replace(/\s+/g, ' ').trim()
  const info: BoardNotice = { kind: 'info', text: sentence(italian) }
  try {
    if (!/SCIOPER/.test(italian)) return info
    const walls = readWindow(italian)
    if (!walls) return info
    const window = resolveWindow(walls.from, walls.to, DateTime.fromJSDate(now, { zone: ZONE }))
    const from = window?.from.toISO()
    const to = window?.to.toISO()
    if (!window || !from || !to) return info
    const who = /PERSONALE (?:DEL(?:LE|LA|L')?\s+)?(.+?)(?:\.|\bINFO\b|$)/.exec(italian)?.[1]
    return {
      kind: 'strike',
      from,
      to,
      national: /NAZIONALE/.test(italian),
      who: who ? sentence(who).replace(/^./, (c) => c.toUpperCase()) : null,
      text: sentence(italian),
    }
  } catch {
    return info
  }
}

/**
 * Every notice of a board, read. Stations repeat the same strike in slightly different words,
 * so strikes covering the same window are kept once (the first wording wins).
 */
export function readNotices(raw: string[], now: Date): BoardNotice[] {
  const seen = new Set<string>()
  const out: BoardNotice[] = []
  for (const text of raw) {
    const notice = readNotice(text, now)
    if (notice.kind === 'strike') {
      const key = `${notice.from}|${notice.to}`
      if (seen.has(key)) continue
      seen.add(key)
    }
    out.push(notice)
  }
  return out
}

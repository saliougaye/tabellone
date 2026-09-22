'use client'

/**
 * Small presentation helpers with no UI in them: a ticking clock, a client-only value,
 * Italian title case for RFI's all-caps names, station search, and the countdown.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'
import { useEffect, useState } from 'react'
import { strings } from '@/strings'

/** A `Date` that ticks. `everyMs` 1000 for a clock, 30 000 for a countdown. */
export function useNow(everyMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), everyMs)
    return () => window.clearInterval(id)
  }, [everyMs])
  return now
}

/** Read something from `localStorage` after mount, so the server and first paint agree. */
export function useClientValue<T>(read: () => T, initial: T): T {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    setValue(read())
  }, [read])
  return value
}

const SMALL_WORDS = new Set([
  'di',
  'del',
  'della',
  'dei',
  'delle',
  'al',
  'allo',
  'alla',
  'sul',
  'sulla',
  'e',
  'in',
  'a',
  'da',
])

/**
 * RFI prints every name in caps. `MILANO P.TA GARIBALDI` → `Milano P.ta Garibaldi`. Words
 * after a dot or a hyphen are capitalised too, small Italian words stay lower unless first.
 */
export function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) return word
      return word.replace(
        /(^|[.\-'’/(])(\p{L})/gu,
        (_, sep: string, ch: string) => sep + ch.toUpperCase(),
      )
    })
    .join(' ')
}

export const MODE_LABEL: Record<BoardMode, string> = {
  departures: strings.departures,
  arrivals: strings.arrivals,
}

/** Accent- and case-insensitive match on station name or city. */
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function searchStations<T extends { name: string; city: string; isMajor: boolean }>(
  stations: T[] | null,
  query: string,
  limit = 40,
): T[] {
  if (!stations) return []
  const q = normalize(query.trim())
  if (!q) return stations.filter((station) => station.isMajor)
  const starts: T[] = []
  const contains: T[] = []
  for (const station of stations) {
    const name = normalize(station.name)
    const city = normalize(station.city)
    if (name.startsWith(q) || city.startsWith(q)) starts.push(station)
    else if (name.includes(q) || city.includes(q)) contains.push(station)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

/**
 * Whole minutes from `now` to a train's expected time (scheduled plus delay). Negative means
 * gone. Instant arithmetic on the absolute timestamps the server sent — the client never
 * touches HH:MM or time zones (ARCHITECTURE 5.1).
 */
export function minutesUntil(row: BoardRow, now: Date): number {
  const expected = new Date(row.scheduledTime).getTime() + (row.delayMinutes ?? 0) * 60_000
  return Math.round((expected - now.getTime()) / 60_000)
}

/** "adesso" · "tra 7 min" · "tra 1 h 12 min" — the countdown as a phrase. */
export function countdownLabel(minutes: number): string {
  if (minutes <= 0) return strings.now
  if (minutes < 60) return strings.inMinutes(minutes)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return strings.inHours(h, m)
}

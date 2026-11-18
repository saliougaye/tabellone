/**
 * "Segui questo treno": the trains a reader follows, purely client-side in `localStorage` like
 * favourites (nothing is persisted server-side in v1). A followed train is shown first on its
 * board and on the home, with its live platform and delay read from its station's board — no
 * request of its own (ARCHITECTURE 4.1, 7.2).
 *
 * An entry identifies the train the way the board does (`trainNumber` + scheduled time) plus
 * where it was followed (slug and mode — an arrivals follow reads an arrivals board) and a
 * display cache, so a card stays readable while its board loads. At most five at a time, and an
 * entry drops itself three hours after the train's time (its *expected* time, once the board has
 * told us it is late) — nobody should find yesterday's train on the home.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'

export type FollowedTrain = {
  slug: string
  mode: BoardMode
  trainNumber: string
  /** The row's `scheduledTime`: an ISO instant. Part of the identity. */
  scheduledAt: string
  headsign: string
  stationName: string
  /** Scheduled + delay, refreshed whenever a board with the train is seen. Only ever later. */
  expectedAt?: string
}

const KEY = 'tabellone:followed-trains'
export const MAX_FOLLOWED = 5
/** How long a followed train outlives its time. */
export const FOLLOW_GRACE_MS = 3 * 60 * 60 * 1000
export const FOLLOWED_EVENT = 'tabellone:followed'

export const followKey = (
  train: Pick<FollowedTrain, 'slug' | 'mode' | 'trainNumber' | 'scheduledAt'>,
) => `${train.slug}:${train.mode}:${train.trainNumber}:${train.scheduledAt}`

/** The followed train a board row stands for, as it would be stored. */
export function followedFromRow(
  row: BoardRow,
  slug: string,
  mode: BoardMode,
  stationName: string,
): FollowedTrain {
  return {
    slug,
    mode,
    trainNumber: row.trainNumber,
    scheduledAt: row.scheduledTime,
    headsign: row.headsign,
    stationName,
  }
}

export const rowMatches = (train: FollowedTrain, row: BoardRow) =>
  train.trainNumber === row.trainNumber && train.scheduledAt === row.scheduledTime

const timeOf = (iso: string) => Date.parse(iso)

/** The instant after which the entry is gone: three hours past the later of scheduled/expected. */
export function expiresAt(train: FollowedTrain): number {
  const scheduled = timeOf(train.scheduledAt)
  const expected = train.expectedAt ? timeOf(train.expectedAt) : Number.NaN
  return Math.max(scheduled, Number.isNaN(expected) ? scheduled : expected) + FOLLOW_GRACE_MS
}

export function isFollowedTrain(value: unknown): value is FollowedTrain {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.slug === 'string' &&
    (entry.mode === 'departures' || entry.mode === 'arrivals') &&
    typeof entry.trainNumber === 'string' &&
    typeof entry.scheduledAt === 'string' &&
    !Number.isNaN(timeOf(entry.scheduledAt)) &&
    typeof entry.headsign === 'string' &&
    typeof entry.stationName === 'string' &&
    (entry.expectedAt === undefined || typeof entry.expectedAt === 'string')
  )
}

/**
 * The entries a raw storage value holds, in the order they were followed: malformed ones and
 * expired ones left out, duplicates collapsed (the first wins), the oldest beyond the cap cut.
 */
export function parseFollowed(raw: string | null, now: Date): FollowedTrain[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  const live: FollowedTrain[] = []
  for (const entry of parsed) {
    if (!isFollowedTrain(entry) || expiresAt(entry) <= now.getTime()) continue
    const key = followKey(entry)
    if (seen.has(key)) continue
    seen.add(key)
    live.push(entry)
  }
  return live.slice(-MAX_FOLLOWED)
}

function readRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function readFollowedRaw(): string {
  return readRaw() ?? ''
}

function write(entries: FollowedTrain[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    /* quota or private mode: the follow stays in memory for this page only */
  }
  window.dispatchEvent(new Event(FOLLOWED_EVENT))
}

export function listFollowed(now: Date = new Date()): FollowedTrain[] {
  return parseFollowed(readRaw(), now)
}

export function isFollowing(
  train: Pick<FollowedTrain, 'slug' | 'mode' | 'trainNumber' | 'scheduledAt'>,
  now: Date = new Date(),
): boolean {
  const key = followKey(train)
  return listFollowed(now).some((entry) => followKey(entry) === key)
}

/**
 * Adds the train, or removes it when already followed. Returns whether it is followed now.
 * A sixth follow pushes the oldest one out: the newest is the one the reader just asked for.
 */
export function toggleFollowed(train: FollowedTrain, now: Date = new Date()): boolean {
  const key = followKey(train)
  const current = listFollowed(now)
  const exists = current.some((entry) => followKey(entry) === key)
  const next = exists
    ? current.filter((entry) => followKey(entry) !== key)
    : [...current, train].slice(-MAX_FOLLOWED)
  write(next)
  return !exists
}

export function unfollow(key: string, now: Date = new Date()): void {
  write(listFollowed(now).filter((entry) => followKey(entry) !== key))
}

/**
 * A board with followed trains on it tells us when they are really due: keep that, so a train
 * that is two hours late is not dropped three hours after its *timetable* time. Writes only
 * when something changed, so the 20 s poll does not churn storage (or re-render listeners).
 */
export function syncExpectedTimes(
  slug: string,
  mode: BoardMode,
  rows: BoardRow[],
  now: Date = new Date(),
): void {
  const current = listFollowed(now)
  let changed = false
  const next = current.map((entry) => {
    if (entry.slug !== slug || entry.mode !== mode) return entry
    const row = rows.find((candidate) => rowMatches(entry, candidate))
    if (!row) return entry
    const expected = new Date(timeOf(row.scheduledTime) + (row.delayMinutes ?? 0) * 60_000)
    const iso = expected.toISOString()
    if (timeOf(row.scheduledTime) >= expected.getTime() || entry.expectedAt === iso) return entry
    changed = true
    return { ...entry, expectedAt: iso }
  })
  if (changed) write(next)
}

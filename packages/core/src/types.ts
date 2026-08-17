/**
 * The domain model. It is **ours**, not a mirror of RFI's structure: no raw RFI value ever
 * crosses the API boundary (ARCHITECTURE 5).
 *
 * Vocabulary lives in CONTEXT.md. If a name here disagrees with a name there, one of the two
 * is wrong and it is worth stopping to find out which.
 */

/** Which of the two boards. Spelled `view` in page URLs, `mode` in the API (ADR-010). */
export type BoardMode = 'departures' | 'arrivals'

/** Raw HTML as it comes off the wire. Never cached, never stored (ARCHITECTURE 2.2). */
export type RawHtml = string

/** Railway undertaking actually running the train. Unrecognised → `OTHER` (ADR-008). */
export type Operator = 'TRENITALIA' | 'ITALO' | 'TRENORD' | 'OTHER'

export type TrainCategory =
  | 'HIGH_SPEED'
  | 'INTERCITY'
  | 'REGIONAL'
  | 'REGIONAL_FAST'
  | 'SUBURBAN'
  | 'BUS'
  | 'OTHER'

export type TrainStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'PARTIAL' | 'REROUTED' | 'IMMINENT'

export type Platform = {
  scheduled: string | null
  /** Set once the station commits to a track. Distinct from `scheduled` being absent. */
  actual: string | null
  isConfirmed: boolean
}

export type ViaStop = {
  name: string
  /** `HH:MM` as printed by RFI. Not an instant: the popup carries no date. */
  time: string
}

export type BoardRow = {
  operator: Operator
  /** What the traveller recognises: "Frecciarossa", "Malpensa Express". `null` if unknown. */
  brand: string | null
  category: TrainCategory
  /** Alphanumeric: `9612`, `CB710`. Never parsed as a number. */
  trainNumber: string
  /** `YYYY-MM-DD`, local date of *this* stop, read from the DOM (ARCHITECTURE 5.1). */
  serviceDate: string
  /** Destination on a departures board, origin on an arrivals board. */
  headsign: string
  viaStops: ViaStop[]
  /** ISO 8601 with offset, reconstructed server-side in `Europe/Rome`. */
  scheduledTime: string
  /** `null` means on time — a statement, not missing data. */
  delayMinutes: number | null
  platform: Platform
  status: TrainStatus
  /** RFI's blinking dot: the train is about to arrive or depart. */
  blinking: boolean
}

export type StationBoard = {
  stationId: string
  stationName: string
  mode: BoardMode
  /** ISO 8601. When the data was read from RFI. Always present, always truthful. */
  generatedAt: string
  /** Served from expired cache while a refresh is in flight, or after a failed read. */
  isStale: boolean
  rows: BoardRow[]
  /** Board-level announcements, addressed to the station rather than to one train. */
  notices: string[]
}

export type Station = {
  /** Public identifier. Immutable once published (ADR-007). */
  slug: string
  /** Display name. May change without the slug changing. */
  name: string
  /** Alternative slugs, redirected to `slug`. */
  aliases: string[]
  /** RFI's opaque id. Never appears in a URL, a payload or a favourite. */
  rfiPlaceId: string
  lat: number
  lon: number
  city: string
  isMajor: boolean
  /** ISO date of the last existence check against RFI. */
  checkedAt: string
  /** Set when the station is no longer served. The slug keeps answering. */
  retiredAt?: string
}

/**
 * Everything this package needs from a cache, and nothing more.
 *
 * The concrete client is injected by the caller: `packages/core` has no runtime dependency
 * on Redis, on Next, or on a deployment target (ADR-002, ADR-005). An in-memory
 * implementation is enough to test the lock and the stale-while-revalidate window.
 */
export interface BoardCache {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  /** `SET key 1 NX EX ttl`. `true` when the lock was taken, `false` when it was already held. */
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>
  release(key: string): Promise<void>
  /** `LPUSH` + `LTRIM`: append to a capped list, e.g. `health:rfi` keeping the last 100. */
  pushCapped(key: string, value: string, keep: number): Promise<void>
  addToSet(key: string, member: string): Promise<void>
  /** `INCR` + `EXPIRE`: returns the counter for the current window. Token bucket towards RFI. */
  incrementWindow(key: string, windowSeconds: number): Promise<number>
}

/** Injected clock. Time arithmetic happens server-side, and tests must be able to lie about now. */
export type Clock = () => Date

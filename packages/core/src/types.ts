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

/**
 * Commercial brand the traveller recognises. **Our** controlled vocabulary — the values
 * `VETTORE_TABLE` produces, not raw RFI text, so it may cross the API boundary like every
 * other enum here. Unrecognised vettore → `null`, never a guessed brand (ADR-008).
 *
 * Spelled as a union rather than `string` on purpose: the UI ships one logo asset per
 * brand, and a brand added to the parser without a presentation entry has to be a
 * typecheck error, not a silently empty logo slot.
 */
export type Brand =
  | 'Trenitalia'
  | 'Frecciarossa'
  | 'Frecciargento'
  | 'Frecciabianca'
  | 'Intercity'
  | 'Intercity Notte'
  | 'Leonardo Express'
  | 'Italo'
  | 'Trenord'
  | 'Malpensa Express'

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
  brand: Brand | null
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
  /**
   * The station's **slug**, not RFI's place id (`store.ts` writes it that way): the public
   * identifier, safe to put in a URL, which is exactly what the UI does with it when it
   * builds a train's own page from a board (ADR-007, ADR-012).
   */
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
 * Everything `store.ts` needs, shaped around what it actually does rather than around raw
 * Redis verbs. The concrete client — and the literal key schema — lives behind
 * `createRedisBoardStore` (ADR-002, ADR-005): `packages/core` still has no *runtime*
 * dependency on Next or on a deployment target, but it is the one place allowed to know
 * both Redis and the schema, so the two stay merged instead of split across a generic cache
 * param and a separately-exported `keys` table.
 */
export interface BoardStore {
  getBoard(placeId: string, mode: BoardMode): Promise<StationBoard | null>
  /** Written with the Redis key TTL (`TTL.key`, 90 s) — beyond that it is gone by itself. */
  saveBoard(placeId: string, mode: BoardMode, board: StationBoard): Promise<void>
  /** `SET lock:{placeId}:{mode} 1 NX EX 15`. `true` when taken, `false` when already held. */
  acquireBoardLock(placeId: string, mode: BoardMode): Promise<boolean>
  releaseBoardLock(placeId: string, mode: BoardMode): Promise<void>
  /** Appends to `health:rfi`, capped at the last 100 outcomes (ARCHITECTURE 8). */
  logHealthOutcome(outcome: { status: number; latencyMs: number }): Promise<void>
  /** Feeds `unknown:*` so an unrecognised RFI value becomes noisy, not silent (ADR-008). */
  recordUnknown(kind: 'vettore' | 'categoria' | 'status', value: string): Promise<void>
  /** Token bucket towards RFI. `false` means the 5 req/s global ceiling is spent. */
  checkRateLimit(): Promise<boolean>
}

/** Injected clock. Time arithmetic happens server-side, and tests must be able to lie about now. */
export type Clock = () => Date

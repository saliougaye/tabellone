/**
 * Pure presentation mappings: domain enums → labels, colour tokens and layout hints.
 * Explicit lookup tables, never text heuristics (ADR-008 applies to the UI too: an
 * unexpected enum value falls back to the neutral entry, it never invents a colour).
 *
 * Time values stay absolute ISO strings until the last moment; the only client-side
 * arithmetic allowed here is instant + delay minutes and "minutes since", both
 * timezone-safe because they operate on instants, not on wall-clock fields.
 */
import type { BoardRow, Operator, TrainCategory } from '@tabellone/core'
import { strings } from '@/strings'

/** Operator mark: solid tile with a 2–3 letter monochrome sigla. Never a fetched logo. */
export const operatorMark: Record<Operator, { sigla: string; colorVar: string }> = {
  TRENITALIA: { sigla: 'FS', colorVar: 'var(--identity-trenitalia)' },
  ITALO: { sigla: 'IT', colorVar: 'var(--identity-italo)' },
  TRENORD: { sigla: 'TN', colorVar: 'var(--identity-trenord)' },
  /* Unknown operator: "non disponibile", not a dash. ADR-008 says an unrecognised value
     shows as OTHER and gets recorded; the tile should say so in letters, like every other
     tile on the board. */
  OTHER: { sigla: 'ND', colorVar: 'var(--identity-neutral)' },
}

export const categoryLabel: Record<TrainCategory, string> = {
  HIGH_SPEED: strings.categoryHighSpeed,
  INTERCITY: strings.categoryIntercity,
  REGIONAL: strings.categoryRegional,
  REGIONAL_FAST: strings.categoryRegionalFast,
  SUBURBAN: strings.categorySuburban,
  BUS: strings.categoryBus,
  OTHER: strings.categoryOther,
}

/** The visible service name: commercial brand when known, category label otherwise. */
export function serviceLabel(row: Pick<BoardRow, 'brand' | 'category'>): string {
  return row.brand ?? categoryLabel[row.category] ?? strings.categoryOther
}

/**
 * Weight and colour of the service name where it is set as text — the logo slot's fallback
 * for every brand we ship no asset for. Category rather than brand because that is what
 * the hierarchy is built on: high speed reads heaviest, regional recedes, and BUS keeps a
 * colour of its own (it is an ordinary category, but the one that is not a train).
 */
export const categoryStyle: Record<TrainCategory, { weightVar: string; colorVar: string }> = {
  HIGH_SPEED: { weightVar: 'var(--weight-max)', colorVar: 'var(--text-primary)' },
  INTERCITY: { weightVar: 'var(--weight-strong)', colorVar: 'var(--text-primary)' },
  REGIONAL: { weightVar: 'var(--weight-regular)', colorVar: 'var(--identity-mono)' },
  REGIONAL_FAST: { weightVar: 'var(--weight-regular)', colorVar: 'var(--identity-mono)' },
  SUBURBAN: { weightVar: 'var(--weight-regular)', colorVar: 'var(--identity-mono)' },
  BUS: { weightVar: 'var(--weight-strong)', colorVar: 'var(--bus-text)' },
  OTHER: { weightVar: 'var(--weight-regular)', colorVar: 'var(--identity-mono)' },
}

/** Operator in full, for the mark's accessible name. Unknown stays unnamed — never guessed. */
const operatorName: Record<Operator, string | null> = {
  TRENITALIA: strings.operatorTrenitalia,
  ITALO: strings.operatorItalo,
  TRENORD: strings.operatorTrenord,
  OTHER: null,
}

/**
 * The mark's accessible name. Logo slot and operator tile are one image to a screen
 * reader, so they carry one label between them, and it names both halves: the service
 * ("Regionale") and who runs it — which is the whole point of the tile, since a regional
 * train may be Trenitalia's or Trenord's. Skipped only when the two would repeat.
 */
export function serviceMarkLabel(row: Pick<BoardRow, 'brand' | 'category' | 'operator'>): string {
  const service = serviceLabel(row)
  const operator = operatorName[row.operator]
  if (!operator || service === operator) return service
  return `${service} · ${operator}`
}

const timeFormat = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Rome',
})

/** HH:MM in Europe/Rome from an absolute ISO timestamp. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/**
 * The time shown big on the board: scheduled, or scheduled + delay when late.
 * Instant arithmetic (ms), then formatted in Europe/Rome — DST-safe by construction.
 */
export function displayedTime(row: Pick<BoardRow, 'scheduledTime' | 'delayMinutes' | 'status'>): {
  time: string
  replacedTime: string | null
} {
  const delayed = row.status === 'DELAYED' && (row.delayMinutes ?? 0) > 0
  if (!delayed) return { time: formatTime(row.scheduledTime), replacedTime: null }
  const actual = new Date(
    new Date(row.scheduledTime).getTime() + (row.delayMinutes ?? 0) * 60_000,
  ).toISOString()
  return { time: formatTime(actual), replacedTime: formatTime(row.scheduledTime) }
}

/** Whole minutes elapsed since an ISO instant, clamped at zero. */
export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000))
}

/** How far the data on screen can be trusted: the live dot, the stale strip and the dimmed platforms. */
export type BoardTrust = {
  kind: 'live' | 'stale' | 'offline'
  /** Whole minutes since RFI was last read. */
  minutes: number
}

/** The board is "live" until it is this old, or flagged stale by the server. */
export const STALE_AFTER_MINUTES = 2

/**
 * Whether the board in hand can be trusted. Offline wins over everything (the device has no
 * route, whatever the board says); then the server's own `isStale`, a poll that failed while a
 * board is in hand, or a board two minutes old. `null` only when there is no board and the
 * device is online — nothing to say yet (it is loading, or it is the error state).
 */
export function boardTrust(
  board: { generatedAt: string; isStale: boolean } | null,
  context: { online: boolean; pollFailed: boolean },
  now: Date,
): BoardTrust | null {
  if (!board) return context.online ? null : { kind: 'offline', minutes: 0 }
  // Whole minutes, floored: "two minutes old" means two, not a minute and a half.
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(board.generatedAt)) / 60_000))
  if (!context.online) return { kind: 'offline', minutes }
  if (board.isStale || context.pollFailed || minutes >= STALE_AFTER_MINUTES)
    return { kind: 'stale', minutes }
  return { kind: 'live', minutes }
}

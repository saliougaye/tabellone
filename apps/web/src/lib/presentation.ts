/**
 * Pure presentation mappings: domain enums → labels, colour tokens and layout hints.
 * Explicit lookup tables, never text heuristics (ADR-008 applies to the UI too: an
 * unexpected enum value falls back to the neutral entry, it never invents a colour).
 *
 * Time values stay absolute ISO strings until the last moment; the only client-side
 * arithmetic allowed here is instant + delay minutes and "minutes since", both
 * timezone-safe because they operate on instants, not on wall-clock fields.
 */
import type { BoardMode, BoardRow, Operator, TrainCategory } from '@tabellone/core'
import { strings } from '@/strings'

/** Operator mark: solid tile with a 2–3 letter monochrome sigla. Never a fetched logo. */
export const operatorMark: Record<Operator, { sigla: string; colorVar: string }> = {
  TRENITALIA: { sigla: 'FS', colorVar: 'var(--identity-trenitalia)' },
  ITALO: { sigla: 'IT', colorVar: 'var(--identity-italo)' },
  TRENORD: { sigla: 'TN', colorVar: 'var(--identity-trenord)' },
  OTHER: { sigla: '—', colorVar: 'var(--identity-neutral)' },
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

export type StatusPresentation = {
  label: string
  colorVar: string
  weightVar: string
  /** Cancelled rows strike through time and headsign. */
  struck: boolean
}

const SEVERE_DELAY_MINUTES = 10

export function statusPresentation(
  row: Pick<BoardRow, 'status' | 'delayMinutes'>,
  mode: BoardMode,
): StatusPresentation {
  switch (row.status) {
    case 'CANCELLED':
      return {
        label: strings.statusCancelled,
        colorVar: 'var(--state-cancelled)',
        weightVar: 'var(--weight-max)',
        struck: true,
      }
    case 'PARTIAL':
      return {
        label: strings.statusPartial,
        colorVar: 'var(--state-cancelled-partial)',
        weightVar: 'var(--weight-max)',
        struck: false,
      }
    case 'REROUTED':
      return {
        label: strings.statusRerouted,
        colorVar: 'var(--state-rerouted)',
        weightVar: 'var(--weight-max)',
        struck: false,
      }
    case 'IMMINENT':
      return {
        label:
          mode === 'departures' ? strings.statusImminentDeparture : strings.statusImminentArrival,
        colorVar: 'var(--state-departure)',
        weightVar: 'var(--weight-max)',
        struck: false,
      }
    case 'DELAYED': {
      const minutes = row.delayMinutes ?? 0
      const severe = minutes >= SEVERE_DELAY_MINUTES
      return {
        label: strings.statusDelay(minutes),
        colorVar: severe ? 'var(--state-delay-severe)' : 'var(--state-delay-minor)',
        weightVar: severe ? 'var(--weight-max)' : 'var(--weight-strong)',
        struck: false,
      }
    }
    default:
      return {
        label: strings.statusOnTime,
        colorVar: 'var(--state-on-time)',
        weightVar: 'var(--weight-medium)',
        struck: false,
      }
  }
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

/** Freshness caption next to the data dot: "aggiornato ora · 14:22" or the stale form. */
export function freshnessLabel(generatedAt: string, isStale: boolean, now: Date): string {
  if (isStale) {
    // Going offline flags the board stale straight away, when it is still seconds old:
    // "Dati di 0 min fa" would be a number saying nothing.
    const minutes = minutesSince(generatedAt, now)
    return minutes < 1 ? strings.staleDataFresh : strings.staleData(minutes)
  }
  return `${strings.updatedNow} · ${formatTime(generatedAt)}`
}

/** 3-letter sigla for the route strip dots, derived from the stop name for display only. */
export function stopSigla(name: string): string {
  return name
    .replace(/[^\p{L}]/gu, '')
    .slice(0, 3)
    .toUpperCase()
}

'use client'

/**
 * The four row shapes of the board, from design sheets 10–11: the desktop rich row
 * (time · center · route · platform, expandable), the desktop "later" compact row, the
 * mobile hero card and the mobile list row. All purely presentational: `BoardRow` in,
 * pixels out — the row knows nothing about fetching or polling.
 */
import type { BoardMode, BoardRow, TrainCategory } from '@tabellone/core'
import { useState } from 'react'
import { displayedTime, serviceLabel, statusPresentation } from '@/lib/presentation'
import { strings } from '@/strings'
import { OperatorMark, PlatformBox, RouteStrip, StopsDetail } from './parts'

const categoryStyle: Record<TrainCategory, { weightVar: string; colorVar: string }> = {
  HIGH_SPEED: { weightVar: 'var(--weight-max)', colorVar: 'var(--text-primary)' },
  INTERCITY: { weightVar: 'var(--weight-strong)', colorVar: 'var(--text-primary)' },
  REGIONAL: { weightVar: 'var(--weight-regular)', colorVar: 'var(--text-secondary)' },
  REGIONAL_FAST: { weightVar: 'var(--weight-regular)', colorVar: 'var(--text-secondary)' },
  SUBURBAN: { weightVar: 'var(--weight-regular)', colorVar: 'var(--text-secondary)' },
  BUS: { weightVar: 'var(--weight-strong)', colorVar: 'var(--bus-text)' },
  OTHER: { weightVar: 'var(--weight-regular)', colorVar: 'var(--text-secondary)' },
}

function rowView(row: BoardRow, mode: BoardMode) {
  const status = statusPresentation(row, mode)
  const times = displayedTime(row)
  const cancelled = row.status === 'CANCELLED'
  const imminent = row.status === 'IMMINENT'
  return {
    status,
    times,
    cancelled,
    imminent,
    category: categoryStyle[row.category] ?? categoryStyle.OTHER,
    timeColor: cancelled
      ? 'var(--text-tertiary)'
      : row.status === 'DELAYED'
        ? status.colorVar
        : 'var(--text-primary)',
    headsignColor: cancelled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    strike: status.struck ? 'line-through' : 'none',
    borderClass: imminent || row.blinking ? 'border-line-strong' : 'border-line',
    haloClass: row.blinking ? 'animate-halo-pulse' : '',
  }
}

/** Desktop rich row: four zones, click opens the "Ferma a" detail. */
export function RichRow({
  row,
  mode,
  originName,
}: {
  row: BoardRow
  mode: BoardMode
  originName: string
}) {
  const [open, setOpen] = useState(false)
  const v = rowView(row, mode)

  return (
    <div
      className={`rounded-minimal border bg-surface-raised transition-[border-color] ${v.borderClass} ${v.haloClass}`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="grid w-full cursor-pointer items-center text-left"
        style={{
          gridTemplateColumns: 'var(--rich-row-columns)',
          gap: 'var(--rich-row-gap)',
          padding: 'var(--rich-row-padding)',
        }}
      >
        <div className="flex min-w-0 flex-col gap-2">
          {v.times.replacedTime && (
            <span className="text-text-tertiary line-through type-secondary">
              {v.times.replacedTime}
            </span>
          )}
          <span className="type-dominant" style={{ color: v.timeColor, textDecoration: v.strike }}>
            {v.times.time}
          </span>
          <span
            className="min-h-[18px] type-secondary"
            style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
          >
            {v.status.label}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap type-primary-wide"
            style={{
              color: v.headsignColor,
              fontWeight: 'var(--weight-max)',
              textDecoration: v.strike,
            }}
          >
            {row.headsign}
          </span>
          <div className="flex min-w-0 items-center gap-(--mark-gap)">
            <OperatorMark operator={row.operator} cancelled={v.cancelled} />
            <span
              className="whitespace-nowrap"
              style={{
                fontSize: 'var(--category-size)',
                fontWeight: v.category.weightVar,
                color: v.cancelled ? 'var(--text-tertiary)' : v.category.colorVar,
              }}
            >
              {serviceLabel(row)}
            </span>
            <span className="whitespace-nowrap text-text-tertiary type-tertiary">
              {row.trainNumber}
            </span>
          </div>
        </div>

        <div className="min-w-0" style={{ display: 'var(--route-visibility)' }}>
          {row.viaStops.length > 0 && (
            <RouteStrip originName={originName} viaStops={row.viaStops} cancelled={v.cancelled} />
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-text-tertiary type-label">{strings.platform}</span>
          <PlatformBox platform={row.platform} large />
        </div>
      </button>

      {open && row.viaStops.length > 0 && <StopsDetail viaStops={row.viaStops} mode={mode} />}
    </div>
  )
}

/** Desktop "Più tardi" row: schedule, headsign, mark, platform digit — nothing else. */
export function LaterRow({ row, mode }: { row: BoardRow; mode: BoardMode }) {
  const v = rowView(row, mode)
  return (
    <div
      className="grid items-center rounded-minimal border border-line bg-surface-raised px-6 py-4"
      style={{ gridTemplateColumns: 'var(--compact-row-columns)', gap: 'var(--rich-row-gap)' }}
    >
      <span
        className="type-primary"
        style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}
      >
        {v.times.time}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <span
          className="type-primary"
          style={{
            fontWeight: 'var(--weight-strong)',
            color: v.headsignColor,
            textDecoration: v.strike,
          }}
        >
          {row.headsign}
        </span>
        <div className="flex items-center gap-(--mark-gap)">
          <OperatorMark operator={row.operator} cancelled={v.cancelled} />
          <span className="text-text-tertiary type-tertiary">
            {serviceLabel(row)} {row.trainNumber}
          </span>
        </div>
      </div>
      <div className="flex items-baseline justify-end gap-2">
        <span className="text-text-tertiary type-label">{strings.platformShort}</span>
        <PlatformBox platform={row.platform} />
      </div>
    </div>
  )
}

/** Mobile hero: the next train, in a card with the route strip and the halo pulse. */
export function HeroCard({
  row,
  mode,
  originName,
}: {
  row: BoardRow
  mode: BoardMode
  originName: string
}) {
  const v = rowView(row, mode)
  const last = row.viaStops.at(-1)
  return (
    <section
      className={`relative flex flex-col gap-4 overflow-hidden rounded-minimal border border-line-strong bg-surface-raised px-4 py-5 ${v.haloClass}`}
    >
      <svg
        viewBox="0 0 16 16"
        width="230"
        height="230"
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute opacity-5"
        style={{ right: '-54px', bottom: '-66px' }}
        aria-hidden="true"
      >
        <path d="M2 10.6V7.1L6.2 4.4h7.3v6.2H2zM8.9 4.5v6.1M1.5 13h13" />
      </svg>

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-(--mark-gap)">
            <OperatorMark operator={row.operator} cancelled={v.cancelled} />
            <span className="whitespace-nowrap text-text-tertiary type-tertiary">
              {row.trainNumber}
            </span>
          </div>
          <span
            className="type-primary"
            style={{
              fontWeight: 'var(--weight-max)',
              color: v.headsignColor,
              textDecoration: v.strike,
            }}
          >
            {row.headsign}
          </span>
          <span
            className="type-secondary"
            style={{
              fontWeight: v.category.weightVar,
              color: v.cancelled ? 'var(--text-tertiary)' : v.category.colorVar,
            }}
          >
            {serviceLabel(row)}
          </span>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          {v.times.replacedTime && (
            <span className="text-text-tertiary line-through type-secondary">
              {v.times.replacedTime}
            </span>
          )}
          <span className="type-dominant" style={{ color: v.timeColor }}>
            {v.times.time}
          </span>
          <span
            className="type-secondary"
            style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
          >
            {v.status.label}
          </span>
        </div>
      </div>

      {row.viaStops.length > 0 && (
        <RouteStrip originName={originName} viaStops={row.viaStops} cancelled={v.cancelled} />
      )}

      <div className="relative flex items-end justify-between gap-4 border-t border-line pt-3">
        <div className="flex flex-col gap-2">
          <span className="text-text-tertiary type-label">{strings.platform}</span>
          <PlatformBox platform={row.platform} large />
        </div>
        {last && (
          <div className="flex flex-col items-end gap-2">
            <span className="text-text-tertiary type-label">
              {mode === 'departures' ? strings.terminusArrival : strings.terminusDeparted}
            </span>
            <span
              className="type-primary"
              style={{ fontWeight: 'var(--weight-strong)', color: 'var(--text-secondary)' }}
            >
              {v.cancelled ? strings.platformUnassigned : lastTime(row)}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

function lastTime(row: BoardRow): string {
  const last = row.viaStops.at(-1)
  // last.time is a bare "HH:MM" as RFI printed it in the popup — no serviceDate to anchor it
  // to (types.ts), so it isn't an ISO instant and must not go through formatTime.
  return last ? last.time : strings.platformUnassigned
}

/** Mobile list row: two bands, expandable "Ferma a" detail. */
export function CompactRow({ row, mode }: { row: BoardRow; mode: BoardMode }) {
  const [open, setOpen] = useState(false)
  const v = rowView(row, mode)
  return (
    <div className={`rounded-minimal border bg-surface-raised ${v.borderClass} ${v.haloClass}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="grid w-full cursor-pointer items-center gap-3 text-left min-h-(--touch-min)"
        style={{
          gridTemplateColumns: 'var(--column-countdown) minmax(0, 1fr) auto',
          padding: 'var(--row-padding-y) var(--row-padding-x)',
        }}
      >
        <div className="flex flex-col gap-1">
          {v.times.replacedTime && (
            <span className="text-text-tertiary line-through type-tertiary">
              {v.times.replacedTime}
            </span>
          )}
          <span
            className="type-primary"
            style={{
              fontWeight: 'var(--weight-max)',
              color: v.timeColor,
              textDecoration: v.strike,
            }}
          >
            {v.times.time}
          </span>
          <span
            className="type-tertiary"
            style={{ color: v.status.colorVar, fontWeight: v.status.weightVar }}
          >
            {v.status.label}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap type-primary"
            style={{
              fontWeight: 'var(--weight-strong)',
              color: v.headsignColor,
              textDecoration: v.strike,
            }}
          >
            {row.headsign}
          </span>
          <div className="flex min-w-0 items-center gap-(--mark-gap)">
            <OperatorMark operator={row.operator} cancelled={v.cancelled} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-text-tertiary type-tertiary">
              {serviceLabel(row)} {row.trainNumber}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-text-tertiary type-label">{strings.platformShort}</span>
          <PlatformBox platform={row.platform} />
        </div>
      </button>
      {open && row.viaStops.length > 0 && <StopsDetail viaStops={row.viaStops} mode={mode} />}
    </div>
  )
}

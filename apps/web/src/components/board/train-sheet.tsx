'use client'

/**
 * One train, opened from its card: a sheet from the bottom on a phone, a centred dialog from
 * 640px. The same route block as the card, the stops as a rail with the train marker at this
 * station, and the way to the train's own page (ADR-012).
 */
import { ArrowRight, Train, X } from '@phosphor-icons/react'
import type { BoardMode, BoardRow } from '@tabellone/core'
import Link from 'next/link'
import { useEffect } from 'react'
import { countdownLabel, minutesUntil, titleCase } from '@/lib/format'
import { displayedTime, serviceLabel } from '@/lib/presentation'
import { trainDetailPath } from '@/lib/train-routes'
import { strings } from '@/strings'
import { RouteBlock, Service, StateBadge } from './parts'

export function StopsRail({
  row,
  mode,
  stationName,
}: {
  row: BoardRow
  mode: BoardMode
  stationName: string
}) {
  const times = displayedTime(row)
  const platform = row.platform.actual ?? row.platform.scheduled
  const here = { name: stationName, time: times.time }
  const stops = mode === 'departures' ? [here, ...row.viaStops] : [...row.viaStops, here]
  return (
    <ul className="sh-rail">
      {stops.map((stop, index) => {
        const isHere = stop === here
        return (
          <li
            key={`${stop.name}-${stop.time}`}
            data-here={isHere}
            data-end={index === 0 || index === stops.length - 1}
          >
            <span className="t">{stop.time}</span>
            <span className="dot">{isHere && <Train size={12} weight="fill" />}</span>
            <span className="n">
              {titleCase(stop.name)}
              {isHere && (
                <small>
                  {strings.platformShort.toLowerCase()} {platform ?? strings.platformUnassigned}
                </small>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function TrainSheet({
  row,
  mode,
  slug,
  stationName,
  now,
  onClose,
}: {
  row: BoardRow
  mode: BoardMode
  slug: string
  stationName: string
  now: Date
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <button type="button" className="sh-veil" aria-label={strings.closeSheet} onClick={onClose} />
      <section className="sh-sheet" aria-label={`Treno ${row.trainNumber}`}>
        <header>
          <div style={{ minWidth: 0 }}>
            <small>
              {serviceLabel(row)} {row.trainNumber} · {countdownLabel(minutesUntil(row, now))}
            </small>
            <h2>
              {mode === 'departures' ? strings.toPrefix : strings.fromPrefix}
              {titleCase(row.headsign)}
            </h2>
          </div>
          <button
            type="button"
            className="sh-btn ghost icon"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
            aria-label={strings.closeSheet}
          >
            <X size={16} />
          </button>
        </header>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StateBadge row={row} mode={mode} />
          <Service row={row} />
        </div>
        <RouteBlock row={row} mode={mode} stationName={stationName} />
        <hr className="sh-sep" />
        <StopsRail row={row} mode={mode} stationName={stationName} />
        <Link className="sh-btn primary lg" href={trainDetailPath(slug, mode, row.trainNumber)}>
          {strings.trainDetail}
          <ArrowRight size={16} />
        </Link>
      </section>
    </>
  )
}

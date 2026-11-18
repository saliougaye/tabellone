'use client'

/**
 * The board's header, "Cerca prima" (seventh pass): the station and the clock are one small
 * line (the station is a button — it opens the switcher), the search field is the largest
 * control on the screen and sticks to the top while the tickets scroll under it, and
 * Partenze/Arrivi are two equal tabs. Once the bar has stuck, a swap button appears inside it
 * so the mode can change without scrolling back up. Operator chips come last, and only when
 * there are rows to filter.
 *
 * The clock carries the live dot ("dal vivo", "dati di N min fa", "offline"), and while the data
 * is old or the device offline the sticky bar holds the stale strip — so it is in view all the
 * way down the list (`board-states.tsx`).
 */
import { ArrowsLeftRight, CaretDown, CaretLeft } from '@phosphor-icons/react'
import type { BoardMode } from '@tabellone/core'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ClockFace } from '@/components/ui/clock-face'
import { SearchField } from '@/components/ui/search-field'
import type { OperatorFilter } from '@/lib/board-view'
import { titleCase } from '@/lib/format'
import { skipHomeRedirect } from '@/lib/last-station'
import type { BoardTrust } from '@/lib/presentation'
import { strings } from '@/strings'
import { LiveDot, StaleStrip } from './board-states'
import { OPERATOR_FILTERS } from './ticket-list'

export function BoardHeader({
  stationName,
  onOpenSwitcher,
  query,
  onQuery,
  mode,
  onMode,
  counts,
  operator,
  onOperator,
  hasRows,
  trust,
  generatedAt,
  onRetry,
}: {
  stationName: string
  onOpenSwitcher: () => void
  query: string
  onQuery: (value: string) => void
  mode: BoardMode
  onMode: (mode: BoardMode) => void
  counts: Partial<Record<OperatorFilter, number>>
  operator: OperatorFilter
  onOperator: (operator: OperatorFilter) => void
  hasRows: boolean
  /** How far the data can be trusted; `null` while there is nothing to say. */
  trust: BoardTrust | null
  /** When the board in hand was read, `null` without one (then there is no strip). */
  generatedAt: string | null
  onRetry: () => void
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  // The bar is stuck once the 1px sentinel above it has scrolled away.
  useEffect(() => {
    if (!sentinel.current) return
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry?.isIntersecting))
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [])

  const showStrip = trust !== null && trust.kind !== 'live' && generatedAt !== null
  const other: BoardMode = mode === 'departures' ? 'arrivals' : 'departures'
  return (
    <>
      <div className="hd-cerca-top">
        <div className="hd-lead">
          {/* A deliberate way home: the redirect to the last board must not bounce it back. */}
          <Link
            href="/"
            className="hd-home"
            aria-label={strings.backHome}
            onClick={skipHomeRedirect}
          >
            <CaretLeft weight="bold" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="hd-station"
            data-size="sm"
            onClick={onOpenSwitcher}
            aria-haspopup="dialog"
            aria-label={strings.stationChangeAria(titleCase(stationName))}
          >
            <b>
              <span>{titleCase(stationName)}</span>
              <i>
                <CaretDown weight="bold" aria-hidden="true" />
              </i>
            </b>
          </button>
        </div>
        <span className="st-clock">
          <ClockFace />
          <LiveDot trust={trust} />
        </span>
      </div>
      <div ref={sentinel} aria-hidden="true" className="hd-sentinel" />
      <div className="hd-cerca" data-stuck={stuck} data-wrap={showStrip}>
        <SearchField
          value={query}
          onChange={onQuery}
          label={strings.filterSearchAria}
          placeholder={strings.filterSearchPlaceholder}
        />
        <button
          type="button"
          className="hd-swap-in"
          data-show={stuck}
          aria-hidden={!stuck}
          tabIndex={stuck ? 0 : -1}
          onClick={() => onMode(other)}
          aria-label={other === 'arrivals' ? strings.switchToArrivals : strings.switchToDepartures}
        >
          <ArrowsLeftRight weight="bold" aria-hidden="true" />
          <span>{other === 'arrivals' ? strings.arrivals : strings.departures}</span>
        </button>
        <StaleStrip trust={trust} generatedAt={generatedAt} onRetry={onRetry} />
      </div>
      <fieldset className="hd-tabs" data-mode={mode}>
        <legend className="sr-only">{strings.modeAria}</legend>
        {(['departures', 'arrivals'] as BoardMode[]).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => onMode(m)}>
            {m === 'departures' ? strings.departures : strings.arrivals}
          </button>
        ))}
      </fieldset>
      {hasRows && (
        <fieldset className="hd-chips">
          <legend className="sr-only">{strings.operatorFilterAria}</legend>
          {OPERATOR_FILTERS.filter((o) => o.key === 'all' || (counts[o.key] ?? 0) > 0).map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={operator === o.key}
              onClick={() => onOperator(o.key)}
            >
              {o.dot && <i style={{ background: o.dot }} aria-hidden="true" />}
              {o.label}
              <small>{counts[o.key] ?? 0}</small>
            </button>
          ))}
        </fieldset>
      )}
    </>
  )
}

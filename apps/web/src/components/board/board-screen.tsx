'use client'

/**
 * The board (ARCHITECTURE 4.1), in the Rotta pass: the station head (city, follow pill, the
 * name as the switcher), the departures/arrivals switch, search and filters over the board in hand, the next
 * train as a big flight card, then every other train as a card grouped by how soon it
 * leaves. Tapping a card opens the train's sheet. Polls `/api/board/:slug` every 20 s
 * through `useBoard` (ADR-006) and records the visit for the home.
 *
 * Rows are ordered by expected time, not by RFI's scheduled order: a countdown-first screen
 * must put the train that actually leaves next at the top.
 */
import { CaretDown, Funnel, Info, MagnifyingGlass, X } from '@phosphor-icons/react'
import type { BoardMode, Operator } from '@tabellone/core'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type BoardFilter,
  chipCategories,
  emptyFilter,
  filterRows,
  isFilterActive,
} from '@/lib/board-filter'
import { canonicalBoardPath } from '@/lib/board-routes'
import { countdownLabel, MODE_LABEL, minutesUntil, useNow } from '@/lib/format'
import { recordLastStation } from '@/lib/last-station'
import { categoryLabel, freshnessLabel } from '@/lib/presentation'
import { isFavourite, recordVisit, toggleFavourite } from '@/lib/saved-stations'
import { useBoard } from '@/lib/use-board'
import { strings } from '@/strings'
import { FiltersSheet, OPERATORS } from './filters-sheet'
import { FlightCard, Message, rowKey } from './parts'
import { StationBanner } from './station-banner'
import { TrainSheet } from './train-sheet'

export function BoardScreen({
  slug,
  initialMode,
  catalogName,
  city,
}: {
  slug: string
  initialMode: BoardMode
  /** The station's catalogue name, free at build time, so the banner never shows a slug. */
  catalogName?: string
  city?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<BoardMode>(initialMode)
  const { board, loading, error, refresh } = useBoard(slug, mode)
  const stationName = board?.stationName ?? catalogName ?? slug
  const now = useNow(30_000)
  const [fav, setFav] = useState(false)
  const [filter, setFilter] = useState<BoardFilter>(emptyFilter)
  const [operators, setOperators] = useState<Operator[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    recordVisit(slug, stationName)
    setFav(isFavourite(slug))
  }, [slug, stationName])
  // The mode is part of the URL (ADR-011): switching it moves to the canonical path, and the
  // home's session redirect remembers where the reader was.
  useEffect(() => {
    recordLastStation(slug, mode)
  }, [slug, mode])
  const switchMode = (next: BoardMode) => {
    if (next === mode) return
    setMode(next)
    setOpen(null)
    router.replace(canonicalBoardPath(slug, next), { scroll: false })
  }

  const allRows = board?.rows ?? []
  const activeCount = filter.categories.length + operators.length
  const filtering = isFilterActive(filter) || operators.length > 0
  const chips = useMemo(
    () => chipCategories(allRows, filter.categories),
    [allRows, filter.categories],
  )
  const presentOperators = useMemo(() => {
    const present = new Set([...allRows.map((r) => r.operator), ...operators])
    return OPERATORS.filter((o) => present.has(o.id))
  }, [allRows, operators])
  const rows = useMemo(
    () =>
      filterRows(allRows, filter)
        .filter((r) => operators.length === 0 || operators.includes(r.operator))
        .sort((a, b) => minutesUntil(a, now) - minutesUntil(b, now)),
    [allRows, filter, operators, now],
  )
  const [hero, ...rest] = rows.filter((r) => r.status !== 'CANCELLED')
  const cancelled = rows.filter((r) => r.status === 'CANCELLED')
  const openRow = rows.find((r) => rowKey(r) === open) ?? null
  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  const reset = () => {
    setFilter(emptyFilter)
    setOperators([])
  }

  // What follows the hero, by how soon; cancelled trains close the list.
  const soon = rest.filter((r) => minutesUntil(r, now) <= 30)
  const hour = rest.filter((r) => minutesUntil(r, now) > 30 && minutesUntil(r, now) <= 60)
  const later = rest.filter((r) => minutesUntil(r, now) > 60)
  const groups = [
    { label: filtering ? strings.otherFound : strings.withinHalfHour, rows: soon },
    { label: strings.withinHour, rows: hour },
    { label: strings.later, rows: later },
    { label: strings.cancelledTrains, rows: cancelled },
  ].filter((g) => g.rows.length > 0)

  return (
    <main className="sh" data-sheet={Boolean(openRow || filtersOpen)}>
      <div className="sh-col">
        <StationBanner
          stationName={stationName}
          city={city}
          favourite={{ active: fav, onToggle: () => setFav(toggleFavourite(slug, stationName)) }}
        />

        <fieldset className="sh-tabs">
          <legend className="sr-only">{strings.appName}</legend>
          {(['departures', 'arrivals'] as BoardMode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </fieldset>

        {allRows.length > 0 && (
          <>
            <div className="sh-find">
              <label className="sh-input">
                <MagnifyingGlass size={16} />
                <span className="sr-only">{strings.filterSearch}</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={filter.query}
                  onChange={(event) => setFilter((f) => ({ ...f, query: event.target.value }))}
                  placeholder={strings.filterPlaceholder}
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {filter.query && (
                  <button
                    type="button"
                    className="clear"
                    aria-label={strings.clearSearch}
                    onClick={() => {
                      setFilter((f) => ({ ...f, query: '' }))
                      searchRef.current?.focus()
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <button
                type="button"
                className="sh-btn outline"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(true)}
              >
                <Funnel size={16} />
                {strings.filters}
                {activeCount > 0 && <span className="count">{activeCount}</span>}
              </button>
            </div>
            {activeCount > 0 && (
              <div className="sh-active">
                {filter.categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="sh-toggle"
                    aria-pressed="true"
                    onClick={() =>
                      setFilter((f) => ({ ...f, categories: toggle(f.categories, category) }))
                    }
                  >
                    {categoryLabel[category]}
                    <X size={12} />
                  </button>
                ))}
                {operators.map((operator) => (
                  <button
                    key={operator}
                    type="button"
                    className="sh-toggle"
                    aria-pressed="true"
                    onClick={() => setOperators((list) => toggle(list, operator))}
                  >
                    {OPERATORS.find((o) => o.id === operator)?.label}
                    <X size={12} />
                  </button>
                ))}
                <button type="button" className="sh-btn ghost" onClick={reset}>
                  {strings.filterClear}
                </button>
              </div>
            )}
          </>
        )}

        {board?.notices.map((notice) => (
          <details className="sh-alert" key={notice}>
            <summary>
              <Info size={16} />
              <span>{notice}</span>
              <CaretDown size={16} />
            </summary>
            <p>{notice}</p>
          </details>
        ))}

        {loading && !board && <Message title={strings.loading} />}
        {error && !board && (
          <Message
            title={strings.fetchFailed}
            hint={strings.fetchFailedHint}
            action={{ label: strings.retry, onClick: refresh }}
          />
        )}
        {board && allRows.length === 0 && (
          <Message title={strings.emptyBoard} hint={strings.emptyBoardHint} />
        )}
        {board && allRows.length > 0 && rows.length === 0 && (
          <Message
            title={strings.filterNoMatch}
            hint={strings.filterNoMatchHint}
            action={{ label: strings.filterClear, onClick: reset }}
          />
        )}

        {hero && (
          <ul className="fl-cards">
            <FlightCard
              row={hero}
              mode={mode}
              now={now}
              stationName={stationName}
              hero
              onOpen={() => setOpen(rowKey(hero))}
            />
          </ul>
        )}
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="sh-sec-h">
              {group.label}
              <span>
                {filtering && group === groups[0]
                  ? strings.filterCount(rows.length, allRows.length)
                  : strings.listCount(group.rows.length)}
              </span>
            </h2>
            <ul className="fl-cards" style={{ marginTop: 10 }}>
              {group.rows.map((row, index) => (
                <FlightCard
                  key={rowKey(row)}
                  row={row}
                  mode={mode}
                  now={now}
                  stationName={stationName}
                  index={index + 1}
                  onOpen={() => setOpen(rowKey(row))}
                />
              ))}
            </ul>
          </section>
        ))}

        {board && (
          <p className="sh-fresh">
            {freshnessLabel(board.generatedAt, board.isStale, now)}
            {board.isStale &&
              ` · ${countdownLabel(0) === strings.now ? strings.staleDataFresh : ''}`}
          </p>
        )}
      </div>

      {openRow && (
        <TrainSheet
          row={openRow}
          mode={mode}
          slug={slug}
          stationName={stationName}
          now={now}
          onClose={() => setOpen(null)}
        />
      )}
      {filtersOpen && (
        <FiltersSheet
          categories={chips}
          operators={presentOperators}
          filter={filter}
          selectedOperators={operators}
          matches={rows.length}
          total={allRows.length}
          onCategory={(category) =>
            setFilter((f) => ({ ...f, categories: toggle(f.categories, category) }))
          }
          onOperator={(operator) => setOperators((list) => toggle(list, operator))}
          onReset={reset}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </main>
  )
}

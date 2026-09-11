'use client'

/**
 * Search and filter over the board the reader already has. Two controls, both client-side:
 * nothing here fetches, and no keystroke reaches RFI (ARCHITECTURE 7 — outbound traffic is
 * proportional to active stations, and a filter must not change that).
 *
 * Collapsed by default, and that is the whole layout decision: the reader of a departure
 * board is standing on a platform in a hurry, and a permanently mounted field plus a chip row
 * would push the next train below the fold to serve the rarer intention. The trigger sits in
 * the reading strip beside the freshness dot, and carries the number of active constraints
 * when the panel is closed, so a filtered board can never look like an empty one.
 *
 * Signage language, like everything else on this screen: rules and bands, no radius, no
 * raised card. The field is the picker's field and the active chip is the mode toggle's
 * active segment — the same two surfaces already in use, not a third one.
 */
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { TrainCategory } from '@tabellone/core'
import { useEffect, useRef } from 'react'
import { iconSize } from '@/components/ui/icon'
import type { BoardFilter } from '@/lib/board-filter'
import { categoryLabel } from '@/lib/presentation'
import { strings } from '@/strings'
import { pressScale } from './parts'

/** `aria-controls` needs a name both halves agree on, and there is one board per screen. */
export const FILTER_PANEL_ID = 'board-filter-panel'

export function FilterTrigger({
  open,
  activeCount,
  onToggle,
}: {
  open: boolean
  /** Constraints currently applied: printed on the trigger, because the panel that would
   *  otherwise show them is closed. */
  activeCount: number
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={FILTER_PANEL_ID}
      className={`inline-flex cursor-pointer items-center gap-2 border px-3 py-2 type-secondary transition-[color,border-color,background-color,scale] min-h-(--touch-min) ${pressScale} ${
        open || activeCount > 0
          ? 'border-line-strong bg-surface-inverse text-text-inverse'
          : 'border-line-strong bg-transparent text-text-secondary'
      }`}
    >
      <MagnifyingGlass size={iconSize.control} aria-hidden="true" />
      <span className="hidden min-[480px]:inline uppercase tracking-(--track-label)">
        {open ? strings.filterClose : strings.filterOpen}
      </span>
      {activeCount > 0 && (
        <span className="type-figures type-tertiary" aria-hidden="true">
          {activeCount}
        </span>
      )}
      <span className="sr-only">{open ? strings.filterClose : strings.filterOpen}</span>
    </button>
  )
}

export function FilterPanel({
  filter,
  categories,
  active,
  matchCount,
  totalCount,
  onChange,
  onClose,
}: {
  filter: BoardFilter
  /** The chips to draw, already ordered and already including any selected-but-absent one. */
  categories: TrainCategory[]
  active: boolean
  /** Rows the filter leaves, out of the rows the board has. */
  matchCount: number
  totalCount: number
  onChange: (filter: BoardFilter) => void
  onClose: () => void
}) {
  const field = useRef<HTMLInputElement>(null)

  // The panel only ever mounts because the reader asked for it, so it takes the caret with
  // it: opening a search and then having to tap the field is two taps for one intention.
  useEffect(() => {
    field.current?.focus()
  }, [])

  const toggleCategory = (category: TrainCategory) => {
    const selected = filter.categories.includes(category)
    onChange({
      ...filter,
      categories: selected
        ? filter.categories.filter((entry) => entry !== category)
        : [...filter.categories, category],
    })
  }

  return (
    <div
      id={FILTER_PANEL_ID}
      className="flex animate-row-entry flex-col gap-3 border-line border-b py-3"
    >
      <div className="relative flex items-center">
        <MagnifyingGlass
          size={iconSize.control}
          color="var(--text-tertiary)"
          aria-hidden="true"
          className="pointer-events-none absolute left-4"
        />
        <input
          ref={field}
          value={filter.query}
          onChange={(event) => onChange({ ...filter, query: event.target.value })}
          // Escape is the way out of a search field everywhere else; here it closes the panel
          // and leaves the constraints standing, which the trigger then reports.
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
          }}
          placeholder={strings.filterPlaceholder}
          aria-label={strings.filterSearch}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          className="box-border w-full rounded-field border-2 border-line-strong bg-surface-raised py-3 pr-12 pl-12 text-text-primary outline-none type-primary min-h-(--touch-min) placeholder:text-text-tertiary focus:border-focus"
          style={{ transition: 'var(--motion-state)' }}
        />
        {filter.query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange({ ...filter, query: '' })
              field.current?.focus()
            }}
            aria-label={strings.clearSearch}
            className="absolute right-3 inline-flex size-9 cursor-pointer items-center justify-center border-0 bg-transparent text-text-tertiary"
          >
            <X size={iconSize.control} aria-hidden="true" />
          </button>
        )}
      </div>

      {categories.length > 1 && (
        <fieldset
          // A board with many categories overflows a phone's width: the row scrolls rather
          // than wrapping into a block that changes height as the reader types. `min-w-0`
          // because a fieldset's own `min-inline-size: min-content` would defeat the scroll.
          className="-mx-(--screen-margin) m-0 flex min-w-0 gap-2 overflow-x-auto border-0 p-0 px-(--screen-margin) [scrollbar-width:none]"
        >
          <legend className="sr-only">{strings.filterCategory}</legend>
          {categories.map((category) => {
            const selected = filter.categories.includes(category)
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={selected}
                className={`inline-flex flex-none cursor-pointer items-center whitespace-nowrap border px-3 py-2 type-secondary uppercase tracking-(--track-label) transition-[color,border-color,background-color,scale] min-h-(--touch-min) ${pressScale} ${
                  selected
                    ? 'border-line-strong bg-surface-inverse text-text-inverse'
                    : 'border-line bg-transparent text-text-secondary'
                }`}
                style={{
                  fontWeight: selected ? 'var(--weight-max)' : 'var(--weight-medium)',
                }}
              >
                {categoryLabel[category]}
              </button>
            )
          })}
        </fieldset>
      )}

      {active && (
        // The count belongs here and not only in the list head: filtered down to a single
        // train there is no list head left to carry it, and that is precisely the moment the
        // reader most needs to be told the board was narrowed rather than emptied.
        <div className="flex items-center justify-between gap-4">
          <span role="status" className="text-text-tertiary type-figures type-tertiary">
            {strings.filterCount(matchCount, totalCount)}
          </span>
          <button
            type="button"
            onClick={() => onChange({ query: '', categories: [] })}
            className={`inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-text-tertiary underline type-tertiary min-h-(--touch-min) ${pressScale}`}
          >
            {strings.filterClear}
          </button>
        </div>
      )}
    </div>
  )
}

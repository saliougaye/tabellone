'use client'

/**
 * Filters as a sheet (bottom on phones, dialog from 640px): the two groups as toggles that
 * carry the marks a traveller recognises — the operator's logo, the Regionale mark — and a
 * footer that says how many trains the choice leaves and closes on it. Never a request: the
 * board in hand is the whole corpus (see lib/board-filter).
 */
import { X } from '@phosphor-icons/react'
import type { Operator, TrainCategory } from '@tabellone/core'
import type { ComponentType } from 'react'
import { useEffect } from 'react'
import type { BoardFilter } from '@/lib/board-filter'
import { categoryLabel, operatorMark } from '@/lib/presentation'
import { strings } from '@/strings'
import {
  type BrandLogoProps,
  brandLogoInk,
  brandLogos,
  categoryLogoInk,
  categoryLogos,
} from './brand-logos'
import { MarkIcon } from './parts'

export const OPERATORS: Array<{ id: Operator; label: string }> = [
  { id: 'TRENITALIA', label: strings.operatorTrenitalia },
  { id: 'ITALO', label: strings.operatorItalo },
  { id: 'TRENORD', label: strings.operatorTrenord },
  { id: 'OTHER', label: strings.operatorOther },
]

/** The mark an operator is recognised by, for the toggles. */
const OPERATOR_MARK: Partial<
  Record<Operator, { Mark: ComponentType<BrandLogoProps>; ink: string; ink2?: string }>
> = {
  TRENITALIA: brandLogos.Trenitalia && {
    Mark: brandLogos.Trenitalia,
    ink: brandLogoInk.Trenitalia?.primary ?? 'currentColor',
    ink2: brandLogoInk.Trenitalia?.secondary,
  },
  ITALO: brandLogos.Italo && {
    Mark: brandLogos.Italo,
    ink: brandLogoInk.Italo?.primary ?? 'currentColor',
  },
  TRENORD: brandLogos.Trenord && {
    Mark: brandLogos.Trenord,
    ink: brandLogoInk.Trenord?.primary ?? 'currentColor',
    ink2: brandLogoInk.Trenord?.secondary,
  },
}

export function FiltersSheet({
  categories,
  operators,
  filter,
  selectedOperators,
  matches,
  total,
  onCategory,
  onOperator,
  onReset,
  onClose,
}: {
  categories: TrainCategory[]
  operators: Array<{ id: Operator; label: string }>
  filter: BoardFilter
  selectedOperators: Operator[]
  matches: number
  total: number
  onCategory: (category: TrainCategory) => void
  onOperator: (operator: Operator) => void
  onReset: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const active = filter.categories.length + selectedOperators.length
  return (
    <>
      <button type="button" className="sh-veil" aria-label={strings.closeSheet} onClick={onClose} />
      <section className="sh-sheet filters" aria-label={strings.filters}>
        <header>
          <div>
            <small>{active ? strings.filtersActive(active) : strings.filtersNone}</small>
            <h2>{strings.filters}</h2>
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
        <fieldset className="sh-group">
          <legend>{strings.filterCategory}</legend>
          <div className="grid">
            {categories.map((category) => {
              const Mark = categoryLogos[category]
              const ink = categoryLogoInk[category]
              return (
                <button
                  key={category}
                  type="button"
                  className="sh-toggle"
                  aria-pressed={filter.categories.includes(category)}
                  onClick={() => onCategory(category)}
                >
                  {Mark && ink && <MarkIcon Mark={Mark} ink={ink.primary} ink2={ink.secondary} />}
                  {categoryLabel[category]}
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset className="sh-group">
          <legend>{strings.operator}</legend>
          <div className="grid">
            {operators.map((operator) => {
              const mark = OPERATOR_MARK[operator.id]
              return (
                <button
                  key={operator.id}
                  type="button"
                  className="sh-toggle"
                  aria-pressed={selectedOperators.includes(operator.id)}
                  onClick={() => onOperator(operator.id)}
                >
                  {mark ? (
                    <MarkIcon {...mark} />
                  ) : (
                    <i style={{ background: operatorMark[operator.id].colorVar }} />
                  )}
                  {operator.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <footer className="sh-sheet-foot">
          <button
            type="button"
            className="sh-btn ghost lg"
            onClick={onReset}
            disabled={!active && !filter.query}
          >
            {strings.filterClear}
          </button>
          <button type="button" className="sh-btn primary lg" onClick={onClose}>
            {matches === total ? strings.showAll(total) : strings.showMatches(matches, total)}
          </button>
        </footer>
      </section>
    </>
  )
}

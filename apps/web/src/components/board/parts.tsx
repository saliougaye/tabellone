'use client'

/**
 * Small pieces shared by the board and the home: the brand mark of a train (`Logo`), a row's
 * identity (`rowKey`) and a card-shaped message. `BoardRow` in, pixels out; nothing here
 * fetches. (The flight card and route block of the Rotta pass went with the train page, which
 * is now the board with a sheet open — ADR-012.)
 */
import type { BoardRow } from '@tabellone/core'
import type { CSSProperties } from 'react'
import { operatorMark, serviceLabel } from '@/lib/presentation'
import { serviceLogo } from './brand-logos'

/** The row's identity on the board, and therefore its React key (see BoardRow in core). */
export const rowKey = (row: BoardRow) => `${row.trainNumber}-${row.scheduledTime}`

/**
 * The brand's own mark for a row (an asset, not RFI's image). Falls back to the operator dot
 * plus the service name for a brand with no asset (Malpensa Express, unknown operators).
 */
export function Logo({ row, large = false }: { row: BoardRow; large?: boolean }) {
  const { Logo: Mark, ink } = serviceLogo(row)
  if (!Mark) {
    const mark = operatorMark[row.operator] ?? operatorMark.OTHER
    return (
      <span className="sh-badge secondary">
        <i style={{ background: mark.colorVar }} />
        {serviceLabel(row)}
      </span>
    )
  }
  return (
    <span className={`sh-logo${large ? ' lg' : ''}`} role="img" aria-label={serviceLabel(row)}>
      <Mark
        style={
          {
            color: ink.primary,
            ...(ink.secondary ? { '--logo-ink-2': ink.secondary } : {}),
          } as CSSProperties
        }
      />
    </span>
  )
}

/** A card-shaped message: loading, failed, empty. */
export function Message({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="sh-card sh-empty" role="status">
      <strong>{title}</strong>
      {hint}
      {action && (
        <button type="button" className="sh-btn outline" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

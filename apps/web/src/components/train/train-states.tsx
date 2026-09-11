'use client'

/**
 * The one state the train page has that the board does not: the train is not on this board
 * any more (ADR-012).
 *
 * It is neither of the board's two failures. The read worked and the station is fine — the
 * train simply left, or is no longer scheduled today. So the way out is not a retry button
 * (there is nothing to retry) but the board itself, which is where the reader's next train
 * is.
 */
import { TrainSimple } from '@phosphor-icons/react'
import Link from 'next/link'
import { pressScale } from '@/components/board/parts'
import { iconSize } from '@/components/ui/icon'
import { strings } from '@/strings'

export function TrainGone({
  trainNumber,
  stationLabel,
  boardPath,
}: {
  trainNumber: string
  /** Omitted rather than replaced by the slug, like every other state screen here. */
  stationLabel?: string
  boardPath: string
}) {
  return (
    <section className="mx-auto flex w-full max-w-[40ch] flex-1 flex-col items-start justify-center gap-4 py-16">
      <TrainSimple size={iconSize.display} color="var(--text-tertiary)" aria-hidden="true" />
      <span className="text-text-secondary type-figures type-label">{trainNumber}</span>
      <h1 className="m-0 type-plate">{strings.trainGone}</h1>
      <p className="m-0 text-text-secondary type-reading [text-wrap:pretty]">
        {strings.trainGoneHint}
      </p>
      <Link
        href={boardPath}
        className={`mt-2 inline-flex items-center justify-center gap-2 border-0 bg-surface-inverse px-6 py-3 text-text-inverse no-underline transition-[scale] type-secondary type-wide uppercase tracking-(--track-label) min-h-(--touch-min) ${pressScale}`}
        style={{ fontWeight: 'var(--weight-max)' }}
      >
        {stationLabel ? `${strings.backToBoard} · ${stationLabel}` : strings.backToBoard}
      </Link>
    </section>
  )
}

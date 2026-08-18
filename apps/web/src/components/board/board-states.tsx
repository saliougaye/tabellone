'use client'

/**
 * The board's non-data states. A failed read looks deliberately different from an empty
 * board: empty is a quiet night (rendered inside BoardView), failed is this screen.
 *
 * `stationLabel` is optional and omitted, never substituted with the slug: on an unknown
 * station these screens carry no name rather than a URL fragment posing as one.
 */
import { SkeletonBlock } from '@/components/ui/skeleton-block'
import { strings } from '@/strings'

export function BoardError({
  stationLabel,
  onRetry,
}: {
  stationLabel?: string
  onRetry: () => void
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex h-24 w-24 items-center justify-center border border-line bg-veil-empty">
        <TrainIcon />
      </span>
      {stationLabel && <span className="text-text-secondary type-label">{stationLabel}</span>}
      <h1 className="m-0 uppercase type-title leading-(--type-dominant-leading)">
        {strings.fetchFailed}
      </h1>
      <p className="m-0 max-w-[34ch] text-text-secondary type-reading">{strings.fetchFailedHint}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-minimal border border-line-strong bg-transparent px-5 py-3 text-text-primary type-secondary min-h-(--touch-min)"
        style={{ fontWeight: 'var(--weight-strong)' }}
      >
        {strings.retry}
      </button>
    </section>
  )
}

export function BoardLoading({ stationLabel }: { stationLabel?: string }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <span className="flex items-center gap-1 text-text-tertiary type-tertiary">
        <span
          className="animate-data-beat"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--data-absent)',
          }}
        />
        {strings.loading}
      </span>
      {stationLabel && <span className="text-text-secondary type-primary">{stationLabel}</span>}
    </section>
  )
}

export function TrainIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="46"
      height="46"
      fill="none"
      stroke="var(--text-tertiary)"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.2 10.6V4.4h9.6v6.2H3.2zM3.2 7.5h9.6M8 4.4v3.1M1.5 13h13M5.4 12.2l.8-1.6M10.6 12.2l-.8-1.6" />
    </svg>
  )
}

/**
 * The mode-switch state. Flipping departures ↔ arrivals keeps the header (station,
 * favourite, toggle) mounted and swaps only the rows for these placeholders: the toggle
 * answers on the tap, and the old mode's rows never linger under the new label — which is
 * what made the switch read as "slow" when the screen simply froze on stale content.
 *
 * Shape-matched to the real rows, not a generic spinner, so nothing jumps when the data
 * lands. Under `prefers-reduced-motion` the pulse flattens (theme.css redefines
 * `tab-skeleton` by name) and the blocks stay as static placeholders.
 */
export function BoardSkeleton({ variant }: { variant: 'desktop' | 'mobile' }) {
  const rows = variant === 'desktop' ? 5 : 4
  return (
    <section
      aria-busy="true"
      className="flex flex-col gap-3"
      style={{ gap: variant === 'desktop' ? 'var(--sp-3)' : 'var(--sp-2)' }}
    >
      {variant === 'mobile' && <SkeletonBlock height="196px" index={0} />}
      <div className="flex items-baseline justify-between gap-4 px-1">
        <SkeletonBlock height="12px" width="140px" index={0} />
        <SkeletonBlock height="12px" width="72px" index={0} />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonBlock
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
          key={index}
          height={variant === 'desktop' ? '84px' : '64px'}
          index={index + 1}
        />
      ))}
    </section>
  )
}

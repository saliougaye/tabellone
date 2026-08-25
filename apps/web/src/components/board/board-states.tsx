'use client'

/**
 * The board's non-data states. A failed read looks deliberately different from an empty
 * board: empty is a quiet night (rendered inside BoardView), failed is this screen.
 *
 * Offline is a third state, not a variant of the failed read. Both end with no rows, but
 * they are different facts and ask the reader for different things: a failed read means the
 * data could not be got and retrying now is worth a tap, offline means the request never
 * left the device and nothing will change until the network does. Same layout, own icon and
 * own copy — see `useOnline`, which is what tells them apart.
 *
 * `stationLabel` is optional and omitted, never substituted with the slug: on an unknown
 * station these screens carry no name rather than a URL fragment posing as one.
 */
import { ArrowClockwise, type Icon, TrainSimple, WifiSlash } from '@phosphor-icons/react'
import { iconSize } from '@/components/ui/icon'
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
    <BoardMessage
      icon={TrainSimple}
      stationLabel={stationLabel}
      title={strings.fetchFailed}
      hint={strings.fetchFailedHint}
      onRetry={onRetry}
    />
  )
}

/**
 * No connection. `onRetry` is still offered — the reader may know the network is back
 * before the `online` event says so — but it is not the way out of this screen: React Query
 * refetches on reconnect, so the board comes back on its own.
 */
export function BoardOffline({
  stationLabel,
  onRetry,
}: {
  stationLabel?: string
  onRetry: () => void
}) {
  return (
    <BoardMessage
      icon={WifiSlash}
      stationLabel={stationLabel}
      title={strings.offlineTitle}
      hint={strings.offlineBoardHint}
      onRetry={onRetry}
    />
  )
}

/** The shape both of the above share: icon, optional station, title, hint, retry. */
export function BoardMessage({
  icon: Glyph,
  stationLabel,
  title,
  hint,
  onRetry,
}: {
  icon: Icon
  stationLabel?: string
  title: string
  hint: string
  onRetry: () => void
}) {
  return (
    <section className="mx-auto flex w-full max-w-[40ch] flex-1 flex-col items-start justify-center gap-4 py-16">
      <Glyph size={iconSize.display} color="var(--text-tertiary)" aria-hidden="true" />
      {stationLabel && <span className="text-text-secondary type-label">{stationLabel}</span>}
      <h1 className="m-0 type-plate">{title}</h1>
      <p className="m-0 text-text-secondary type-reading [text-wrap:pretty]">{hint}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-control border-0 bg-surface-inverse px-6 py-3 text-text-inverse type-secondary type-wide uppercase tracking-(--track-label) min-h-(--touch-min)"
        style={{ fontWeight: 'var(--weight-max)' }}
      >
        <ArrowClockwise size={iconSize.control} aria-hidden="true" />
        {strings.retry}
      </button>
    </section>
  )
}

export function BoardLoading({ stationLabel }: { stationLabel?: string }) {
  return (
    <section className="mx-auto flex w-full max-w-(--content-max-width) flex-1 flex-col gap-6 py-8">
      <span className="flex items-center gap-2 text-text-tertiary type-figures type-tertiary">
        <span className="animate-data-beat block size-1.5 bg-data-absent" />
        {strings.loading}
      </span>
      {/* The station is the page's `h1` even while the board is in flight: this is the
          markup a crawler and a screen reader get on a route that is meant to rank, and
          before this it was a `span` with nothing above it. */}
      {stationLabel && (
        <h1 className="m-0 border-line-strong border-b-2 pb-4 type-plate">{stationLabel}</h1>
      )}
      <BoardSkeleton />
    </section>
  )
}

/**
 * The placeholder board. Shape-matched to the real composition — a lead block beside its
 * list — so nothing jumps when the data lands, which is the whole reason a skeleton beats a
 * spinner. Also used for the mode switch: flipping departures ↔ arrivals keeps the heading
 * and the toggle mounted and swaps only this, so the toggle answers on the tap and the old
 * mode's rows never linger under the new label.
 *
 * Under `prefers-reduced-motion` the sweep and the pulse flatten (theme.css redefines both
 * keyframes by name) and the blocks stay static placeholders.
 */
export function BoardSkeleton() {
  const ROWS = 6
  return (
    <div aria-busy="true" className="flex flex-col gap-px">
      <span className="sr-only">{strings.loading}</span>
      {/* The lead band, then the list: the same two heights the real board lands in. */}
      <SkeletonBlock height="188px" index={0} />
      <SkeletonBlock height="34px" index={0} />
      {Array.from({ length: ROWS }, (_, index) => (
        <SkeletonBlock
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
          key={index}
          height="76px"
          index={index + 1}
        />
      ))}
    </div>
  )
}

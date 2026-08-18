'use client'

/**
 * First-launch empty state (sheet 12): no station followed yet. Rendered on `/` when
 * there is nothing saved; the CTA leads into the picker below it.
 */
import { TrainIcon } from '@/components/board/board-states'
import { strings } from '@/strings'

export function HomeEmpty({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
      <span className="flex h-24 w-24 items-center justify-center border border-line bg-veil-empty">
        <TrainIcon />
      </span>
      <h1 className="m-0 uppercase type-title leading-(--type-dominant-leading)">
        {strings.chooseStation}
      </h1>
      <p className="m-0 max-w-[30ch] text-text-secondary type-reading [text-wrap:pretty]">
        {strings.chooseStationHint}
      </p>
      <button
        type="button"
        onClick={onSearch}
        className="mt-2 inline-flex w-full max-w-[360px] cursor-pointer items-center justify-center gap-2 rounded-minimal border-0 bg-surface-inverse px-5 py-3 text-text-inverse type-secondary min-h-(--touch-min)"
        style={{ fontWeight: 'var(--weight-max)' }}
      >
        <svg
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.6" />
          <path d="M10.4 10.4 14 14" />
        </svg>
        <span>{strings.searchStation}</span>
      </button>
    </div>
  )
}

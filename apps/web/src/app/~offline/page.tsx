'use client'

import { TrainIcon } from '@/components/board/board-states'
import { strings } from '@/strings'

export default function OfflinePage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex h-24 w-24 items-center justify-center border border-line bg-veil-empty">
        <TrainIcon />
      </span>
      <h1 className="m-0 uppercase type-title leading-(--type-dominant-leading)">
        {strings.offlineTitle}
      </h1>
      <p className="m-0 max-w-[34ch] text-text-secondary type-reading">{strings.offlineHint}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-minimal border border-line-strong bg-transparent px-5 py-3 text-text-primary type-secondary min-h-(--touch-min)"
        style={{ fontWeight: 'var(--weight-strong)' }}
      >
        {strings.retry}
      </button>
    </section>
  )
}

/**
 * The board — the other page (ARCHITECTURE 4.1). The client component polls
 * `/api/board/[slug]` every 20 s, suspended while the document is hidden. While the
 * backend answers 501 the screen shows the failed-read state, deliberately (a stubbed
 * 200 with an empty board would be indistinguishable from a quiet night).
 *
 * The mode is still readable as the `view` query param on this bare page (ADR-010):
 * absent or unrecognised resolves to `departures`, never 404 — a mangled shared link must
 * still show a board. `/stazioni/[slug]/partenze` and `/stazioni/[slug]/arrivi` are the
 * canonical, indexable URLs (ADR-011); this route's own metadata just points its canonical
 * link at whichever of those two matches the resolved mode, so both spellings keep working
 * without competing for search ranking. `view` on this page, `mode` in the API, same values
 * (CONTEXT.md).
 */
import { type BoardMode, findStationBySlug } from '@tabellone/core'
import type { Metadata } from 'next'
import { BoardScreen } from '@/components/board/board-screen'
import { boardMetadata } from './board-metadata'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ view?: string }>
}

function resolveMode(view: string | undefined): BoardMode {
  return view === 'arrivals' ? 'arrivals' : 'departures'
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { view } = await searchParams
  return boardMetadata(slug, resolveMode(view))
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { view } = await searchParams
  // The catalogue is imported at build time, so the real station name is free here — the
  // screen never has to fall back to the raw slug while the first board is in flight.
  return (
    <BoardScreen
      slug={slug}
      initialMode={resolveMode(view)}
      catalogName={findStationBySlug(slug)?.name}
    />
  )
}

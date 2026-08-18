/**
 * The board — the other page (ARCHITECTURE 4.1). The client component polls
 * `/api/board/[slug]` every 20 s, suspended while the document is hidden. While the
 * backend answers 501 the screen shows the failed-read state, deliberately (a stubbed
 * 200 with an empty board would be indistinguishable from a quiet night).
 *
 * The mode is the `view` query param on this one page, not a second route (ADR-010):
 * absent or unrecognised resolves to `departures`, never 404 — a mangled shared link must
 * still show a board. `view` on the page, `mode` in the API, same values (CONTEXT.md).
 */
import type { BoardMode } from '@tabellone/core'
import { BoardScreen } from '@/components/board/board-screen'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ view?: string }>
}

function resolveMode(view: string | undefined): BoardMode {
  return view === 'arrivals' ? 'arrivals' : 'departures'
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { view } = await searchParams
  return <BoardScreen slug={slug} initialMode={resolveMode(view)} />
}

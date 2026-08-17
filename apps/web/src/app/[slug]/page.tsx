/**
 * The board — the other page (ARCHITECTURE 4.1). Server component: will call
 * `@tabellone/core` directly for the initial snapshot, then a client component polls
 * `/api/board/[slug]` every 20 s, suspended while the document is hidden.
 *
 * The mode is the `view` query param on this one page, not a second route (ADR-010):
 * absent or unrecognised resolves to `departures`, never 404 — a mangled shared link must
 * still show a board. `view` on the page, `mode` in the API, same values (CONTEXT.md).
 */
import type { BoardMode } from '@tabellone/core'
import { strings } from '@/strings'

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
  const mode = resolveMode(view)

  return (
    <main>
      <h1>{slug}</h1>
      <p>{mode === 'departures' ? strings.departures : strings.arrivals}</p>
      <p>{strings.scaffold}</p>
    </main>
  )
}

/**
 * `GET /api/board/:slug?mode=departures|arrivals` — the polling endpoint (ARCHITECTURE 6).
 * Route handler, not Server Action: reads are GET, cacheable, cancellable (ADR-001).
 *
 * Always a `StationBoard`, with one exception: 503 when nothing is cached and the refresh
 * failed (`BoardUnavailableError`). `fetcher`/`parser` are still stubs, so every request
 * takes that path today — this file does not need to change once they are real.
 */
import {
  type BoardMode,
  BoardUnavailableError,
  fetchBoard,
  findStationBySlug,
  readBoard,
} from '@tabellone/core'
import { NextResponse } from 'next/server'
import { boardStore } from '@/lib/board-store'

export const runtime = 'nodejs'

function isBoardMode(value: string | null): value is BoardMode {
  return value === 'departures' || value === 'arrivals'
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const start = Date.now()
  const { slug } = await params
  const mode = new URL(request.url).searchParams.get('mode')

  if (!isBoardMode(mode)) {
    console.warn(JSON.stringify({ route: 'GET /api/board/:slug', slug, mode, status: 400 }))
    return NextResponse.json({ error: 'mode must be "departures" or "arrivals"' }, { status: 400 })
  }

  const station = findStationBySlug(slug)
  if (!station) {
    console.warn(JSON.stringify({ route: 'GET /api/board/:slug', slug, mode, status: 404 }))
    return NextResponse.json({ error: `no station with slug "${slug}"` }, { status: 404 })
  }

  try {
    const board = await readBoard(
      { store: boardStore, fetchBoard, clock: () => new Date() },
      station,
      mode,
    )
    console.log(
      JSON.stringify({
        route: 'GET /api/board/:slug',
        slug,
        mode,
        status: 200,
        stale: board.isStale,
        durationMs: Date.now() - start,
      }),
    )
    return NextResponse.json(board)
  } catch (error) {
    if (error instanceof BoardUnavailableError) {
      console.error(
        JSON.stringify({
          route: 'GET /api/board/:slug',
          slug,
          mode,
          status: 503,
          durationMs: Date.now() - start,
          error: error.message,
        }),
      )
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error(
      JSON.stringify({
        route: 'GET /api/board/:slug',
        slug,
        mode,
        status: 500,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw error
  }
}

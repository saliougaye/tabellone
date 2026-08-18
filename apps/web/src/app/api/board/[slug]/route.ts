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
  const { slug } = await params
  const mode = new URL(request.url).searchParams.get('mode')

  if (!isBoardMode(mode)) {
    return NextResponse.json({ error: 'mode must be "departures" or "arrivals"' }, { status: 400 })
  }

  const station = findStationBySlug(slug)
  if (!station) {
    return NextResponse.json({ error: `no station with slug "${slug}"` }, { status: 404 })
  }

  try {
    const board = await readBoard(
      { store: boardStore, fetchBoard, clock: () => new Date() },
      station,
      mode,
    )
    return NextResponse.json(board)
  } catch (error) {
    if (error instanceof BoardUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    throw error
  }
}

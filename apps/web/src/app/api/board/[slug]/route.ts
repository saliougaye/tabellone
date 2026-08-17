/**
 * `GET /api/board/:slug?mode=departures|arrivals` — the polling endpoint (ARCHITECTURE 6).
 * Route handler, not Server Action: reads are GET, cacheable, cancellable (ADR-001).
 *
 * Contract once implemented: always a `StationBoard`, under every condition; the single
 * 503 is "RFI unreachable and nothing cached". Until `readBoard` exists this answers 501,
 * loudly — a stubbed 200 with an empty board would be indistinguishable from night.
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return NextResponse.json({ error: `board for "${slug}" is not implemented yet` }, { status: 501 })
}

/**
 * `GET /api/stations` — the station catalogue, with a long ETag (ARCHITECTURE 6). Static
 * JSON imported at build time, so this handler never touches Redis or RFI. 501 until the
 * catalogue exists: it is built offline and its slugs are reviewed by hand before
 * publication (ADR-007).
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ error: 'station catalogue is not implemented yet' }, { status: 501 })
}

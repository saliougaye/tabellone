/**
 * `GET /api/stations` — the station catalogue, with a long ETag (ARCHITECTURE 6). Static
 * JSON imported at build time, so this handler never touches Redis or RFI. The ETag is a
 * hash of the catalogue content: it only changes when the catalogue itself is redeployed.
 */
import { createHash } from 'node:crypto'
import { listStations } from '@tabellone/core'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const stations = listStations()
const body = JSON.stringify(stations)
const etag = `"${createHash('sha1').update(body).digest('hex')}"`

export async function GET(request: Request) {
  if (request.headers.get('if-none-match') === etag) {
    console.log(JSON.stringify({ route: 'GET /api/stations', status: 304 }))
    return new NextResponse(null, { status: 304, headers: { etag } })
  }

  console.log(JSON.stringify({ route: 'GET /api/stations', status: 200, count: stations.length }))
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      etag,
      'cache-control': 'public, max-age=3600, must-revalidate',
    },
  })
}

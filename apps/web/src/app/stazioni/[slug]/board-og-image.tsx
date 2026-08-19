/**
 * Shared renderer for the three board OG images (bare, /partenze, /arrivi — same trio as
 * board-metadata.ts, ADR-011). Not itself a route: Next only picks up files literally named
 * `opengraph-image`, so each route's opengraph-image.tsx calls this with its fixed mode.
 * Layout mirrors the static apps/web/public/icons/og-image.png (same brand mark geometry
 * and colours), with the subtitle swapped for the station and mode.
 */

import { readFile } from 'node:fs/promises'
import type { BoardMode } from '@tabellone/core'
import { findStationBySlug } from '@tabellone/core'
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// `fetch(new URL(..., import.meta.url))` — the pattern Next's docs show — resolves and
// bundles the asset fine under Turbopack (confirmed in .next/server/assets/), but the
// fetch() call itself rejects file: URLs at runtime ("not implemented" from undici). Node's
// fs accepts the same URL directly, so read it instead of fetching it.
const regular = readFile(new URL('./fonts/IBMPlexSans-Regular.otf', import.meta.url))
const medium = readFile(new URL('./fonts/IBMPlexSans-Medium.otf', import.meta.url))
const semiBold = readFile(new URL('./fonts/IBMPlexSans-SemiBold.otf', import.meta.url))

export async function boardOgImage(slug: string, mode: BoardMode) {
  const stationName = findStationBySlug(slug)?.name ?? slug
  const subtitle = mode === 'arrivals' ? `Arrivi a ${stationName}` : `Partenze da ${stationName}`

  const [regularData, mediumData, semiBoldData] = await Promise.all([regular, medium, semiBold])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#161E25',
        fontFamily: 'IBM Plex Sans',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 132, marginLeft: 96 }}
      >
        <div style={{ width: 112, height: 108, borderRadius: 20, background: '#00BDB7' }} />
        <div style={{ width: 86, height: 36, borderRadius: 18, background: '#FAF7F2' }} />
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 24,
          marginLeft: 96,
          fontSize: 108,
          fontWeight: 600,
          letterSpacing: -3.78,
          color: '#FAF7F2',
        }}
      >
        Tabellone
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 8,
          marginLeft: 96,
          maxWidth: 1008,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 36,
          fontWeight: 400,
          color: '#A9ABB1',
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 62,
          marginLeft: 96,
          width: 1008,
          height: 1,
          background: '#2B333A',
        }}
      />
      <div
        style={{
          display: 'flex',
          marginTop: 46,
          marginLeft: 96,
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: '#A9ABB1',
        }}
      >
        tabellone.bysali.com
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: 'IBM Plex Sans', data: regularData, weight: 400, style: 'normal' },
        { name: 'IBM Plex Sans', data: mediumData, weight: 500, style: 'normal' },
        { name: 'IBM Plex Sans', data: semiBoldData, weight: 600, style: 'normal' },
      ],
    },
  )
}

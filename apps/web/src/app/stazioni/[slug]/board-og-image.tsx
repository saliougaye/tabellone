/**
 * Shared renderer for the three board OG images (bare, /partenze, /arrivi — same trio as
 * board-metadata.ts, ADR-011). Not itself a route: Next only picks up files literally named
 * `opengraph-image`, so each route's opengraph-image.tsx calls this with its fixed mode.
 * Layout mirrors the static apps/web/public/icons/og-image.png (same brand mark geometry
 * and colours), with the subtitle swapped for the station and mode.
 */

import type { BoardMode } from '@tabellone/core'
import { findStationBySlug } from '@tabellone/core'
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The card's face, fetched from Google Fonts at render time rather than committed as three
 * font binaries read off disk.
 *
 * The committed-binary version is the pattern Next's docs show, and it broke twice for the
 * same underlying reason: it needs a real file path, and what
 * `new URL('./x', import.meta.url)` hands you depends on how the bundler classifies the
 * extension. `.otf` was left alone and `fs` accepted it, but `fetch()` rejected the
 * resulting `file:` URL under undici; `.ttf` is a font extension Turbopack recognises, so it
 * rewrites the expression into its own asset URL, which is not the `URL` Node's `fs` will
 * take ("path must be ... Received an instance of URL"). Neither half of that is a fact
 * about this code; both are facts about the bundler's asset table. An HTTP fetch has no
 * asset table in it, and the repo carries no font binaries.
 *
 * Google Fonts is already this app's font source — `next/font` pulls the same family at
 * build time — so this is a runtime dependency on a host the build already trusts, not a new
 * one. One `css2` call for all three weights, then one call per font file.
 *
 * THE USER-AGENT IS LOAD-BEARING. `css2` content-negotiates on it, and Satori cannot parse
 * WOFF2: a current Chrome UA gets `format('woff2')` and fails, an old Safari UA gets
 * `format('woff')`, and a UA with no browser token at all gets `format('truetype')`. So the
 * request sends the bare product token and the parser accepts either of the two formats
 * Satori can read, rather than trusting one of them to keep being served.
 */
const NO_BROWSER_TOKEN_UA = 'Mozilla/5.0'
const WEIGHTS = [400, 500, 600] as const

async function loadSaira(): Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> {
  // force-cache on every hop: a released font file is immutable and an OG card is rendered
  // on demand, so without it each crawler hit would pay for four requests to Google.
  const sheet = await fetch(
    `https://fonts.googleapis.com/css2?family=Saira:wght@${WEIGHTS.join(';')}`,
    { headers: { 'User-Agent': NO_BROWSER_TOKEN_UA }, cache: 'force-cache' },
  )
  if (!sheet.ok) throw new Error(`Saira: css2 answered ${sheet.status}`)
  const css = await sheet.text()

  // Matched by the weight each block declares, not by the order the blocks arrive in: the
  // sheet happens to be sorted ascending today and nothing in the API promises it stays so.
  const blocks = css.split('@font-face').map((block) => ({
    weight: Number(/font-weight:\s*(\d+)/.exec(block)?.[1]),
    src: /src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:truetype|woff)'\)/.exec(block)?.[1],
  }))

  const [regular, medium, semiBold] = await Promise.all(
    WEIGHTS.map(async (weight) => {
      const src = blocks.find((block) => block.weight === weight)?.src
      if (!src) throw new Error(`Saira ${weight}: no TrueType or WOFF src in the css2 response`)
      const file = await fetch(src, { cache: 'force-cache' })
      if (!file.ok) throw new Error(`Saira ${weight}: font file answered ${file.status}`)
      return file.arrayBuffer()
    }),
  )
  // Named rather than spread: the return type is a three-tuple because ImageResponse wants
  // one buffer per declared weight, and `.map` over a tuple still widens to an array.
  if (!regular || !medium || !semiBold) throw new Error('Saira: incomplete family')
  return [regular, medium, semiBold]
}

/**
 * Memoised at module scope, so the family is fetched once per server process rather than
 * once per card. A rejected promise is dropped rather than kept, so a transient failure at
 * Google costs the next request a retry instead of costing every request for the lifetime of
 * the process.
 */
let faces: Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> | null = null

function saira() {
  if (!faces) {
    faces = loadSaira().catch((error) => {
      faces = null
      throw error
    })
  }
  return faces
}

export async function boardOgImage(slug: string, mode: BoardMode) {
  const stationName = findStationBySlug(slug)?.name ?? slug
  const subtitle = mode === 'arrivals' ? `Arrivi a ${stationName}` : `Partenze da ${stationName}`

  const [regularData, mediumData, semiBoldData] = await saira()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#111418',
        fontFamily: 'Saira',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 132, marginLeft: 96 }}
      >
        <div style={{ width: 112, height: 108, borderRadius: 20, background: '#df870a' }} />
        <div style={{ width: 86, height: 36, borderRadius: 18, background: '#f2f3f5' }} />
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 24,
          marginLeft: 96,
          fontSize: 108,
          fontWeight: 600,
          letterSpacing: -3.78,
          color: '#f2f3f5',
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
          color: '#a9adb1',
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
          background: '#23252a',
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
          color: '#a9adb1',
        }}
      >
        tabellone.bysali.com
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: 'Saira', data: regularData, weight: 400, style: 'normal' },
        { name: 'Saira', data: mediumData, weight: 500, style: 'normal' },
        { name: 'Saira', data: semiBoldData, weight: 600, style: 'normal' },
      ],
    },
  )
}

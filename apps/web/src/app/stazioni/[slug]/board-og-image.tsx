/**
 * Shared renderer for the three board OG images (bare, /partenze, /arrivi — same trio as
 * board-metadata.ts, ADR-011). Not itself a route: Next only picks up files literally named
 * `opengraph-image`, so each route's opengraph-image.tsx calls this with its fixed mode.
 * Same ground, mark and type as the static apps/web/public/icons/og-image.png (the "Paletta":
 * the platform's split-flap tile carrying a T, ink on the seventh pass's grey, Figtree), with
 * the tagline swapped for the station and mode.
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
const WEIGHTS = [600, 700, 800] as const

async function loadFigtree(): Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> {
  // force-cache on every hop: a released font file is immutable and an OG card is rendered
  // on demand, so without it each crawler hit would pay for four requests to Google.
  const sheet = await fetch(
    `https://fonts.googleapis.com/css2?family=Figtree:wght@${WEIGHTS.join(';')}`,
    { headers: { 'User-Agent': NO_BROWSER_TOKEN_UA }, cache: 'force-cache' },
  )
  if (!sheet.ok) throw new Error(`Figtree: css2 answered ${sheet.status}`)
  const css = await sheet.text()

  // Matched by the weight each block declares, not by the order the blocks arrive in: the
  // sheet happens to be sorted ascending today and nothing in the API promises it stays so.
  const blocks = css.split('@font-face').map((block) => ({
    weight: Number(/font-weight:\s*(\d+)/.exec(block)?.[1]),
    src: /src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:truetype|woff)'\)/.exec(block)?.[1],
  }))

  const [semiBold, bold, extraBold] = await Promise.all(
    WEIGHTS.map(async (weight) => {
      const src = blocks.find((block) => block.weight === weight)?.src
      if (!src) throw new Error(`Figtree ${weight}: no TrueType or WOFF src in the css2 response`)
      const file = await fetch(src, { cache: 'force-cache' })
      if (!file.ok) throw new Error(`Figtree ${weight}: font file answered ${file.status}`)
      return file.arrayBuffer()
    }),
  )
  // Named rather than spread: the return type is a three-tuple because ImageResponse wants
  // one buffer per declared weight, and `.map` over a tuple still widens to an array.
  if (!semiBold || !bold || !extraBold) throw new Error('Figtree: incomplete family')
  return [semiBold, bold, extraBold]
}

/**
 * Memoised at module scope, so the family is fetched once per server process rather than
 * once per card. A rejected promise is dropped rather than kept, so a transient failure at
 * Google costs the next request a retry instead of costing every request for the lifetime of
 * the process.
 */
let faces: Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> | null = null

function figtree() {
  if (!faces) {
    faces = loadFigtree().catch((error) => {
      faces = null
      throw error
    })
  }
  return faces
}

const GROUND = '#eff1f4'
const INK = '#101012'
const MUTED = '#6c6c72'

/**
 * The mark, from the icon's 512 grid (tile 240×288, r44) scaled to 132px tall: the tile, the
 * T and the hinge cut — the gap across the middle and a notch on each side — in the ground.
 */
function Mark() {
  const k = 132 / 288
  const px = (n: number) => Math.round(n * k * 10) / 10
  const cut = { position: 'absolute' as const, background: GROUND }
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: px(240),
        height: px(288),
        borderRadius: px(44),
        background: INK,
      }}
    >
      <div
        style={{
          ...cut,
          left: px(52),
          top: px(56),
          width: px(136),
          height: px(46),
          borderRadius: px(8),
        }}
      />
      <div
        style={{
          ...cut,
          left: px(97),
          top: px(56),
          width: px(46),
          height: px(178),
          borderRadius: px(8),
        }}
      />
      <div style={{ ...cut, left: -2, top: px(139.5), width: px(240) + 4, height: px(9) }} />
      <div
        style={{
          ...cut,
          left: px(-9.6),
          top: px(129.6),
          width: px(19.2),
          height: px(28.8),
          borderRadius: px(4.8),
        }}
      />
      <div
        style={{
          ...cut,
          left: px(230.4),
          top: px(129.6),
          width: px(19.2),
          height: px(28.8),
          borderRadius: px(4.8),
        }}
      />
    </div>
  )
}

export async function boardOgImage(slug: string, mode: BoardMode) {
  const stationName = findStationBySlug(slug)?.name ?? slug
  const subtitle = mode === 'arrivals' ? `Arrivi a ${stationName}` : `Partenze da ${stationName}`

  const [semiBoldData, boldData, extraBoldData] = await figtree()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '96px 96px 0',
        background: GROUND,
        fontFamily: 'Figtree',
      }}
    >
      <Mark />
      <div
        style={{
          display: 'flex',
          marginTop: 44,
          fontSize: 118,
          fontWeight: 800,
          letterSpacing: -5,
          lineHeight: 1,
          color: INK,
        }}
      >
        Tabellone
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 22,
          maxWidth: 1008,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 40,
          fontWeight: 600,
          color: MUTED,
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 'auto',
          marginBottom: 72,
          fontSize: 24,
          fontWeight: 700,
          color: INK,
        }}
      >
        tabellone.bysali.com
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: 'Figtree', data: semiBoldData, weight: 600, style: 'normal' },
        { name: 'Figtree', data: boldData, weight: 700, style: 'normal' },
        { name: 'Figtree', data: extraBoldData, weight: 800, style: 'normal' },
      ],
    },
  )
}

/**
 * Brand logos for the board's logo slot (`theme.css` §7 OPERATOR LOGO SLOT).
 *
 * Three rules hold here, and breaking any of them breaks an invariant elsewhere:
 *
 * 1. **Ours, committed, inline.** RFI's own `<img class="logoCliente">` carries a 34-byte
 *    1×1 spacer GIF and paints the real mark from a stylesheet sprite; that sprite is both
 *    off-limits (never propagate RFI's image payload) and out of date. Every asset here is
 *    a path committed to this repo — no network, nothing for the service worker to cache,
 *    nothing to go missing offline.
 * 2. **Flat, driven by `currentColor`.** The wrapper sets `color`, so one asset serves both
 *    themes through a `light-dark()` token, and a cancelled row can mute it to
 *    `--text-tertiary` — states always beat identity. A two-tone mark takes its second
 *    colour from `--logo-ink-2`, declared *with `currentColor` as its fallback*, so the
 *    cancelled row mutes both halves by simply not setting it. Brand gradients are
 *    flattened to their mean: at 22px a gradient is invisible, and it could not ride
 *    `currentColor` anyway.
 * 3. **Partial coverage is normal.** `brandLogos` is deliberately `Partial`: a brand with
 *    no asset falls back to the slot's text, which is the same fixed size, so the row
 *    never reflows. See `README.md` in this directory for what is still missing.
 */
import type { BoardRow, Brand, TrainCategory } from '@tabellone/core'
import type { ComponentType, CSSProperties } from 'react'

export type BrandLogoProps = { className?: string; style?: CSSProperties }

/**
 * The Frecce monogram, shared by all three Trenitalia high-speed brands — the mark itself
 * is identical, only the colour changes (rossa / argento / bianca).
 *
 * Traced from the reference raster with the crack-following + Douglas–Peucker script noted
 * in `README.md`: 22 vertices, IoU 0.9963 against the source mask. The original is pure
 * straight edges and shallow arcs, so a polygon reproduces it exactly rather than
 * approximating it — at the slot's 22px height the residual error is under 0.1px.
 */
function FrecceLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 176.75 100"
      width="176.75"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M120.71 0 L176.75 0 L166.25 25.26 L121.19 25.26 L114.09 26.51 L109.44 28.57 L105.37 31.45 L86.29 50.48 L154.65 50.53 L144.15 75.79 L101.73 75.79 L96.79 75.26 L91.42 73.78 L85.95 71.05 L81.11 67.4 L75.7 62.13 L37.92 99.95 L0 100 L88.26 11.89 L95.35 7.05 L103.45 3.31 L111.94 0.96 Z" />
    </svg>
  )
}

/**
 * Italo's leaping hare.
 *
 * Traced the same way, but this is an organic outline rather than a geometric one, so the
 * vertex/fidelity trade is real where the Frecce mark had none: 42 vertices at ε=2 scores
 * IoU 0.9786 against the source, and reaching the script's 0.99 bar would take ε=0.7 and
 * 560 vertices — a 13× longer path.
 *
 * ε=2 anyway, because the source-resolution IoU is not the constraint that matters: the
 * slot renders at 22px (18px on mobile). Measured as mean alpha error at that size, ε=0.8
 * and ε=2 are identical — ~1.4% at 22px, ~1.0% at 44px — and that residual is the
 * downscale itself, not the simplification. Beyond ~42 vertices the extra path buys
 * accuracy no viewport can resolve.
 *
 * Wider than the Frecce mark (3.02:1 against 1.77:1) — 66px at the desktop slot's 22px
 * height, 54px at mobile's 18px. Both fit without the slot growing.
 */
function ItaloLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 301.62 100"
      width="301.62"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M175.14 0 L195.68 0.54 L211.35 3.78 L226.49 9.19 L252.97 24.32 L264.32 35.68 L265.41 43.24 L262.7 45.95 L244.32 47.03 L228.65 52.43 L222.7 60 L222.16 66.49 L223.78 70.27 L230.81 76.76 L243.24 82.7 L267.57 89.73 L300 95.68 L301.62 98.92 L275.14 99.46 L234.59 92.43 L170.81 68.11 L144.86 62.7 L123.24 62.7 L107.03 65.41 L84.32 72.43 L35.68 92.97 L11.35 99.46 L1.62 100 L0 98.38 L1.62 95.68 L15.68 92.43 L44.32 78.92 L92.97 49.19 L121.62 36.76 L160 27.57 L180.54 25.41 L215.14 24.86 L225.95 21.08 L222.7 16.76 L178.38 9.73 L163.24 3.78 L166.49 1.08 Z" />
    </svg>
  )
}

/**
 * Trenord's mark: a green sail with a red shape cut into it, separated by a knockout gap
 * that takes the surface colour. The first two-tone asset here, and the reason
 * `--logo-ink-2` exists.
 *
 * ε=2, IoU 0.9919, 38 vertices across the two shapes. Both were traced in one pass against
 * a **shared** viewBox: normalising each to its own bounding box would have slid them out
 * of register. The source is flattened onto opaque white with no alpha, so the ink mask
 * came from saturation rather than transparency — thresholding luminance instead would
 * have eaten the pale end of each gradient.
 */
function TrenordLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 129.73 100"
      width="129.73"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M34.8 0 L117.57 0 L122.64 2.03 L126.69 5.74 L129.73 13.18 L129.39 20.27 L112.5 85.14 L109.8 91.55 L104.73 96.96 L100 99.32 L95.95 100 L77.7 100 L83.78 94.26 L86.15 88.85 L86.49 83.45 L83.45 71.28 L75.68 55.74 L65.88 42.91 L52.7 30.74 L36.15 20.27 L20.95 13.85 L24.32 6.42 L29.39 2.03 Z" />
      <path
        fill="var(--logo-ink-2, currentColor)"
        d="M10.14 39.86 L26.35 42.23 L36.49 42.23 L45.27 39.86 L60.81 53.72 L69.26 64.53 L72.97 74.66 L72.64 79.73 L70.95 83.11 L66.55 86.82 L59.46 89.19 L42.91 89.86 L20.27 85.81 L0.68 78.04 L0 76.35 Z"
      />
    </svg>
  )
}

/**
 * The FS monogram — Trenitalia's own mark, teal with the red stroke through it. Two-tone
 * like Trenord's, so the red arrives as `--logo-ink-2`.
 *
 * ε=1, IoU 0.9806, 87 vertices. The strokes are genuinely curved, so IoU plateaus in the
 * high 0.97s until epsilon gets very fine — at 1.48:1 this is the squarest mark here, 33px
 * wide at the slot's 22px height, and the residual is far under a pixel there.
 */
function TrenitaliaLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 147.93 100"
      width="147.93"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M72.78 0 L147.93 0.59 L145.56 4.73 L113.02 4.73 L101.18 5.92 L90.53 8.28 L89.35 9.47 L83.43 11.24 L82.84 12.43 L80.47 13.02 L77.51 15.98 L76.33 15.98 L67.46 26.04 L63.91 33.14 L33.14 33.14 L39.64 18.93 L47.34 9.47 L48.52 9.47 L53.25 5.33 L57.4 4.14 L58.58 2.96 Z M56.8 44.38 L57.99 44.38 L57.99 45.56 L54.44 52.66 L53.25 53.25 L51.48 57.99 L50.3 58.58 L49.7 60.95 L46.75 64.5 L46.15 66.86 L41.42 72.78 L40.24 75.74 L38.46 76.92 L38.46 78.11 L31.36 85.21 L22.49 89.35 L15.38 90.53 L4.73 90.53 L26.04 47.93 Z M130.77 9.47 L143.2 9.47 L131.95 33.14 L86.39 33.14 L91.12 24.26 L99.41 16.57 L105.33 13.61 L107.69 13.61 L114.2 11.24 Z" />
      <path
        fill="var(--logo-ink-2, currentColor)"
        d="M120.71 39.64 L128.4 40.24 L126.63 43.2 L116.57 43.2 L111.24 44.38 L107.69 46.15 L106.51 47.93 L105.33 47.93 L104.73 49.7 L102.96 50.89 L100.59 56.8 L100 67.46 L97.63 76.33 L92.9 84.62 L89.94 86.98 L89.94 88.17 L88.17 88.76 L85.8 91.72 L84.62 91.72 L82.25 94.08 L72.19 98.22 L59.76 100 L0 100 L1.78 95.86 L36.69 95.27 L50.89 92.31 L55.03 89.94 L55.62 88.76 L56.8 88.76 L65.09 79.29 L66.27 75.15 L67.46 73.96 L72.19 55.62 L75.15 50.3 L79.29 46.15 L85.8 42.6 L91.72 41.42 L101.78 41.42 Z"
      />
    </svg>
  )
}

/**
 * Intercity's wordmark. ε=1.5, IoU 0.9837, 226 vertices across 11 loops — the counters of
 * "e", "o" and "C" are holes, resolved by the default nonzero fill rule.
 *
 * A wordmark, so it is the widest thing in the slot at 4.61:1: the cap bites before the
 * height does and it lands at 88×19 on desktop, 64×14 on mobile. Legible at both, but only
 * just — see `README.md` on why the other Trenitalia wordmarks are not here.
 */
function IntercityLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 460.42 100"
      width="460.42"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M281.25 0 L293.75 0.42 L303.75 3.33 L315 10 L322.5 17.5 L314.58 25.83 L313.33 25.83 L306.67 18.75 L298.33 14.17 L289.58 12.08 L276.67 12.92 L270.83 15 L263.33 19.58 L256.25 27.08 L251.25 36.67 L249.17 46.67 L249.17 53.33 L251.25 63.33 L257.5 74.58 L267.5 83.33 L273.75 86.25 L280.83 87.92 L292.92 87.5 L305 82.5 L313.33 74.58 L322.08 82.5 L316.67 88.75 L309.58 93.75 L299.17 98.33 L290.42 100 L280.83 100 L272.08 98.33 L263.75 95 L254.58 88.75 L247.5 81.25 L241.67 71.67 L239.17 65 L237.08 53.33 L237.5 42.5 L239.58 33.75 L242.5 26.67 L249.17 16.67 L256.67 9.58 L261.67 6.25 L269.58 2.5 Z M410.42 24.17 L421.67 24.17 L421.67 52.92 L422.5 57.08 L425.42 62.08 L429.17 64.58 L432.5 65.42 L437.08 65.42 L441.25 64.17 L445.42 60.83 L447.5 57.08 L448.75 51.67 L448.75 24.17 L460.42 24.17 L460 78.33 L457.5 86.25 L455 90.42 L450 95.42 L444.58 98.33 L438.33 100 L426.67 99.58 L418.33 96.67 L410 90.42 L417.5 82.08 L421.67 85.83 L427.08 88.33 L431.25 89.17 L439.17 88.33 L442.5 86.67 L445.42 83.75 L448.75 74.17 L448.33 69.58 L445.83 72.92 L442.5 75 L435.83 76.67 L428.33 76.25 L420.42 73.33 L415 68.33 L412.5 64.17 L410.42 57.08 Z M155.83 22.92 L164.58 22.92 L174.58 26.67 L181.25 33.33 L184.17 39.17 L185.42 44.17 L185.42 53.33 L145.83 53.33 L146.67 57.92 L148.75 61.25 L152.08 64.17 L155.83 65.83 L166.25 65.83 L171.25 63.33 L174.58 59.58 L183.33 65.42 L174.17 73.75 L166.25 76.67 L158.33 77.08 L152.92 76.25 L144.17 72.08 L137.08 64.17 L133.75 54.58 L134.17 43.33 L135.83 37.92 L138.75 32.92 L142.08 29.17 L147.5 25.42 Z M47.5 22.92 L52.92 22.92 L60.83 24.58 L66.25 27.5 L72.5 34.58 L75.42 41.67 L76.25 46.67 L76.25 75.83 L64.58 75.83 L64.17 45.83 L62.5 41.25 L59.17 37.08 L55.83 35 L51.67 34.17 L46.25 34.58 L43.33 35.83 L39.58 39.17 L37.5 42.92 L36.25 48.75 L36.25 75.83 L24.58 75.83 L24.58 46.67 L27.5 35.83 L31.25 30.42 L37.08 25.83 Z M367.5 11.25 L379.17 11.67 L379.17 24.17 L398.33 24.58 L398.33 34.58 L379.17 34.58 L379.58 61.25 L382.92 65.42 L385 66.25 L390.42 66.25 L395.83 62.92 L400.83 70 L400.83 71.25 L395.83 75 L388.75 77.08 L380 76.67 L374.17 73.75 L368.75 66.25 L367.08 58.33 L367.08 34.58 L357.5 34.58 L357.5 24.17 L367.08 24.17 Z M93.75 11.25 L105.42 11.25 L105.42 24.17 L124.58 24.17 L124.58 34.58 L105.42 34.58 L105.42 59.58 L106.25 62.08 L108.75 65 L111.67 66.25 L116.67 66.25 L122.5 63.33 L127.5 70.83 L121.25 75.42 L115 77.08 L105 76.25 L98.75 72.08 L95 65.83 L93.75 60.83 L93.75 34.58 L83.75 34.58 L83.75 24.17 L93.75 24.17 Z M212.92 23.33 L219.58 23.33 L224.17 24.58 L229.17 27.5 L232.08 30.83 L225.83 37.5 L220 34.17 L214.58 34.58 L210.83 37.5 L209.58 40.42 L209.58 75.83 L197.92 75.83 L197.92 38.75 L198.75 35.42 L204.17 27.5 L208.75 24.58 Z M1.25 24.17 L12.92 24.17 L12.92 75.83 L1.25 75.83 Z M333.75 24.17 L345.42 24.17 L345.42 75.83 L333.75 75.83 Z M145.83 45 L173.33 45 L173.33 42.92 L171.25 38.33 L167.92 35.42 L164.17 33.75 L158.33 33.33 L151.25 35.83 L147.92 39.17 Z M5.42 0 L9.17 0 L11.67 1.25 L14.58 5.83 L13.75 11.25 L10 14.58 L4.58 14.58 L0 10 L0.83 3.33 Z" />
    </svg>
  )
}

/**
 * Leonardo Express: the wordmark over a solid bar with "express" knocked out of it. One
 * colour, because the knockout is a hole rather than a second ink — which is what lets it
 * ride `currentColor` and still mute correctly on a cancelled row.
 *
 * ε=2, IoU 0.9973, 505 vertices across 24 loops. Easily the heaviest path here; the cost is
 * the letterforms, and it buys the only mark that carries a service name legibly at 3.00:1.
 */
function LeonardoExpressLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 300 100"
      width="300"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 68.75 L300 68.75 L300 100 L0 100 Z M245.78 0 L257.11 0 L257.11 46.48 L245.78 46.48 L245.78 44.06 L245.55 44.06 L243.28 45.78 L239.92 47.11 L235.23 47.42 L232.73 46.95 L229.69 45.7 L227.5 44.14 L225.39 41.8 L223.98 39.3 L222.97 36.41 L222.58 33.36 L222.58 28.98 L223.12 25.86 L224.45 22.58 L226.09 20.16 L228.52 17.97 L231.02 16.64 L234.77 15.7 L238.83 15.62 L242.89 16.56 L245.78 18.2 Z M164.06 15.62 L167.11 15.62 L170.16 16.33 L172.34 17.42 L174.3 19.06 L174.53 16.41 L186.02 16.41 L186.02 46.48 L174.53 46.48 L174.53 44.06 L174.3 44.06 L172.11 45.7 L169.53 46.88 L166.95 47.34 L163.05 47.34 L160.78 46.8 L158.36 45.7 L156.56 44.45 L154.45 42.19 L152.58 38.75 L151.95 36.72 L151.48 33.91 L151.56 28.59 L152.58 24.45 L154.61 20.7 L157.11 18.2 L160.47 16.41 Z M86.41 15.47 L90 15.47 L93.2 15.94 L95.86 16.72 L98.75 18.12 L100.7 19.53 L103.12 22.19 L104.53 24.69 L105.39 27.19 L105.78 29.69 L105.7 34.61 L105 37.34 L103.59 40.23 L102.19 42.11 L99.38 44.53 L96.56 46.02 L93.52 46.95 L90.23 47.42 L84.92 47.42 L81.25 46.8 L78.44 45.78 L75.47 43.98 L73.2 41.8 L71.8 39.77 L70.31 36.02 L69.92 33.36 L70.23 27.97 L71.33 24.69 L72.97 22.03 L75.47 19.45 L78.67 17.42 L82.42 16.09 Z M280.7 15.47 L284.06 15.47 L287.03 15.86 L290.47 16.88 L292.97 18.12 L295 19.61 L297.19 22.03 L298.52 24.3 L299.61 27.42 L300 30.16 L299.77 35.08 L298.98 37.81 L297.73 40.31 L295 43.44 L293.05 44.84 L290.16 46.25 L287.5 47.03 L284.84 47.34 L278.98 47.42 L276.41 47.03 L272.97 45.94 L270.16 44.38 L267.42 41.88 L266.09 40 L265.23 38.28 L264.38 35.62 L264.14 33.91 L264.3 28.36 L265.55 24.61 L267.42 21.64 L269.61 19.45 L273.05 17.34 L277.03 16.02 Z M47.19 15.47 L50.55 15.55 L53.75 16.17 L56.88 17.42 L59.22 18.98 L61.17 20.94 L62.66 23.12 L64.14 26.72 L64.69 29.69 L64.92 34.14 L41.88 34.3 L42.27 36.02 L43.28 37.81 L44.53 38.91 L45.94 39.53 L47.19 39.77 L48.75 39.77 L50.31 39.38 L51.48 38.67 L52.66 37.11 L64.45 37.27 L64.22 38.2 L62.73 40.94 L61.64 42.42 L60.31 43.67 L58.36 45 L55.86 46.17 L51.09 47.34 L47.42 47.5 L43.59 47.19 L40 46.17 L37.19 44.69 L34.45 42.27 L32.81 39.92 L31.56 36.88 L31.02 34.14 L30.94 30.23 L31.48 27.03 L32.97 23.28 L34.77 20.7 L37.11 18.59 L39.84 17.03 L42.89 16.02 Z M132.58 15.62 L136.41 15.78 L139.14 16.8 L140.55 17.73 L141.64 18.83 L143.12 21.41 L143.75 23.28 L143.83 46.48 L132.42 46.48 L132.34 30.62 L132.11 28.05 L131.72 27.03 L130.7 25.94 L129.61 25.39 L128.59 25.23 L126.95 25.31 L125.39 26.02 L124.3 27.27 L123.59 28.98 L123.36 46.48 L111.95 46.48 L111.95 16.41 L123.36 16.41 L123.52 20.23 L125.16 18.59 L127.34 17.11 L129.92 16.02 Z M0 2.5 L12.34 2.5 L12.34 36.09 L26.02 36.09 L26.09 46.48 L0 46.48 Z M213.67 16.17 L216.72 16.17 L218.83 16.56 L218.83 27.11 L215.31 26.25 L211.02 26.25 L208.67 27.27 L207.42 28.67 L206.72 30.31 L206.56 32.19 L206.48 46.48 L195.08 46.48 L195.08 16.41 L206.02 16.41 L206.17 20 L209.45 17.66 L211.64 16.64 Z M232.73 85.08 L232.81 82.73 L232.5 81.25 L231.48 79.38 L230 78.05 L228.2 77.34 L226.64 77.27 L225 77.66 L222.81 79.06 L222.81 77.58 L218.91 77.58 L218.83 95.94 L222.81 96.02 L222.81 88.83 L224.3 89.92 L225.62 90.39 L227.42 90.47 L229.22 90.08 L230.78 89.14 L231.72 88.05 L232.42 86.64 Z M288.36 31.72 L288.2 29.53 L287.11 27.27 L285.31 25.7 L283.52 25.16 L280.31 25.23 L278.2 26.25 L276.64 28.05 L276.09 29.3 L275.78 31.02 L276.09 33.67 L277.19 35.86 L278.2 36.88 L279.45 37.58 L281.95 38.12 L284.14 37.81 L286.25 36.72 L287.19 35.7 L287.89 34.38 Z M81.64 32.03 L82.19 34.45 L82.97 35.86 L83.75 36.64 L86.56 37.97 L89.14 37.97 L91.25 37.27 L92.11 36.64 L93.36 35.16 L94.06 33.12 L94.06 29.92 L93.75 28.67 L92.97 27.34 L91.25 25.78 L89.3 25.16 L86.25 25.23 L84.3 26.02 L82.89 27.34 L81.88 29.53 Z M175.47 32.42 L175.47 29.84 L174.84 28.12 L173.28 26.33 L171.41 25.39 L168.2 25.31 L166.17 25.94 L164.38 27.42 L163.28 29.77 L163.2 32.97 L163.83 35.16 L165 36.56 L167.66 37.81 L171.09 37.73 L173.12 36.8 L174.69 35.08 L175.31 33.67 Z M246.41 32.19 L246.41 29.92 L245.55 27.81 L243.91 26.09 L242.11 25.31 L239.14 25.23 L237.11 25.86 L236.09 26.56 L235.23 27.58 L234.45 29.53 L234.3 32.42 L235 34.92 L236.48 36.56 L238.52 37.5 L241.88 37.5 L244.06 36.56 L245.55 34.92 L246.25 33.36 Z M183.91 84.77 L184.14 86.17 L184.84 87.81 L186.41 89.45 L187.66 90.16 L189.06 90.55 L192.19 90.47 L194.61 89.38 L196.02 88.05 L196.25 87.5 L193.36 86.02 L193.05 86.02 L191.72 87.27 L189.84 87.5 L188.36 86.56 L187.66 84.77 L196.64 84.77 L196.41 81.88 L195.55 79.77 L193.75 78.05 L191.17 77.19 L188.75 77.34 L186.33 78.44 L185 79.92 L184.06 81.95 Z M252.66 84.77 L261.64 84.77 L261.48 82.27 L260.86 80.31 L259.69 78.75 L258.12 77.73 L256.64 77.27 L254.53 77.19 L252.73 77.66 L251.02 78.67 L249.92 80 L249.06 81.88 L249.06 86.02 L249.84 87.73 L251.02 89.14 L252.42 90.08 L254.53 90.62 L257.19 90.47 L258.83 89.84 L260.7 88.44 L261.17 87.73 L261.09 87.42 L258.05 86.02 L257.19 86.95 L256.33 87.42 L254.84 87.5 L254.06 87.19 L253.28 86.48 Z M200.31 77.81 L204.14 82.66 L204.77 83.91 L199.92 90.23 L204.53 90.31 L207.42 86.02 L207.97 86.48 L210.31 90.31 L214.92 90.23 L210.16 83.75 L210.78 82.58 L214.53 77.66 L209.84 77.58 L207.58 81.41 L205 77.58 L200.78 77.58 Z M270.47 80.08 L271.41 80.16 L272.27 81.09 L272.81 81.25 L275.16 80.39 L275.55 79.92 L273.98 77.89 L272.03 77.19 L270.16 77.19 L268.52 77.58 L267.58 78.12 L266.41 79.45 L266.02 80.47 L265.94 81.56 L266.48 83.28 L267.81 84.45 L271.02 85.7 L271.95 86.48 L271.8 87.42 L271.25 87.73 L269.77 87.5 L268.83 86.33 L265.55 87.5 L265.86 88.44 L266.72 89.45 L267.66 90.08 L269.61 90.62 L272.11 90.47 L274.06 89.69 L275.16 88.59 L275.62 87.34 L275.62 85.7 L275 84.38 L273.83 83.44 L270.86 82.27 L269.84 81.48 L269.77 80.7 Z M284.53 80.08 L285.55 80.23 L286.48 81.25 L289.61 80.16 L288.2 78.05 L287.34 77.5 L286.09 77.19 L284.22 77.19 L282.73 77.5 L281.48 78.2 L280.47 79.38 L280.08 80.55 L280.08 82.03 L280.62 83.44 L281.95 84.53 L285.62 86.02 L286.02 86.64 L285.86 87.34 L285.31 87.73 L283.91 87.58 L283.12 86.88 L282.89 86.33 L279.53 87.58 L279.92 88.52 L281.02 89.69 L282.19 90.31 L283.28 90.55 L286.09 90.47 L288.05 89.69 L289.22 88.52 L289.69 86.95 L289.53 85.23 L288.52 83.91 L283.91 81.56 L283.75 80.78 Z M243.44 80.94 L244.61 81.02 L245.39 81.41 L245.39 77.27 L244.22 77.42 L243.12 77.89 L241.56 79.53 L241.48 77.58 L237.5 77.58 L237.66 90.23 L241.56 90.23 L241.88 82.34 L242.58 81.33 Z M42.11 27.58 L53.59 27.5 L52.81 25.86 L51.09 24.14 L49.14 23.52 L46.48 23.52 L45.47 23.75 L43.67 24.84 L42.81 25.86 Z M225.16 80.62 L226.41 80.62 L227.27 81.02 L228.2 82.11 L228.59 83.44 L228.52 84.84 L227.97 86.09 L227.27 86.8 L226.02 87.27 L224.84 87.19 L223.75 86.64 L223.12 85.94 L222.66 84.53 L222.66 83.36 L223.05 82.11 L223.83 81.17 Z M189.92 80 L191.02 80.08 L191.8 80.47 L192.5 81.41 L192.73 82.27 L187.66 82.42 L188.2 80.94 L188.83 80.39 Z M254.69 80 L255.78 80 L256.64 80.39 L257.42 81.25 L257.81 82.42 L252.73 82.34 L252.73 81.88 L253.28 80.94 L253.91 80.31 Z" />
    </svg>
  )
}

/**
 * Trenitalia Regionale: the "R", the location pin, and the lime swoosh behind them. Keyed
 * on category rather than brand — see `serviceLogo` below.
 *
 * ε=1 at a 20° hue gap, IoU 0.9845, 250 vertices. The two greens sit 33° apart, inside the
 * 40° the splitter uses by default, so they merge into their mean unless it is told to look
 * closer; and the antialiased trail between them bridges the modes, which is why the
 * splitter bins hues rather than looking for a gap between neighbouring values.
 */
function RegionaleLogo({ className, style }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 210.39 100"
      width="210.39"
      height="100"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="var(--logo-ink-2, currentColor)"
        d="M205.84 0 L209.74 0 L210.39 1.3 L209.09 2.6 L207.14 2.6 L206.49 3.9 L204.55 3.9 L204.55 5.84 L203.25 5.84 L203.25 7.14 L201.95 7.14 L201.95 8.44 L200 9.09 L200 10.39 L198.05 11.04 L196.75 13.64 L195.45 13.64 L194.16 16.88 L191.56 18.18 L190.91 21.43 L189.61 21.43 L187.66 25.97 L185.71 27.27 L185.71 29.22 L184.42 29.87 L182.47 35.06 L181.17 35.06 L181.17 37.01 L178.57 40.26 L177.27 44.81 L175.32 46.75 L174.03 51.95 L170.78 55.84 L170.13 59.74 L168.83 60.39 L168.83 62.99 L167.53 63.64 L166.88 66.23 L165.58 66.23 L165.58 68.18 L163.64 70.13 L162.99 72.73 L159.09 76.62 L156.49 81.17 L154.55 81.17 L154.55 82.47 L152.6 84.42 L151.3 84.42 L150 87.01 L144.81 89.61 L143.51 91.56 L139.61 92.21 L139.61 93.51 L134.42 94.81 L134.42 96.1 L129.22 97.4 L123.38 97.4 L122.73 98.7 L118.83 99.35 L103.25 99.35 L103.9 97.4 L107.79 95.45 L110.39 92.21 L111.69 92.21 L112.34 90.26 L113.64 90.26 L113.64 88.96 L115.58 88.31 L115.58 87.01 L116.88 87.01 L117.53 84.42 L118.83 84.42 L118.83 83.12 L122.73 79.22 L122.73 77.92 L124.68 76.62 L126.62 72.08 L127.92 72.08 L127.92 69.48 L129.22 68.83 L131.82 62.99 L133.12 62.34 L133.12 60.39 L135.06 59.09 L137.66 51.3 L139.61 50.65 L139.61 48.05 L141.56 45.45 L142.86 40.26 L144.81 40.26 L144.81 36.36 L146.1 35.71 L148.05 30.52 L150 29.87 L150.65 26.62 L153.25 24.68 L153.25 22.73 L156.49 20.78 L158.44 16.88 L162.99 14.29 L162.99 12.99 L164.29 12.99 L168.18 9.09 L170.78 9.09 L172.08 7.14 L174.03 7.14 L179.22 3.9 L183.77 3.9 L183.77 2.6 L188.96 1.3 Z"
      />
      <path d="M2.6 18.18 L30.52 18.18 L46.1 19.48 L55.84 22.73 L56.49 24.68 L59.09 24.68 L61.69 27.92 L63.64 28.57 L63.64 29.87 L64.94 30.52 L68.18 36.36 L70.13 44.16 L69.48 55.84 L68.18 59.74 L66.88 60.39 L62.99 68.18 L60.39 68.83 L59.09 70.78 L56.49 71.43 L53.9 74.03 L57.14 77.92 L57.14 79.22 L59.09 80.52 L60.39 83.77 L61.69 84.42 L61.69 85.71 L62.99 85.71 L63.64 88.31 L66.88 91.56 L66.88 93.51 L68.18 93.51 L68.18 94.81 L70.13 96.1 L70.13 99.35 L56.49 99.35 L50.65 97.4 L49.35 95.45 L47.4 94.81 L46.1 91.56 L42.21 87.66 L40.91 83.77 L39.61 83.77 L38.96 81.17 L37.01 79.87 L35.71 76.62 L19.48 76.62 L18.83 88.31 L16.23 93.51 L14.94 93.51 L13.64 96.1 L9.74 97.4 L9.09 98.7 L2.6 100 L0.65 99.35 L0 19.48 Z M103.25 18.83 L112.99 20.78 L113.64 22.73 L114.94 22.08 L116.88 23.38 L116.23 24.68 L120.13 25.97 L120.13 27.27 L122.08 28.57 L124.03 32.47 L125.32 40.26 L124.03 44.16 L124.03 48.7 L121.43 55.84 L120.13 55.84 L120.13 58.44 L118.83 58.44 L118.18 62.99 L116.88 63.64 L116.23 66.23 L114.94 66.88 L112.34 72.08 L110.39 73.38 L109.74 75.97 L107.79 76.62 L107.79 78.57 L105.19 78.57 L105.84 80.52 L103.25 83.77 L101.95 83.77 L99.35 79.22 L97.4 77.92 L97.4 76.62 L94.16 74.03 L92.86 70.13 L91.56 70.13 L90.91 67.53 L89.61 66.88 L87.66 62.99 L87.66 60.39 L86.36 61.04 L85.06 55.84 L83.77 55.84 L80.52 44.81 L80.52 36.36 L82.47 29.87 L83.77 29.87 L83.77 27.92 L86.36 25.97 L86.36 24.68 L88.31 24.68 L92.21 20.78 L94.16 20.78 L95.45 19.48 Z M50 51.3 L50 42.21 L46.1 37.01 L40.91 34.42 L18.83 35.06 L18.83 61.04 L20.13 62.34 L41.56 61.04 L42.86 59.74 L46.1 59.09 L46.1 57.79 L49.35 55.19 Z M94.16 41.56 L94.81 45.45 L96.1 45.45 L98.05 47.4 L98.05 49.35 L103.9 50 L106.49 48.05 L108.44 48.05 L109.09 45.45 L111.04 45.45 L110.39 37.66 L109.09 37.01 L109.09 35.06 L106.49 34.42 L105.84 33.12 L98.7 33.12 L98.05 35.06 L96.75 35.06 L94.81 37.66 Z" />
    </svg>
  )
}

/** Brands we ship an asset for. Everything absent here degrades to the slot's text. */
export const brandLogos: Partial<Record<Brand, ComponentType<BrandLogoProps>>> = {
  Frecciarossa: FrecceLogo,
  Frecciargento: FrecceLogo,
  Frecciabianca: FrecceLogo,
  Italo: ItaloLogo,
  Trenord: TrenordLogo,
  Trenitalia: TrenitaliaLogo,
  Intercity: IntercityLogo,
  // Intercity Notte has its own mark; until a reference for it exists, the day version is
  // closer to the truth than the fallback text, and the service name is on the row anyway.
  'Intercity Notte': IntercityLogo,
  'Leonardo Express': LeonardoExpressLogo,
}

/**
 * The ink a logo is drawn in — the brand's own, tuned per theme, never the operator tile's
 * (`theme.css` §7: "Operator colour never enters the logo"). `primary` becomes
 * `currentColor`; `secondary` is only for two-tone marks and reaches them as
 * `--logo-ink-2`. Only brands present in `brandLogos` need an entry.
 */
export type BrandInk = { primary: string; secondary?: string }

export const brandLogoInk: Partial<Record<Brand, BrandInk>> = {
  Frecciarossa: { primary: 'var(--brand-frecciarossa)' },
  Frecciargento: { primary: 'var(--brand-frecciargento)' },
  Frecciabianca: { primary: 'var(--brand-frecciabianca)' },
  Italo: { primary: 'var(--brand-italo)' },
  Trenord: { primary: 'var(--brand-trenord)', secondary: 'var(--brand-trenord-accent)' },
  Trenitalia: {
    primary: 'var(--brand-trenitalia)',
    secondary: 'var(--brand-trenitalia-accent)',
  },
  Intercity: { primary: 'var(--brand-intercity)' },
  'Intercity Notte': { primary: 'var(--brand-intercity)' },
  'Leonardo Express': { primary: 'var(--brand-leonardo)' },
}

/**
 * Marks that belong to a *category* rather than to a railway undertaking. Trenitalia's
 * regional services are branded as Regionale, not as Trenitalia, so the category is where
 * the mark lives.
 */
export const categoryLogos: Partial<Record<TrainCategory, ComponentType<BrandLogoProps>>> = {
  REGIONAL: RegionaleLogo,
  REGIONAL_FAST: RegionaleLogo,
}

export const categoryLogoInk: Partial<Record<TrainCategory, BrandInk>> = {
  REGIONAL: { primary: 'var(--brand-regionale)', secondary: 'var(--brand-regionale-accent)' },
  REGIONAL_FAST: {
    primary: 'var(--brand-regionale)',
    secondary: 'var(--brand-regionale-accent)',
  },
}

/**
 * Which mark a row gets, and in which ink.
 *
 * Brand normally wins: a Frecciarossa is a Frecciarossa whatever category it is filed
 * under. The exception is `Trenitalia` itself, which is not a service brand at all — it is
 * the operator's name standing in for one, because RFI's `vettore` column had nothing more
 * specific to say. For those rows the category is the *more* specific answer, and a regional
 * train gets the Regionale mark rather than the FS monogram.
 *
 * Gated on the operator, not just the category: Trenord runs regional services too, and
 * they are not Trenitalia Regionale.
 */
export function serviceLogo(row: Pick<BoardRow, 'brand' | 'category' | 'operator'>): {
  Logo: ComponentType<BrandLogoProps> | undefined
  ink: BrandInk
} {
  const fallbackInk: BrandInk = { primary: 'var(--identity-mono)' }
  if (row.operator === 'TRENITALIA' && (row.brand === null || row.brand === 'Trenitalia')) {
    const Logo = categoryLogos[row.category]
    if (Logo) return { Logo, ink: categoryLogoInk[row.category] ?? fallbackInk }
  }
  const Logo = row.brand ? brandLogos[row.brand] : undefined
  return { Logo, ink: (row.brand && brandLogoInk[row.brand]) || fallbackInk }
}

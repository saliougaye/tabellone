# PWA setup — design

Date: 2026-08-18
Scope: `TODO.md` "PWA setup" section (`apps/web`).

## Goal

Make Tabellone installable as a PWA (manifest + icons + service worker + link
tags), with app-shell offline support only. No offline board data — matches
the existing invariant that a stale board and a fetch failure must render
differently, and board data has a 90s Redis TTL / 20s poll cadence that makes
long-lived offline caching meaningless anyway.

## Components

### 1. Icons (`apps/web/public/icons/`)

Placeholder set — solid tiles matching the "filled tile, monochrome sigla"
operator-mark style from `CLAUDE.md`, using the `--surface-inverse` /
`--surface` light-mode oklch values from `theme.css` (converted to sRGB hex
since PNG has no native oklch: tile bg `#151619`, monogram `#f9fafb`).
Source SVGs committed alongside the rasterized PNGs, then converted with
`sharp-cli` (run via `npx`, not an added dependency — one-off generation
step, not part of the build):

- `icon-192.png`, `icon-512.png` — standard
- `icon-maskable-512.png` — safe-zone padded for adaptive-icon masking
- `apple-touch-icon.png` (180×180, no transparency — iOS ignores alpha)

Swap for real branding later; not a blocker for install/build.

### 2. Manifest (`apps/web/public/manifest.json`)

```json
{
  "name": "<strings.appName>",
  "short_name": "<strings.appName>",
  "description": "Arrivi e partenze in tempo reale per le stazioni italiane",
  "start_url": "/",
  "display": "standalone",
  "background_color": "<--surface light value>",
  "theme_color": "<--surface light value>",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Manifest fields are static (no dark-mode manifest variant — not a web
standard); pick the light `--surface` value for `theme_color`.

### 3. Service worker — `serwist` + `@serwist/turbopack`

This repo's `next build`/`next dev` default to Turbopack on Next 16.3.1
(confirmed: no `--turbopack` flag needed, banner says so already). The
webpack-based `@serwist/next` plugin doesn't support Turbopack at all —
`@serwist/turbopack` is the maintained alternative: instead of a webpack
plugin writing `public/sw.js` at build time, it serves the compiled SW
through a Next Route Handler (`createSerwistRoute`), bundled per-request
with `esbuild` (dev) / at build time (prod), avoiding a webpack dependency
entirely.

- Add deps: `serwist`, `@serwist/turbopack`, `esbuild` (native esbuild,
  required peer for `useNativeEsbuild: true` — faster than the WASM fallback
  and this only runs in Node, not the browser).
- `apps/web/src/app/serwist/[path]/route.ts` — `createSerwistRoute({ swSrc:
  'src/app/sw.ts', useNativeEsbuild: true, additionalPrecacheEntries: [{ url:
  '/~offline', revision }] })`, revision from `git rev-parse HEAD` (falls
  back to a random UUID) so the offline fallback busts cache per deploy.
  Exports `dynamic`, `dynamicParams`, `revalidate`, `generateStaticParams`,
  `GET` — all wired straight from the helper's return value.
- `apps/web/src/app/sw.ts` — `Serwist` instance, `precacheEntries:
  self.__SW_MANIFEST`. Runtime caching is `@serwist/turbopack/worker`'s
  `defaultCache` **with the `/api/*` entry overridden**: `defaultCache`'s own
  default treats `/api/*` as `NetworkFirst` with a 24h cache fallback, which
  is exactly the stale-data-while-offline behaviour the invariant forbids.
  Prepend an explicit `NetworkOnly` matcher for `sameOrigin && pathname.
  startsWith('/api/')` ahead of `defaultCache` in the `runtimeCaching` array
  — first match wins, so this shadows the weaker default. A `fallbacks`
  entry routes failed document-request navigations to `/~offline`.
- `apps/web/src/app/~offline/page.tsx` — minimal offline fallback page (new
  `strings.ts` entries, not English inline copy), shown only when a
  navigation fails with no cache — this *is* the "offline shell" the TODO
  item asks for; without it the SW would precache assets but offline
  navigation would still hit the browser's generic no-connection page.
- `next.config.ts` — wrap config with `withSerwist` from `@serwist/turbopack`
  (this variant only sets `serverExternalPackages` for `esbuild`/
  `esbuild-wasm`, no webpack changes).
- `apps/web/src/app/layout.tsx` — `<SerwistProvider swUrl="/serwist/sw.js">`
  (from `@serwist/turbopack/react`) wrapping `{children}`; it self-registers
  client-side, no manual `useEffect` needed.
- `apps/web/tsconfig.json` — exclude `src/app/sw.ts` from the program.
  `sw.ts` needs `/// <reference lib="webworker" />`, whose globals (`self`,
  `ServiceWorkerGlobalScope`, …) conflict with this project's `dom` lib in
  the same `tsc` run. `esbuild` transpiles the file without type-checking it
  either way, so nothing loses coverage — it just isn't in `pnpm typecheck`'s
  program.
- Dev: `defaultCache` from `@serwist/turbopack/worker` is already
  `NetworkOnly` for everything when `NODE_ENV !== 'production'` — no separate
  dev-disable step needed.

### 4. Layout wiring (`apps/web/src/app/layout.tsx`)

- `metadata.manifest = '/manifest.json'`.
- Next 16 splits viewport from metadata — add a `viewport` export with
  `themeColor` set to the same `--surface` value.
- `apple-touch-icon` link — either via `metadata.icons.apple` or an explicit
  `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` in
  `<head>`, whichever the installed Next version's metadata API supports
  cleanly (confirm during implementation, both are equivalent output).

## Out of scope

- Real branding/icon design (placeholder only, per decision).
- Offline caching of `/api/board` or `/api/stations` responses.
- Push notifications (already out of scope per `CLAUDE.md`).
- Automated Lighthouse/PWA CI check — manual verification only, this repo's
  test suite has no browser/e2e layer for it.

## Testing / verification

- `pnpm build` succeeds; `pnpm typecheck` and `pnpm lint` pass with `sw.ts`
  excluded from the TS program.
- `pnpm dev`: manifest served at `/manifest.json`, `<link rel="manifest">`
  present in rendered HTML, `/serwist/sw.js` responds (dev SW is
  network-only per `defaultCache`'s dev branch, still installable).
- `pnpm build && pnpm start`: SW registers (Application panel in
  devtools), app installable, `/api/*` requests never appear in the SW's
  cache storage even after multiple loads, reload while offline renders
  `/~offline` for a fresh navigation and the cached shell for an
  already-visited route — never a stale board.

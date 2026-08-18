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

Placeholder set — solid tiles using `--surface`/`--surface-inverse` oklch
tokens from `theme.css`, generated as SVG then rasterized to PNG:

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

### 3. Service worker — `serwist` + `@serwist/next`

- Add deps: `serwist`, `@serwist/next`.
- `apps/web/src/sw.ts` — `defaultCache` runtime strategies from
  `@serwist/next/worker`, `precacheEntries: self.__SW_MANIFEST` (static shell:
  JS/CSS/fonts/manifest/icons). Explicitly exclude `/api/*` from any runtime
  caching — network-only, no fallback — so board reads never serve stale data
  offline; a fetch failure surfaces as the existing "unreachable" UI state.
- `next.config.ts` — wrap config with `withSerwist` from `@serwist/next`,
  pointing at `src/sw.ts`, output to `public/sw.js`.
- Dev: serwist disables SW in `next dev` by default (avoids stale-cache dev
  pain) — verify in `next.config.ts` options, don't override.

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

- `pnpm build` succeeds, `public/sw.js` emitted.
- `pnpm dev`: manifest served at `/manifest.json`, `<link rel="manifest">`
  present in rendered HTML, no SW registered (serwist dev-disable).
- `pnpm build && pnpm start`: SW registers, app installable (manual browser
  check — Chrome install prompt / Application panel), reload while offline
  still renders shell (not board data).

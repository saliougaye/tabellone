# TODO — MVP gaps

## Core: fetcher/parser

- [x] `packages/core/src/fetcher.ts` — implement `fetchBoard(placeId, mode)`, only module allowed to speak HTTP to RFI iechub. Real endpoint verified live: `/ArriviPartenze/ArrivalsDepartures/Monitor?PlaceId={id}&Arrivals={True|False}` (ARCHITECTURE.md's shorthand was missing the `/ArriviPartenze` prefix). Rate limiter (`checkRateLimit`) and lock already lived in `store.ts`'s `BoardStore`/`tryRefresh`, wired through unchanged. **Not done:** the 429/5xx backoff-doubling-interval-up-to-5min from ARCHITECTURE 7.2 has no persistent per-station state anywhere yet — `tryRefresh` just fails and falls back to stale, it doesn't lengthen the retry interval. Separate follow-up.
- [x] `packages/core/src/parser.ts` — implement `parseBoard`/`parseNotices`, pure fn, HTML → `BoardRow[]`.
  - Bind on `id`/`headers` attrs, never column position (verified: RFI repeats the same cell `id` on every row, so lookups are scoped per-`<tr>`).
  - Operator/category via `alt`-attr lookup tables; unrecognised → `OTHER`/`null`. Recording into `unknown:*` couldn't live in the pure parser (ADR-003) — added `parseUnknownValues`, called from `store.ts`'s `tryRefresh` instead.
  - Time math via Luxon off `serviceDate` + `HH:MM`, `Europe/Rome`; Luxon's default DST resolution already matches both transitions, verified directly. Service date normally comes from the details-button id, but ~all arrival rows (trains with no further stops) have no button at all — falls back to the page's own `#UltimoaggiData` "aggiornato il" date. Found via a real crash (`Invalid time value`) after this was believed done; see fixed regression tests.
  - `CANCELLED`/`PARTIAL`/`REROUTED` detection is a flagged best-effort guess — no live example of any of the three turned up, and ARCHITECTURE.md doesn't document their DOM signal either. See `parser.ts`'s module comment.
- [x] 18 HTML fixtures committed (`packages/core/src/fixtures/`) — all 8 required cases covered; 15 are real unedited captures, 3 (cancelled/partial/rerouted) are synthetic-flagged per above.
- [x] Parser unit tests against fixtures — `parser.test.ts`, 28 cases, all passing.
- [x] Real `rfiPlaceId`s for the 3 catalog stations: Milano Centrale `1728`, Roma Termini `2416`, Napoli Centrale `1888`.
- [x] `/api/board/:slug` verified end-to-end live (dev server, both departures and arrivals, desktop and mobile hero card) — real RFI data renders, no more 503. Also found and fixed two real crashes surfaced by this: `ViaStop.time` (bare `HH:MM`) was being passed through `formatTime` (expects ISO) in three call sites in `apps/web`.

## Cleanup (post-backend landing)

- [x] Delete `/dev/scenari` dev-only scenario gallery.
- [x] Delete `apps/web/src/fixtures` typed fixtures (never crossed API boundary, TEMPORARY per CLAUDE.md).

## PWA setup

- [x] `app/manifest.ts` — name, icons, theme colour from `tokens.css` palette, `display: standalone`.
- [x] Icon set (multiple sizes) + `apple-touch-icon`. Placeholder art, swap for real branding later.
- [x] Service worker for installability/offline shell (`@serwist/turbopack` — `@serwist/next`'s webpack plugin doesn't support this repo's Turbopack-default builds).
- [x] `<link rel="manifest">` + `theme-color` meta in `apps/web/src/app/layout.tsx`.

# Improvements
- Switch departurs arribals to slow, add a loading state
- on mobile station name overflowing
- on mobile when changing station should open a bottom sheet
- add animations
- investigate new ui for notices
- investigate new ui for train stops
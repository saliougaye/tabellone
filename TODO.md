# TODO — MVP gaps

## Core: fetcher/parser

- [ ] `packages/core/src/fetcher.ts` — implement `fetchBoard(placeId, mode)`, only module allowed to speak HTTP to RFI iechub. Wire rate limiter (5 req/s global token bucket) and 429/5xx backoff hooks per ARCHITECTURE.md.
- [ ] `packages/core/src/parser.ts` — implement `parseBoard`/`parseNotices`, pure fn, HTML → `BoardRow[]`.
  - Bind on `id`/`headers` attrs, never column position.
  - Operator/category via `alt`-attr lookup tables; unrecognised → `OTHER`/`null` + write to `unknown:*` Redis set.
  - All time math via Luxon/Temporal off `serviceDate` (from details-button id, `YYYYMMDD`) + `HH:MM`, `Europe/Rome` — not `Date`, both DST transitions must be explicit.
- [ ] ~20 real HTML fixtures committed for parser tests. Required cases: empty station, cancelled train, partial cancellation, unassigned platform, three-digit delay, rerouted train, board-level notices, unrecognised operator.
- [ ] Parser unit tests against fixtures (testing strategy in CLAUDE.md).
- [ ] Real `rfiPlaceId`s for the 3 catalog stations (currently `"PLACEHOLDER"`) — blocks end-to-end fetcher testing.
- [ ] Once fetcher+parser real, `/api/board/:slug` naturally stops always hitting the 503 catch branch — no route code change expected, just verify behaviour.

## Cleanup (post-backend landing)

- [ ] Delete `/dev/scenari` dev-only scenario gallery.
- [ ] Delete `apps/web/src/fixtures` typed fixtures (never crossed API boundary, TEMPORARY per CLAUDE.md).

## PWA setup

- [x] `app/manifest.ts` — name, icons, theme colour from `tokens.css` palette, `display: standalone`.
- [x] Icon set (multiple sizes) + `apple-touch-icon`. Placeholder art, swap for real branding later.
- [x] Service worker for installability/offline shell (`@serwist/turbopack` — `@serwist/next`'s webpack plugin doesn't support this repo's Turbopack-default builds).
- [x] `<link rel="manifest">` + `theme-color` meta in `apps/web/src/app/layout.tsx`.

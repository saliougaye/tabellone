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
- [x] Switch departures/arrivals felt slow — added a loading state and moved fetching to React Query (`@tanstack/react-query`, provider in `apps/web/src/lib/query-provider.tsx`). The board cache is keyed `['board', slug, mode]`, so the toggle is a different key: the old mode's rows no longer sit under the new label while the request is in flight. During that window the header (station, favourite, toggle) stays mounted and the rows become shape-matched placeholders (`BoardSkeleton`, new `tab-skeleton` keyframe in `theme.css` with a `prefers-reduced-motion` override). A mode already fetched paints instantly. `refetchInterval` + React Query's focus manager replace the hand-rolled 20 s timer and hidden-document suspension; `/api/stations` moved to React Query too.
- [x] on mobile station name overflowing — the station name sat in a `whitespace-nowrap` span with no `overflow` on the header, so "MILANO CENTRALE" at `--type-title` ran past 375px and under the chevron. New `MarqueeText` (`apps/web/src/components/board/marquee-text.tsx`) clips the line and scrolls it to its end and back, but only when it measures a real overflow (`ResizeObserver`, so short names never move); distance and duration are per-instance, the shape is the new `tab-marquee`/`--anim-marquee` in `theme.css`. Under `prefers-reduced-motion` there is nothing to substitute — no keyframe can reveal hidden text — so the line wraps instead. Chevron and favourite star are now `flex-none` outside the scrolling area; desktop title got the same treatment, since a long name overflows there too.
- [x] on mobile when changing station should open a bottom sheet — the station name on the board is a button below 600px (`onOpenPicker` in `board-view.tsx`) that opens `StationSheet`, the full `StationPicker` inside a new native-`<dialog>` bottom sheet (`components/ui/bottom-sheet.tsx`): platform focus trap/inert/Esc, plus the two things `<dialog>` doesn't give — an exit animation (`close()` would cut the slide-out, so a `closing` state waits for `animationend` with a timeout fallback) and background scroll lock. Desktop keeps the link to `/` unchanged. Motion is **not** ours: the first hand-rolled `<dialog>` + keyframes version opened and closed correctly but didn't *feel* like a sheet, so it now sits on **`vaul`** — drag tracking, rubber-band past the top edge, velocity-based release, iOS curve `cubic-bezier(0.32, 0.72, 0, 1)`, plus `shouldScaleBackground` shrinking the page behind it. vaul writes transform and curve inline, so `theme.css` keeps only the `prefers-reduced-motion` override for it (`!important` — nothing else outranks inline styles) and no `--anim-sheet-*` tokens. `setBackgroundColorOnScale={false}`: the overlay already veils the strip around the scaled page, and vaul's forced black would flash through the light theme on close. Radix underneath also replaces the focus trap, Esc, inert background and scroll lock we were hand-maintaining. No height jump on a cold open: the panel is `h-[88dvh]` (fixed, not `max-h`) so neither the catalogue landing nor a search keystroke resizes it, and `StationPicker` takes a `loading` prop — `useStations`' pending state, kept distinct from `stations === null` which means the read *failed* — rendering `PickerSkeleton` at the real row heights. `SkeletonBlock` moved out of `board-states.tsx` to `components/ui/` so board and picker placeholders share one geometry and pulse. Measured cold with `/api/stations` delayed 3 s: panel 743px while loading and 743px after, skeleton → 2441 rows. Catalogue moved to a shared `useStations` hook, so the sheet and the picker page hit one React Query key; the sheet mounts only on first open, so a desktop session never fetches for it.
- [x] add animations — `theme.css` already carried the whole motion system; five of its
  transitions were defined and unused. Now wired, plus the small amount of new motion the
  design pass called for (`docs/superpowers/specs/2026-08-18-board-animations-design.md`).
  Entry needs no diffing: a list `key` that was not in the previous render is a new DOM
  node, so `animate-row-entry` plays on first paint, staggered by
  `animationDelay: calc(var(--stagger-delay) * index)`. Exit is the only part that needs
  state — a departed train is simply absent from the next poll, and no keyframe can play on
  an unmounted node — so `use-departing-rows.ts` holds a vanished key one more beat in the
  gap it left, with its last row snapshot, and the caller reads `status` off that to pick
  between `animate-exit-departed` and `animate-exit-cancelled`. The hold length is read
  from `--duration-exit` rather than a hand-matched JS constant, floored at 50ms so the
  reduced-motion 1ms still leaves React a frame to commit. Entry/exit live on a wrapper
  element, not the row's own box: `animate-halo-pulse` compiles to the same `animation`
  shorthand and a blinking row would keep only whichever class Tailwind emitted last.
  `use-rolled-value.ts` rolls the dominant time when the delay changes (up = worsening),
  keyed so the `both`-filled `animate-value-*` keyframe plays at all; `LaterRow` is skipped
  on purpose. `ModeToggle`'s active surface is now one pill sliding behind both segments —
  `left`/`width` measured off the active button, because the segments are only equal width
  below 600px so no `translateX(100%)` lands on both breakpoints; until the first
  measurement the active segment still paints its own background, so SSR and first paint
  are unchanged. Press feedback is plain `active:scale-[0.97]` on `--duration-instant`;
  it has to be spelled `scale`, not `transform`, in a control's own `transition-[…]` list,
  since Tailwind's `scale-*` sets the independent `scale` property. One new keyframe,
  `tab-favourite-pop` (borrowing `--curve-snap`, fires only off→on), with its
  reduced-motion entry alongside the other ten. Page transition was descoped to the true
  initial mount of `BoardScreen`'s `<main>` (`--motion-screen`): `router.replace`
  navigations are excluded, because the mode switch already has tuned skeleton logic a
  page-level fade would only muddy. `animate-platform-confirm` needed no fix — `PlatformBox`
  swaps to a different branch's `<span>`, which changes `animation-name` and replays the
  keyframe on the poll where confirmation happens. Both hooks are unit-tested (22 cases,
  `@testing-library/react` added to `apps/web`); the keyframes themselves stay manually
  verified, since `/dev/scenari` is gone and nothing else can drive entry/exit on demand.
- [ ] investigate new ui for notices
- [ ] investigate new ui for train stops
- [x] fix when no data is present in the row dont show anything — RFI pads a short board out to a fixed row count with blank `<tr name="treno">` rows (no `id` on the `<tr>`, `RTreno`/`RStazione`/`ROrario` all empty); they were rendering as `00:00` departures to nowhere. `parser.ts` drops them (`isFillerRow`), new real fixture `filler-rows.html` (Abano Terme, 1 real train + 14 fillers) + 2 tests.
- [x] show trains logos — the board's service mark is now the logo slot `theme.css` §7 always
  reserved but nothing ever filled (`--logo-width` 88×22, mobile 64×18) plus the existing
  operator tile: slot answers *which service*, tile answers *who runs it*. Brand logos are
  committed SVG paths drawing in `currentColor` (`apps/web/src/components/board/brand-logos.tsx`),
  coloured by per-theme `--brand-*` tokens — RFI is not a source, its `logoCliente` `src` is a
  34-byte 1×1 spacer with the real mark in a stylesheet sprite that is both off-limits and out
  of date. Shipped: the Frecce monogram (Frecciarossa/Frecciargento/Frecciabianca), Italo's hare,
  Trenord's sail, the FS monogram for Trenitalia, the Intercity and Leonardo Express
  wordmarks, and Regionale — all traced from reference rasters by `scripts/trace-logo.py`.
  A mark's second fill comes from `--logo-ink-2` declared with `currentColor` as its
  fallback, which is also what makes a cancelled row mute both halves by just omitting the
  property. Regionale is keyed on **category**, not brand, because Trenitalia's regional
  services are branded Regionale and RFI's `vettore` column only says "TRENITALIA";
  `serviceLogo` encodes that precedence. Frecciabianca and Frecciargento have wordmark
  references that are deliberately unused — past ~4.5:1 the slot's width cap scales a
  wordmark below 15px tall and it turns to mush, so those two keep the monogram. Only
  Malpensa Express still falls back to text. `brand` in
  `packages/core/src/types.ts` is now a `Brand` union, so a brand the parser learns without a
  presentation entry is a typecheck error rather than an empty slot. The duplicate
  `serviceLabel` text was removed from all four row shapes; slot + tile share one
  `role="img"`/`aria-label` so a screen reader hears the service once.
- [ ] POC with ollama parsing html
- [x] Change URL to improve seo: /:station/arrivi and /:station/partenze — new canonical
  path routes `apps/web/src/app/stazioni/[slug]/partenze/page.tsx` and `.../arrivi/page.tsx`,
  each with its own `generateMetadata` (title/description/canonical). Whole board route
  moved under a `/stazioni` prefix (ADR-011, supersedes ADR-010's URL-stability guarantee —
  accepted pre-launch, nothing indexed yet): `/stazioni/[slug]` and `?view=` still resolve
  but now carry `canonical` links to the matching path route; internal navigation (mode
  toggle, station picker) points at the new routes.
- [ ] Internalization: url with /:locale/stations/:station/departures and /:locale/stations/:station/arrivals
- [x] Add offline screen state, now shows the no data state — offline is its own state now,
  same layout as the failed read (`BoardMessage`, shared by both plus the service worker's
  `/~offline` fallback) with its own copy and a struck-through `TrainIcon`. The reason it
  was showing as "dati non disponibili" is not what it looked like: React Query's default
  `networkMode: 'online'` **pauses** a query while the browser reports no connection, so an
  offline board never errors — it stays `isPending` and the screen sat on "Caricamento…"
  indefinitely. So `useOnline` (`useSyncExternalStore` over the `online`/`offline` events,
  server snapshot `true` so hydration matches) is checked *before* `loading`, not after, in
  `board-screen.tsx`; `useStations` encodes the same rule for the picker and the mobile
  sheet (`loading` only counts while online, no catalogue while offline is a failure with
  `offline: true` for the copy). A board already fetched survives going offline and is
  flagged `isStale` — cached rows beat an empty screen, and nothing can refresh them until
  the network returns. `refetchOnReconnect` is spelled out in the query provider because
  the offline screen leans on it: coming back online repaints by itself, verified live, so
  "Riprova ora" is an option and not the only way out. Side fix found while verifying:
  `freshnessLabel` said "Dati di 0 min fa" for a board that went stale seconds ago —
  under a minute it now reads "Dati non aggiornati".
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

UI implemented; `catalog` and `store` are real, `fetcher`/`parser` are not. `packages/core`
(the domain package — despite the diagram below still saying `packages/board`, the actual
directory on disk is `packages/core`) has `catalog.ts` reading the real
`src/catalog/stations.json` and `store.ts` doing the full refresh-on-read orchestration
against a real Redis client (`redis-board-store.ts`, `ioredis`). `fetcher`/`parser` are
still documented signatures that throw `NotImplementedError` — writing `parser` needs the
~20 committed HTML fixtures the testing strategy calls for, and hasn't happened yet.
Route handlers are wired to the real chain: `GET /api/stations` serves the real catalogue
with a content-hash ETag; `GET /api/board/:slug` runs the real cache/lock/rate-limit path
and today always ends by catching `fetchBoard`'s `NotImplementedError` and answering
**503** (the same "RFI unreachable, nothing cached" slot the contract already reserved) —
honest, not a stub 200, and this route does not need to change again once `fetcher` and
`parser` land. Local Redis: `pnpm redis` (docker compose, no volume, flush-safe).
`apps/web` has the real UI, in its **sixth design pass (September 2026)**, laid over the
fifth, **"Carta"**, and the fourth, **"Rotta"**. Rotta drew the board: a stack of flight
cards — the brand's own logo, a status pill, the route drawn large (where and when it
leaves · a dashed line with the train and the journey time · where and when it arrives),
the platform and a countdown — with the next train as a bigger hero card and the rest
grouped by how soon (within half an hour, within the hour, later, cancelled). Carta set it
on paper (white ground, white cards told apart by a hairline, the green accent only where
it means something) in **Figtree**. The sixth pass took every picture out (the city photos
of the fifth were tried and dropped; there is no image anywhere in the UI now) and gave
the station its **head**: the city and a labelled **"Segui" / "Seguita"** pill on the first
row, the station name on the second as the **switcher** (a link home with a chevron in a
disc). The home is **"Vetrina"** without pictures: greeting and question, the search, one
chip that narrows to the favourites, one even grid of station cards (favourites, recents,
majors, told apart by a tag). The catalogue carries `city` for the ~100 biggest stations
(103 as of September 2026), shown as the head's first line; the rest have `city: ""`.
Search and filters narrow the board in hand
(`lib/board-filter.ts` for text, plus operator and train-type toggles in a sheet that
carries the operators' logos); tapping a card opens the train's sheet (bottom on phones,
centred dialog from 640px); the train's own page (`/stazioni/:slug/partenze/:trainNumber`,
ADR-012) is the same card and rail, full page. Favourites and recents in `localStorage`;
the home redirects once per session to the last board (`lib/last-station.ts`).

The design system is `app/theme.css`, read its header before touching it:
- **Materials.** No images. White ground, white cards at 16px with a 1px hairline and a whisper of
  shadow, 1px borders on controls, Figtree (`next/font`, `--font-figtree`) at heavy weights
  with tight tracking, tabular figures through `font-variant-numeric`. Everything is
  `light-dark()`; the system decides, no `data-theme`. The dark half keeps Rotta's grouped
  dark green ground. Light is the face the app is judged by.
- **Colour.** Neutrals `--bg / --card / --fg / --muted / --muted-fg / --border`; one accent
  pair `--p / --pf` (green) read through `--primary / --primary-fg`, which is what the
  platform block, "in partenza", the countdown, the route dots and the primary button
  share; four state colours; brand and operator colours are brand and did not move.
  `lib/presentation.ts` and `components/board/brand-logos.tsx` resolve against the
  `--state-*`, `--identity-*` and `--brand-*` names the theme keeps.
- **Vocabulary.** Component classes keep the shadcn names they were written in (`sh-btn`,
  `sh-input`, `sh-tabs`, `sh-badge`, `sh-card`, `sh-alert`, `sh-sheet`, `sh-toggle`) plus
  the flight card (`fl-card`, `fl-route`, `fl-pill`), the station head (`sh-head`,
  `sh-switch`, `sh-follow`) and the home (`sh-chips`, `sh-grid`, `sh-tile`). Tailwind stays only for preflight and `sr-only`. The theme file is
  layered in the order the passes happened; the last block on a token wins — the Carta
  block at the end of the file is the last word on the neutrals, the accent and `--sans`.
- **Motion.** Cards and station cards rise 10px and fade in on mount, staggered 40ms by position
  (capped at 8) via `@starting-style`; the sheet rises, the veil fades; press feedback is
  `scale(0.96)` at 90ms; nothing moves under `prefers-reduced-motion`.

The earlier passes (signage, sodium, and the token-level redesigns before them) are gone
from the tree; the brand logos (`brand-logos.tsx`, its README) and the pure
presentation helpers survived them all. The station catalogue holds 2435 real stations
with real `rfiPlaceId`s, 3 of them flagged `isMajor`; slugs are final (ADR-007).

Everything below about fetching and parsing is still the design contract to build against.

`ARCHITECTURE.md` is the authoritative spec (11 ADRs in `adrs/`). Read it before any
structural work, and **update it before a structural change, not after**. `CONTEXT.md`
holds the vocabulary; code identifiers are English, user-facing copy is Italian, and all
UI strings live in `apps/web/src/strings.ts` (ADR-009).

## Visual design reference

`design/` holds the Claude Design export of the UI mockups. It is **gitignored** — a local
reference, not a build input. Source of truth, re-download from here if missing:

<https://claude.ai/design/p/c4719534-c614-4a44-bb8a-edd4540e5295>
— project "Tabellone ferroviario tempo reale". Pull it with the `claude_design` MCP server
(`https://api.anthropic.com/v1/design/mcp`, authenticate with `/design-login`).

- `tokens.css` — the design system: four typographic levels, hand-written dark and light
  palettes with contrast ratios in the comments, six named motion transitions, and
  `prefers-reduced-motion` overrides that redefine the keyframes by name. When building the
  UI, take colours, spacing and durations from here rather than inventing them.
- `01`–`02` are the system and component sheets; `10`–`14` are the screens (board and
  station picker, desktop and mobile, plus the empty state); `15 Prototipo` wires them into
  a clickable flow.
- The mockups are `.dc.html` — Claude Design's own template format, not runnable app code.
  Read them for layout and token usage; do not copy them into `apps/web` verbatim.
- The service mark is two halves: the **logo slot** (`tokens.css` §7, capped at 88×22,
  mobile 64×18 — a ceiling, not a fixed measure: the sheet sized it fixed against an image
  arriving late, and nothing arrives here) and the **operator tile** (filled, 2–3 letter
  monochrome sigla). The tile answers *who runs it*, the slot answers *which service*.
  Brand logos are **ours, committed, inlined as SVG paths drawing in `currentColor`** —
  never fetched, never RFI's; a two-tone mark takes its second fill from `--logo-ink-2`.
  RFI's own `logoCliente`/`logoCategoria` images are a 34-byte 1×1 spacer GIF with the real
  mark in a stylesheet sprite, so the "no base64 data URIs in our payload" invariant costs
  nothing to hold. A brand with no asset falls back to the service name as text in the same
  slot, capped identically. Provenance, the tracing method and what is still missing:
  `apps/web/src/components/board/README.md`.
- The two `uploads/*.png` files are truncated: the sync tool caps file reads at 256 KiB.
  Download them from the web UI if they are ever needed.

## What Tabellone is

A Next.js PWA showing real-time arrivals/departures for Italian railway stations, all
operators in one view (Trenitalia, Italo, Trenord, regional). The single data source is
the RFI infrastructure-manager board at `iechub.rfi.it/ArriviPartenze`, scraped from HTML
— there is no API and no second source to merge (ADR-004).

## Architecture

```
apps/web (Next.js: SSR + route handlers + UI)
    └── packages/core (domain)
            catalog → fetcher → parser → store
                                            └── Redis (cache only)
                                            └── iechub RFI (external)
```

- `catalog` — static JSON in the repo, `slug → rfiPlaceId`. Not in Redis, imported at build time.
- `fetcher` — the only code that speaks HTTP to RFI. `fetchBoard(placeId, mode)`.
- `parser` — HTML → `BoardRow[]`. **Pure function, zero I/O** (ADR-003).
- `store` — the only module that knows the Redis key schema, TTLs, and the lock
  (`redis-board-store.ts` is the concrete Redis client behind it).

**Hard rule:** `packages/core` never imports from Next — no `next/headers`, no
`NextRequest`, no `after()`. Runtime hooks are passed in as parameters. This is what keeps
extraction into a standalone service cheap (ADR-002).

## Invariants that are easy to break

- **Parser binds to `id`/`headers` attributes, never column position.** Cells are
  `RVettore`, `RCategoria`, `RTreno`, `RStazione`, `ROrario`, `RRitardo`, `RBinario`,
  `RExLampeggio`, `RDettagli`.
- **Operator and category are images**, readable only via `alt`. Use explicit lookup
  tables, never text heuristics. Unrecognised values → `OTHER`/`null` plus a record in
  `unknown:*` so the silent failure becomes noisy (ADR-008).
- **Never cache raw RFI HTML, never propagate its base64 logo data URIs** into our
  payload. The UI ships its own icons.
- **All time arithmetic on the server.** Client gets absolute ISO timestamps and only
  renders "in 7 min". Reconstruct timestamps from `serviceDate` (in the DOM, `YYYYMMDD` in
  the details-button id) + `HH:MM` in `Europe/Rome`, using Luxon or `Temporal` — **not
  `Date`** — so the two DST transitions are handled explicitly.
- **Raw RFI values never cross the API boundary.** `status`, `operator`, `category` are our
  own enums.
- **Slug is the public identifier; `rfiPlaceId` never appears in a URL, payload or
  favourite** (ADR-007). Slugs are generated once when building the catalogue, never
  derived from the name at runtime, and are immutable after publication.
- **Route handlers for board reads, Server Actions only for mutations** (favourites)
  (ADR-001).
- Train numbers are **alphanumeric** (`CB710`), not digits only. BUS is an ordinary
  category, not an edge case.
- An empty board at night is a **normal** state and must render differently from a fetch
  failure.

## Caching and outbound rate limiting

No scheduled refresher — data refreshes **on read** (ADR-006), client polls every 20 s and
suspends while the document is hidden.

- Board TTL 20 s · stale-while-revalidate up to 60 s · Redis key TTL 90 s
- **Single-flight lock** `SET lock:{placeId}:{mode} 1 NX EX 15` before every RFI call. This
  is the most important component in the system: it makes RFI load proportional to active
  stations, not users. If the lock is held, serve stale.
- Global ceiling 5 req/s towards RFI (token bucket on Redis)
- Backoff on 429/5xx: double that station's interval up to 5 min, keep serving stale with
  `isStale: true`. Never retry immediately.

Keys: `board:{placeId}:{dep|arr}`, `lock:{placeId}:{mode}`, `health:rfi` (LIST, last 100
outcomes), `unknown:vettore|categoria|status` (SET). **Nothing is persisted in v1** — Redis
is pure cache and can be flushed at any time. Favourites live in `localStorage`.

Log every RFI response to `health:rfi` with status code and latency.

## API contract

```
GET /api/stations                     catalogue, long ETag
GET /api/board/:slug?mode=departures  StationBoard JSON (polling + SSR)
```

`/api/board/:slug` returns `StationBoard` under every condition where the station and mode
are valid; only "RFI unreachable and no cache" yields 503. Missing/invalid `?mode=` is 400,
unknown `:slug` is 404 — neither was in the original state table, both are `{ error: string
}` like every other non-200 response here. There is no streaming endpoint.

## Testing strategy

- `parser` — unit tests against ~20 real HTML fixtures committed to the repo. Required
  cases: empty station, cancelled train, partial cancellation, unassigned platform,
  three-digit delay, rerouted train, board-level notices, unrecognised operator.
- `store` — integration tests against an ephemeral Redis; specifically lock behaviour under
  concurrency and stale-while-revalidate.
- `fetcher` — not tested in CI (network-dependent); covered by the production canary.

## Conventions

- UI language is Italian, single language in v1, but strings live in one module rather than
  scattered across components (ADR-009).
- Scope discipline: this is a POC. What the POC does not need is deferred, not anticipated.
  Out of scope in v1: journey search, ticketing, push notifications, accounts, live train
  position, kiosk mode.
- Scraping stays respectful — aggressive caching, single-flight lock, global ceiling. Do not
  add code that increases outbound RFI traffic without accounting for it here.

## Commands

Node 22 (`.nvmrc`), pnpm 10. Run from the repo root:

```bash
pnpm install              # workspace install
pnpm dev                  # next dev (apps/web)
pnpm build                # next build (apps/web)
pnpm lint                 # biome check .
pnpm lint:fix             # biome check --write .
pnpm typecheck            # tsc --noEmit in every package
pnpm test                 # vitest run (projects: core in node, web in jsdom)
pnpm vitest run packages/core/src/store.test.ts   # single test file
pnpm redis                # docker compose up -d (local Redis, no volume)
```

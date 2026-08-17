# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Scaffolded, not implemented. The pnpm workspace, toolchain and module skeleton exist:
`packages/core` has every module (`catalog`, `fetcher`, `parser`, `store`, `types`) as
documented signatures that throw `NotImplementedError`, and `apps/web` has the two pages
and the route handlers as placeholders (the API stubs answer **501**, deliberately — a
stubbed 200 with an empty board would be indistinguishable from a quiet night). The
station catalogue (`packages/core/src/catalog/stations.json`) is an empty list. No
behaviour exists yet; everything below is still the design contract to build against.

`ARCHITECTURE.md` is the authoritative spec (10 ADRs in `adrs/`). Read it before any
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
- Note the operator mark is a **filled tile with a 2–3 letter monochrome sigla**, never a
  fetched logo image. This matches the invariant that RFI's base64 logo data URIs never
  reach our payload.
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
    └── packages/board (domain)
            catalog → fetcher → parser → store
                                            └── Redis (cache only)
                                            └── iechub RFI (external)
```

- `catalog` — static JSON in the repo, `slug → rfiPlaceId`. Not in Redis, imported at build time.
- `fetcher` — the only code that speaks HTTP to RFI. `fetchBoard(placeId, mode)`.
- `parser` — HTML → `BoardRow[]`. **Pure function, zero I/O** (ADR-003).
- `store` — the only module that knows the Redis key schema, TTLs, and the lock.

**Hard rule:** `packages/board` never imports from Next — no `next/headers`, no
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

`/api/board/:slug` returns `StationBoard` under every condition; only "RFI unreachable and
no cache" yields 503. There is no streaming endpoint.

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

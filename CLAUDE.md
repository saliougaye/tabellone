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
`apps/web` has the real UI, in its **seventh design pass (November 2026), "Biglietti"**, laid
over the sixth ("Vetrina"), the fifth ("Carta") and the fourth ("Rotta"). The board and the home
carry `.bt` on their `<main>` and are drawn entirely by the last block of `app/theme.css`. Every
train is a perforated **ticket**: a stub coloured by who runs it (Trenitalia red, Italo bordeaux,
Trenord green) carries the time (the old one struck and the new in yellow when late, "tra X min"
under it), then the destination, the service mark and number, a pill only when late or cancelled,
and the platform as a black split-flap tile (a dashed box while unassigned). Tickets are grouped
"I tuoi treni / Entro 30 minuti / Entro un'ora / Più tardi" (one column on a phone, three from
desktop width); tapping one opens its sheet (bottom sheet on phones with drag-down to close,
centred dialog from 640px) with the route, platform, state, countdown, stops, **"Segui questo
treno"** and share. **The train page is the board with that sheet open** (ADR-012):
`/stazioni/:slug/partenze/:trainNumber` (and `/arrivi/…`) renders `BoardScreen`, and the open
sheet lives in the URL (`lib/train-url.ts`: a ticket tap `pushState`s the train URL with a `null`
state — never `history.state`, Next's router would rewrite it back —, Back closes, X/drag/veil go
back or `replaceState` to the board on a cold visit, the mode tabs close it first). A train no
longer on the board gets a small "Non è più sul tabellone" sheet. **Following a train** is
client-only (`lib/followed-trains.ts`, `localStorage`, at most 5, each drops 3 h after its
scheduled/expected time): followed tickets carry a star and sit first under "I tuoi treni", and
the home lists them first as mini tickets with live platform and delay (muted "Non più sul
tabellone" with × when the board dropped it). The header is **"Cerca prima"**: station name (a
button — it opens "Cambia stazione": catalogue search, favourites, recents and the "Segui"
toggle) and the clock with a live dot ("dal vivo / dati di N min fa / offline") on one small line,
a large search field that sticks while scrolling (with an "⇄ Arrivi/Partenze" button appearing
inside it once stuck, and the stale/offline strip while the data is old), Partenze/Arrivi as two
equal tabs, and operator chips with coloured dots once there are rows. **Board states** are
`components/board/board-states.tsx` (`st-*`): ticket-shaped skeletons (after 4 s "RFI risponde
lentamente"), a moon card for an empty board — a normal night, never red —, "RFI non risponde"
(nothing cached; retries itself) and its own "Sei offline" card; platform tiles dim while stale.
**Notices are tickets too** ("Biglietto"): `packages/core/src/notices.ts` reads RFI's text on the
server (ADR-013) into `{ kind: 'strike', from, to, national, who, text }` or `{ kind: 'info', text }`;
the client (`lib/strike.ts`) only compares those instants with now — announced (> 24 h before) /
imminent (< 24 h) / ongoing / over (shown 3 h, then hidden) — to colour a strike ticket at the top
of the list, whose sheet shows the window, who strikes, "Qui ora: N in ritardo · N soppressi" while
under way and RFI's original words; any other notice is one quiet collapsible line. The home is
**"Vicino e tue"**: "I tuoi prossimi treni", the search, the followed trains, then up to three live
cards (the next three departures each, as mini tickets, with Partenze/Arrivi links) — the nearest
station within 30 km (`lib/nearest-station.ts`, automatic when geolocation is already granted, else
a dashed "Mostra la stazione più vicina" row), then favourites, then recents, else the major
stations under "Grandi stazioni"; the reader's other stations are pills. The home's **read budget is
three boards per open, once, no polling** (ARCHITECTURE 7.2): `lib/home-plan.ts` gives the
followed trains' stations (departures or arrivals, one read per station and mode) the first
slots and the cards what is left. Search and chips narrow the board in hand (`lib/board-filter.ts`,
`lib/board-view.ts`), never a second read. Favourites, recents and followed trains live in
`localStorage`; the home redirects once per session to the last board (`lib/last-station.ts`).
The catalogue carries `city` for the ~100 biggest stations (shown in search results and on the
home cards). Runs of apostrophes in RFI names (D followed by four quotes, "Ponte d'Adda") are
collapsed to one in the parser.

The design system is `app/theme.css`, read its header before touching it:
- **Materials.** No images. White tickets (16px-ish radius, perforation notches cut with a CSS mask)
  on a grey ground (`--bg`), Figtree (`next/font`, `--font-figtree`) at heavy weights with tight
  tracking, tabular figures through `font-variant-numeric`. Everything is `light-dark()`; the
  system decides, no `data-theme`.
- **Colour.** Neutrals `--bg / --card / --fg / --muted / --muted-fg / --border`; the accent is ink
  (`--p` = `--fg`), not green; colour is an **operator code**: `--f-trenitalia / --f-italo /
  --f-trenord / --f-other` fill the stubs and chip dots, `--tk-*` the pills, `--nt-red / --nt-amber`
  the strike phases. Brand and operator colours are brand and did not move;
  `lib/presentation.ts` and `components/board/brand-logos.tsx` resolve against the `--state-*`,
  `--identity-*` and `--brand-*` names the theme keeps.
- **Vocabulary.** The seventh-pass block is scoped under `.bt` and uses its own families: `tk-*`
  (stub, pill, ticket sheet, the "gone" sheet), `mx-*` (the list of tickets), `bt-*` (frame, flap
  tiles, rows skeleton), `hd-*` (header and its sheets), `ho-*` (home, incl. `ho-fol` followed
  trains), `nt-*` (notices), `st-*` (board states: live dot, stale strip, skeleton, cards). The
  older shadcn-named classes (`sh-btn`, `sh-card`, `sh-badge`, …) remain only for `Message` and the
  offline page. Tailwind stays only for preflight and `sr-only`. The theme file
  is layered in the order the passes happened; the last block on a token wins.
- **Motion.** Tickets and cards rise 10px and fade in on mount, staggered 40ms by position (capped
  at 8) via `@starting-style`; platform figures roll in once and flip when RFI changes them; sheets
  slide, the veil fades; press feedback is `scale(0.96–0.98)`; nothing moves under
  `prefers-reduced-motion`.

The earlier passes (signage, sodium, and the token-level redesigns before them) are gone
from the tree, and so are the picker, the `?variant=` switch, every prototype variant of the
seventh pass (`components/swag`) and the old train page with its flight card; the brand logos (`brand-logos.tsx`, its README) and the pure
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

The home reads up to **three** boards (`departures` or `arrivals`) per open, once and without
polling (the followed trains' stations first, then nearest station, favourites/recents or
majors): same cache, lock and ceiling as a board page, accounted for in ARCHITECTURE 7.2. More cards or polling on the home means revising that section first.

## API contract

```
GET /api/stations                     catalogue, long ETag
GET /api/board/:slug?mode=departures  StationBoard JSON (polling + SSR)
```

`/api/board/:slug` returns `StationBoard` (its `notices` are `BoardNotice[]`, read on the server — ADR-013)
under every condition where the station and mode
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

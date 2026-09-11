# Architecture — Tabellone

> Project architecture document. It describes structural decisions, component boundaries
> and the constraints to respect. Update it **before** a structural change, not after.

**Status:** draft (POC) · **Last revised:** August 2026

---

## 1. Goal and scope

Tabellone is a web app (PWA) showing real-time arrival and departure times for Italian
railway stations, with **all operators together** — Trenitalia, Italo, Trenord, regional
services — in a single view.

### Why it exists

No official source covers this use case well:

- **ViaggiaTreno / Trenitalia app** — covers stations served by Trenitalia; Italo trains
  appear only partially, or without reliable real-time data.
- **Italo In Viaggio** — Italo trains only.
- **iechub.rfi.it/ArriviPartenze** — the official RFI monitor, which *already* contains
  every operator, but its interface is designed for the physical displays in stations.

Since RFI is the infrastructure manager, its board is the only genuinely neutral source:
every train running on the network passes through it. **There is no need to merge
multiple sources.**

### In scope (v1)

- Per-station arrivals and departures board, updated in real time
- Station search, favourite stations, nearest station
- Next stops for a selected train, shown in a detail panel
- Search and category filter **within** a board already fetched — client-side over the rows
  the poll delivered, so it adds no request towards RFI (7). A filter finding nothing is a
  state of its own, never the empty board of 2.2.
- Shareable deep link per station

### Explicitly out of scope (v1)

- Full train tracking, live position, complete stop-by-stop journey
- Origin/destination journey search
- Ticket purchase, prices, fares
- Push notifications
- Authenticated user accounts
- Full-screen kiosk mode (removed from the project — see 12)

> **Design consequence:** board rows **are tappable**, and open a detail panel with the
> train's next stops. This reverses an earlier decision: next stops turned out to be
> already present in the RFI HTML, so showing them costs no additional requests.

---

## 2. Constraints and data source

### 2.1 Constraints

| Constraint | Implication |
|---|---|
| No public or documented API from RFI | Requires HTML scraping and our own parser |
| RFI markup changes without notice | The parser must be isolated, fixture-tested, monitored |
| No availability guarantee nor formal authorisation | Aggressive caching, outbound rate limiting, non-commercial use |
| CORS: the browser cannot call RFI directly | A backend is mandatory |
| Typical user: standing, in a hurry, poor connectivity | Fast first render, small payloads, legible degradation |
| This is a POC | Anything the POC does not need is deferred, not anticipated |

### 2.2 Verified behaviour of iechub

Facts established by direct inspection. Every assumption in the project rests on these.

**Station list.** The `iechub.rfi.it/ArriviPartenze/` homepage contains a `<select>` with
every station and its `placeId`. It is the only source needed to build and verify the
catalogue.

**Board endpoints.** Two distinct requests, one per mode:

```
departures  /ArrivalsDepartures/Monitor?placeId={id}&arrivals=False
arrivals    /ArrivalsDepartures/Monitor?placeId={id}&arrivals=True
```

> Consequence: the lock and the cache key are per `{placeId, mode}`, and the cost towards
> RFI doubles for any station whose two modes are both being viewed. **Only the mode
> actually displayed is fetched**, never both ahead of time.

**Time window.** From the current time to roughly 90 minutes ahead. A train stays visible
**until it has actually departed** from the station, so delayed trains persist even once
their scheduled time is in the past.

> UI consequence: an empty board at night is a **normal** state, to be distinguished
> visually from a failed fetch. Disappearance on actual departure is instead the correct
> behaviour and needs no special handling.

**Row structure.** Each `<tr>` has an `id` equal to the train number, and cells
identified by semantic `id`/`headers` attributes:

| Cell | Content | Notes |
|---|---|---|
| `RVettore` | `<img class="logoCliente" alt="TRENITALIA">` | "cliente" = railway undertaking |
| `RCategoria` | `<img class="logoCategoria" alt="Categoria BUS">` | strip the `Categoria ` prefix |
| `RTreno` | text, e.g. `CB710` | **alphanumeric**, not digits only |
| `RStazione` | text, with `name="Destinazione"` or origin | the `name` attribute confirms the mode |
| `ROrario` | `HH:MM` | no date |
| `RRitardo` | delay in minutes, as visible text | empty cell = on time |
| `RBinario` | platform number, as visible text | empty cell = not yet assigned |
| `RExLampeggio` | dot marker, `headers="HInArrivo"` | present = about to depart |
| `RDettagli` | button + next-stops popup | see below |

> **The parser binds to the `id`/`headers` attributes, never to column position.** An
> added or moved column would break any positional selector.

**Operator and category are both images.** Neither is text: the only handle is the `alt`
attribute. The operator mixes two levels — railway undertakings (TRENITALIA, Trenord,
Italo) and commercial brands (Frecciarossa). The category covers regional, fast regional,
high speed, **and also BUS**: the board includes replacement services and coach
connections, which are not an edge case but an ordinary presence. Both fields fall under
ADR-008.

**Status from cell contents.** Decision taken: read the **visible cell content**, not the
`aria-label` attributes.

- **Platform** — the number in the cell under the Platform column. Empty cell = not yet
  assigned.
- **Delay** — the value in minutes in the cell under the Delay column. Empty cell = on
  time.
- **About to depart** — the column contains a dot: **present = the train is about to
  depart**, absent = it is not.

The `aria-label` attributes remain a useful secondary signal in ambiguous cases, but they
are not the primary source.

**Service date.** Present in the DOM: the details button carries
`id="btn_20260816CB710"` and the popup `id="FermateSuccessive_20260816CB710"`, that is
`YYYYMMDD` + train number. It is the **local date of the stop**, so it can be used
directly as the anchor for the timestamp (see 5.1).

**Next stops.** The popup already contains the full list with times, in the form
`FERMA A:VENAFRO (19:29) - ISERNIA (19:59) - ...`. Available with no additional request.

**Response weight.** The logos are inline base64 GIFs, repeated on every row. The
response is heavy: raw HTML must never be cached, and the data URIs must never be
propagated into our payload — the interface uses its own icons.

**Times.** `HH:MM` only, with no date, in every cell. The absolute timestamp must be
reconstructed (see 5.1).

---

## 3. Overview

```
Browser PWA
    │  initial SSR + polling every 20 s
    ▼
Next.js  ── route handler /api/board/[slug]
    │       server component (SSR)
    │       packages/core (catalog, fetcher, parser, store)
    │
    ├──────────────► Redis    cache
    └──────────────► iechub RFI    external source
```

A single deployable. The domain lives in a separate package but is mounted inside Next as
a library (see ADR-002).

**No long-running process, no pub/sub, no streams.** Data refresh happens **on read**
(see ADR-006).

---

## 4. Components

### 4.1 `apps/web` — Next.js

Responsibilities: rendering, routing, interaction, UI state, exposing the API.

- **Server component** — calls `packages/core` directly for the initial snapshot and
  renders it server-side. Useful content at first paint even on a slow connection.
- **Client component** — polls `/api/board/[slug]` every 20 s and replaces the content.
  Polling suspends when the document is hidden (`visibilitychange`) and resumes on return
  to foreground with an immediate read.
- **Route handler** — exposes the public API. `runtime = 'nodejs'`.
- **Server Action** — used **only** for mutations (favourites). Never for reading the
  board (see ADR-001).

Routes:

```
/                                        station selection
/stazioni/[slug]/partenze               board, departures — canonical, indexable
/stazioni/[slug]/arrivi                 board, arrivals — canonical, indexable
/stazioni/[slug]                        board, departures by default (legacy, kept working)
/stazioni/[slug]?view=arrivals|departures   board, explicit mode (legacy, kept working)
/sitemap.xml                             every canonical board URL, both modes
/robots.txt                              allows everything except /api/ and /serwist/
```

The two path routes are prerendered at build time for the stations flagged `isMajor` and
rendered on demand for the rest (`generateStaticParams` + the default `dynamicParams`):
building ~4900 shells up front costs minutes for pages whose content arrives from the
client anyway. The sitemap is the only thing that leads a crawler to a station page — the
picker's list is client-side and bounded — so it lists all of them (~4900 URLs, one file,
well inside the 50 000 limit). Each board page also emits a `TrainStation` and a
`BreadcrumbList` JSON-LD graph; the rows are deliberately not described in it, because they
are true for twenty seconds and are not in the server-rendered HTML.

One `BoardScreen`, four URLs into it, all under `/stazioni` (ADR-011 — Italian, matching the
`arrivi`/`partenze` segments and CONTEXT.md's naming rule for user-facing URL parts). ADR-010
put the mode in a `view` query param instead of a second route; ADR-011 added the two path
routes above for SEO (search engines rank path segments, not query params) without reopening
that decision — the bare and `?view=` forms still resolve exactly as before (`view` absent or
unrecognised resolves to `departures` rather than 404, because a mangled shared link should
still show a board) and their `generateMetadata` sets `canonical` to the matching path route.
The app's own links (mode toggle, station picker) always point at the path routes.

One train has a page of its own under the board it is on: `/stazioni/:slug/partenze/:trainNumber`
and `/stazioni/:slug/arrivi/:trainNumber` (ADR-012). It is a **second reader of the board**, not
a second source — same React Query entry, same 20 s poll, no endpoint of its own and none
possible, since RFI publishes station boards and not trains. The URL carries the train number
because that is what is printed on the row and on the ticket; the number is not unique (a board
spanning midnight carries it twice) and the page resolves it to the first, soonest match. These
pages are `noindex, follow`: a board URL is permanent, a train URL is true for an hour.

UI structure (all of it presentational; fetching and polling live in the two `*Screen`
components):

```
components/shell     AppHeader (sticky, 64px) + Wordmark — the persistent app shell
components/board     BoardScreen → BoardView → BoardRow (variants: lead | row)
                     parts.tsx (ServiceMark, PlatformBox, ModeToggle, RouteLadder, …)
                     brand-logos.tsx (committed inline SVG service marks)
components/train     TrainScreen → TrainView (one train, read out of the board's own cache)
components/picker    PickerScreen → StationPicker, StationSheet (the same picker in a sheet)
components/ui        BottomSheet, SkeletonBlock, icon.tsx (the one icon family)
```

The visual language is station signage (the August 2026 signage pass): a plate names the
station in expanded caps over a heavy rule, every figure is set in mono, rows are bands
divided by 1px lines rather than cards, and nothing has a corner radius except the operator
tile, and a train's stops are a vertical ladder with its times in a mono column rather than
a horizontal rail of siglas. The type stack is Saira + JetBrains Mono and the single accent
is sodium amber (the August 2026 sodium pass); `theme.css` §0 says which family carries
which level and why, §5 the same for every colour.

One tree per screen, not one per breakpoint: the board's composition is the same at every
width and only its grid changes. Every icon that is not a brand mark comes from Phosphor
through `components/ui/icon.tsx` (one family, one weight, sizes named after the type level
they sit beside); `brand-logos.tsx` is the deliberate exception, because those are real
service marks and no library has them.

### 4.2 `packages/core` — domain

Four modules with a one-way dependency:

```
catalog → fetcher → parser → store
```

| Module | Responsibility | Notes |
|---|---|---|
| `catalog` | `slug → rfiPlaceId` mapping, station metadata | Static JSON in the repo, not in Redis |
| `fetcher` | The only function that speaks HTTP to RFI | `fetchBoard(placeId, mode): Promise<RawHtml>` |
| `parser` | HTML → `BoardRow[]` | **Pure function**, zero I/O (see ADR-003) |
| `store` | Redis reads/writes, TTL, lock, refresh-on-read | The only place that knows the key schema |

> **Hard rule:** `packages/core` never imports anything from Next. No `next/headers`, no
> `NextRequest`, no `after()`. If a runtime hook is needed, it is passed in as a
> parameter. This is what keeps a future extraction into a standalone service possible
> (see ADR-002).

### 4.3 Redis — cache

The system's only store. In v1 it holds volatile data only: boards, with a short TTL,
losable without consequence. Favourites live in client-side `localStorage`.

The station catalogue is **not** in Redis: it is static, committed as JSON in the repo
and imported at build time. Zero round-trip, zero cold start.

---

## 5. Data model

The model is **ours**, not a mirror of RFI's structure. Raw data never reaches the
frontend.

```ts
type StationBoard = {
  stationId: string
  stationName: string
  mode: 'departures' | 'arrivals'
  generatedAt: string      // ISO 8601, when the data was read from RFI
  isStale: boolean         // served from expired cache, refresh in flight
  rows: BoardRow[]
  notices: string[]        // board-level announcements
}

type BoardRow = {
  operator: 'TRENITALIA' | 'ITALO' | 'TRENORD' | 'OTHER'
  brand: string | null     // "Frecciarossa", "Italo", ... as shown to the user
  category: TrainCategory
  trainNumber: string      // alphanumeric: "9612", "CB710"
  serviceDate: string      // YYYY-MM-DD, from the DOM
  headsign: string         // destination (departures) or origin (arrivals)
  viaStops: { name: string; time: string }[]   // already present in the HTML
  scheduledTime: string    // ISO 8601, tz Europe/Rome
  delayMinutes: number | null
  platform: {
    scheduled: string | null
    actual: string | null
    isConfirmed: boolean
  }
  status: TrainStatus
  blinking: boolean        // "arriving" / "departing"
}

type TrainCategory =
  | 'HIGH_SPEED' | 'INTERCITY' | 'REGIONAL' | 'REGIONAL_FAST'
  | 'SUBURBAN' | 'BUS' | 'OTHER'

type TrainStatus =
  | 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'PARTIAL'
  | 'REROUTED' | 'IMMINENT'
```

Three non-negotiable rules:

1. **All time arithmetic happens on the server.** The client receives absolute timestamps
   and merely renders "in 7 min". No date arithmetic in the browser.
2. **`status` is our own enum**, derived from RFI's strings and icons. The raw value never
   crosses the API boundary.
3. **`generatedAt` is always present and always truthful.** It is what lets the client
   show "data from 3 minutes ago" instead of feigning freshness.

### 5.1 Timestamp reconstruction

RFI provides only `HH:MM` in the cells, but the **local date of the stop is present in
the DOM** (details button id, format `YYYYMMDD` + train number). No heuristic needed:

```
serviceDate + HH:MM, interpreted in Europe/Rome
```

**A library with real timezone support is mandatory** (Luxon or `Temporal`), not `Date`.
At the two annual DST transitions one local hour exists twice and another does not exist
at all: in the first case pick the earlier occurrence, in the second shift forward. These
cases are rare and low-impact, but must be handled explicitly because they fail silently.

---

## 6. API contract

Two public endpoints, nothing else.

```
GET  /api/stations                      station catalogue, long ETag
GET  /api/board/:slug?mode=departures   JSON snapshot (polling and SSR)
```

The parameter is called `mode` here and `view` on the page (ADR-010); the values are the
same.

`/api/board/:slug` always returns `StationBoard`, under every condition:

| Situation | Response |
|---|---|
| Fresh cache (< 20 s) | 200, `isStale: false` |
| Expired but servable cache (< 60 s) | 200, `isStale: false`, background refresh |
| No cache | 200 after the synchronous fetch |
| RFI unreachable, old cache available | 200, `isStale: true`, old `generatedAt` |
| RFI unreachable, no cache | 503 |

**There is no streaming endpoint.** The client polls.

---

## 7. Caching and rate limiting

### 7.1 Refresh-on-read

There is no scheduled refresher. Data updates when someone reads it:

```
read Redis
  fresh (< 20 s)       → respond
  stale (< 60 s)       → respond immediately, kick off a background refresh
  absent               → take the lock, fetch RFI, write, respond
```

The notion of a "hot station" is implicit: a station is hot for as long as someone is
looking at it. No registry to maintain, no loop to run.

- Board TTL: **20 s**
- Stale-while-revalidate window: up to **60 s**
- Redis key TTL: **90 s** (beyond that, re-read from RFI)

### 7.2 Outbound rate limiting (towards RFI)

This is the one that matters: it protects the project's sustainability.

1. **Single-flight lock** — before every call: `SET lock:{placeId}:{mode} 1 NX EX 15`. If
   the lock exists, skip the call and serve stale. This is the mechanism that makes load
   on RFI proportional to **active stations** rather than **users**: a thousand people on
   Milano Centrale generate a single call per cycle.
2. **Global ceiling** — never more than **5 req/s** towards RFI in total. Token bucket on
   Redis.
3. **Backoff on error** — on 429 or 5xx, double the interval for that station up to a
   maximum of 5 minutes, continuing to serve stale with `isStale: true`. Never retry
   immediately.

> Without the single-flight lock, the first traffic spike produces a thundering herd. It
> is the most important component in the system.

### 7.3 Inbound protection

**In v1 the app is private**, reachable only through Deployment Protection. No anonymous
traffic reaches it, so **no inbound rate limiting is required**.

When the app opens to the public, protection moves to Vercel's WAF rather than an
application-level token bucket:

- custom rules and IP blocking are free on all plans; rate limiting is a paid,
  plan-dependent feature
- traffic denied, challenged or rate-limited by the WAF incurs no CDN request or data
  transfer costs, so there is no risk of a surprise bill from scraping
- legitimate polling produces 3 req/min per open tab: size the limit accordingly

Thanks to the single-flight lock, load towards RFI remains independent of inbound request
volume in any case.

### 7.4 Redis key schema

| Key | Type | Policy |
|---|---|---|
| `board:{placeId}:{dep\|arr}` | JSON string | TTL 90 s, volatile |
| `lock:{placeId}:{mode}` | string | NX EX 15, volatile |
| `health:rfi` | LIST, last 100 outcomes | volatile |
| `unknown:vettore` | SET | volatile, feeds the alert |
| `unknown:categoria` | SET | volatile, feeds the alert |
| `unknown:status` | SET | volatile, feeds the alert |

**In v1 nothing is persisted.** Favourites live in client-side `localStorage`, and Redis
is pure cache: it can be flushed at any time with no data loss.

### 7.5 Cache warming (optional)

A cron job can keep the 20-30 largest stations warm, so that whoever opens them never
pays for a synchronous fetch. It is **purely a perceived-latency optimisation**: remove
it and everything still works.

Known constraints when using Vercel Cron: on Hobby the minimum cadence is daily, on Pro
it is one minute. For the POC it can be deferred entirely.

---

## 8. Observability

Every RFI response must be logged to `health:rfi` with **status code and latency**.

Without this data there is no way to tell "RFI is slow today" from "we have been
blocked", and infrastructure decisions end up being made on a hunch.

**Parser canary:** a periodic check against a high-traffic station (e.g. Roma Termini)
that alerts if the result is empty during daytime hours. It exists so that markup
breakage is discovered before users find it.

---

## 9. Testing

The strategy depends entirely on the parser's purity.

- **`parser`** — twenty real HTML fixtures committed to the repo, run as unit tests in
  milliseconds. Mandatory cases: empty station, cancelled train, partial cancellation,
  unassigned platform, three-digit delay, rerouted train, board-level notices,
  unrecognised operator.
- **`store`** — integration tests against an ephemeral Redis. Verify in particular the
  lock's behaviour under concurrency and the stale-while-revalidate logic.
- **`fetcher`** — not tested in CI (network-dependent); covered by the canary.

---

## 10. Architecture decisions

ADRs live in [`adrs/`](adrs/), one file each. This section is an index only: the reasoning
lives in the files, and nowhere else.

| ADR | Decision |
|---|---|
| [001](adrs/001-route-handler-not-server-action.md) | Route Handler, not Server Action, for reading the board |
| [002](adrs/002-nextjs-monolith-with-extractable-domain.md) | Next.js monolith with the domain in an extractable package |
| [003](adrs/003-parser-is-a-pure-function.md) | The parser is a pure function |
| [004](adrs/004-single-source-rfi.md) | Single source: RFI |
| [005](adrs/005-fetcher-isolated-behind-an-interface.md) | The fetcher is isolated behind an interface |
| [006](adrs/006-polling-and-refresh-on-read.md) | Polling and refresh-on-read, not SSE and a scheduled refresher |
| [007](adrs/007-slug-is-the-public-identifier.md) | The slug is the public identifier, the RFI place ID stays internal |
| [008](adrs/008-operator-category-status-from-attributes.md) | Operator, category and status come from attributes, with unknown-value logging |
| [009](adrs/009-italian-only-in-v1.md) | Italian as the only language in v1 |
| [010](adrs/010-view-query-param-instead-of-arrivals-route.md) | The mode is a query param on one page, not a second route |
| [011](adrs/011-path-routes-for-board-mode-seo.md) | Canonical path routes for board mode, under `/stazioni` |
| [012](adrs/012-train-detail-derives-from-the-board.md) | The train detail page derives from the board, and is not indexed |

New ADRs are numbered by scanning `adrs/` for the highest number and incrementing. Three
gates, all required: hard to reverse, surprising without context, the result of a real
trade-off.

---

## 11. Station catalogue

### 11.1 Structure

The catalogue is static JSON committed to the repo and imported at build time. It is not
in Redis and is not built at runtime.

```ts
type Station = {
  slug: string          // public identifier, IMMUTABLE
  name: string          // display name, may change
  aliases: string[]     // alternative slugs, 301 towards `slug`
  rfiPlaceId: string
  lat: number
  lon: number
  city: string
  isMajor: boolean
  checkedAt: string     // last existence check against RFI
  retiredAt?: string    // set if the station is no longer served
}
```

### 11.2 The slug is a public contract

URLs are shareable and end up in bookmarks, messages and search engine indexes. The slug
is therefore a permanent identifier, not an implementation detail (see ADR-007).

Generation rules, applied **once only**, while building the catalogue, never at runtime:

- lowercase, spaces to hyphens, punctuation removed
- accents normalised to ASCII
- abbreviations expanded by hand: `C.le` → `centrale`, `P.ta` → `porta`, `S.` → `san` or
  `santa` depending on the case
- where different municipalities share a name, the province is appended

`aliases` serve two purposes: accommodating the forms users type spontaneously
(`termini` → `roma-termini`) and absorbing future renames without breaking existing links.
When a station is renamed, `name` is updated and `slug` is left untouched.

### 11.3 Initial construction

A one-off, offline activity: extract the station list from iechub, normalise the names,
manually correct the ambiguous cases — multi-station nodes (Genova, Roma, Milano),
abbreviations, cross-region name collisions.

### 11.4 Drift check (monthly)

A monthly job re-fetches the iechub homepage, extracts the station `<select>` and compares
it with the catalogue. One request per month.

| Divergence | Meaning | Action |
|---|---|---|
| Station on RFI missing from the catalogue | new opening | add with a new slug |
| Station in the catalogue missing from RFI | closure or rename | set `retiredAt` |
| `placeId` changed for the same name | internal RFI reorganisation | update the ID |

> The third case is the most insidious: the app would keep responding normally, but with a
> permanently empty board. It is the only divergence nobody would notice.

**The job never modifies the catalogue.** It produces a diff and opens a PR or an issue.
Correction is manual, because only a human can decide whether a renamed station is the
same entity or a new one. A job able to rewrite slugs would be exactly the mechanism
capable of breaking every public URL without anyone noticing.

A slug with `retiredAt` set keeps responding with a page explaining the closure: never a
silent 404 on a link someone has saved.

A monthly cadence fits within the cron limits of any plan, including Vercel Hobby (which
allows at most one daily execution).

---

## 12. Open questions

### To be decided during design

- **Departures/arrivals layout on desktop.** Deferred to the design phase. **Technical
  constraint to pass into the brief:** a side-by-side view doubles requests towards RFI
  compared with a toggle, because arrivals and departures are two distinct endpoints
  (2.2).

### Deliberately deferred

- **Accessibility:** a self-updating table needs an explicit `aria-live` strategy,
  otherwise screen readers re-read the entire board on every cycle. Deferred, with the
  debt acknowledged.
- **Internationalisation:** deferred until after the POC (ADR-009).
- **Analytics and privacy:** since nothing is tracked, no banner is needed in v1.
- **Inbound rate limiting:** unnecessary while the app is private (7.3).
- **Deployment location:** isolated by ADR-002 and ADR-005.
- **Public unofficial-status disclaimer:** mandatory before opening to the public, not
  before.

### Closed

- **FerrovieNord coverage.** Not a problem to handle: the catalogue derives from RFI's
  select, so stations not managed by RFI do not exist in the app and are not even
  searchable. No empty board to display.
- **Kiosk mode.** Removed from the project. It was a market observation rather than a
  requirement anyone had; it would have cost a distinct composition, its own breakpoints
  and Wake Lock handling for a use case the POC does not have. Browser full-screen on the
  normal board covers most of the value. If it ever returns, the design system and
  components make it a recomposition of existing pieces.
- **Next stops in the row.** They are already in the HTML with their times, so showing
  them costs no additional requests. Rows are tappable and open a detail panel (see 1).

---

## 13. Legal notes

The project uses publicly accessible data via scraping, without formal authorisation or an
official API. The endpoints are neither documented nor guaranteed and may change at any
time.

Scraping must stay respectful — aggressive caching, single-flight lock, global request
ceiling — both as a matter of good conduct and because the terms of service do not
explicitly permit it. For personal and educational use this is common practice;
**commercial use carries concrete legal risk** and would require an agreement with RFI.
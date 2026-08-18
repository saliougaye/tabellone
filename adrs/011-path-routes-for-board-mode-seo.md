# Canonical path routes for board mode, under `/stazioni`

**Status:** accepted · supersedes ADR-010's route shape and its URL-stability consequence

ADR-010 put the board mode in a query param, `/[slug]?view=arrivals|departures`, and
rejected a second route on the grounds that two routes rendering the same content is a
permanent sync cost for a cosmetic URL difference. That reasoning about *component*
duplication still holds. It did not account for SEO: search engines index path segments far
more reliably than query params, and a station's arrivals and departures are genuinely
distinct queries worth ranking separately, not a cosmetic difference.

So the mode now has two dedicated path routes, `/stazioni/[slug]/partenze` (departures) and
`/stazioni/[slug]/arrivi` (arrivals) — Italian, matching the UI copy (ADR-009) and
CONTEXT.md's vocabulary rather than the API's English `mode` values. `/stazioni` prefixes the
whole board route (not just these two): it groups all station-board URLs under one segment,
reads naturally in Italian, and matches the shape TODO.md's future locale work already
sketches (`/:locale/stazioni/:station/...`). All board pages moved from `apps/web/src/app/[slug]`
to `apps/web/src/app/stazioni/[slug]`. Every route renders the same `BoardScreen`; only the
mode is now supplied by the path segment instead of `searchParams`, and each of the two path
routes gets its own `generateMetadata` (title, description, `canonical` link) — the actual
SEO win, not the URL shape by itself.

## Break from ADR-010's URL-stability consequence

ADR-010 treated the bare `/[slug]` and `/[slug]?view=arrivals` URLs as a public contract
(ADR-007's slug-stability principle) that must keep resolving. Adding the `/stazioni` prefix
breaks that: `/[slug]` and `/[slug]?view=` no longer exist at all, only
`/stazioni/[slug]` and `/stazioni/[slug]?view=` do. Accepted deliberately, not overlooked —
the app is pre-launch (a POC with no indexed pages and no real shared links yet), so the cost
of moving the whole tree once, now, is near zero, versus carrying two prefixes forever. This
would not be an acceptable move post-launch.

`/stazioni/[slug]` and `/stazioni/[slug]?view=arrivals` (the bare/query forms, now under the
new prefix) still resolve exactly as before — no redirect, no 404 — and their
`generateMetadata` sets `alternates.canonical` to the matching path route, so search engines
consolidate ranking onto `/stazioni/[slug]/partenze` or `/stazioni/[slug]/arrivi` without
breaking anyone who links the bare or `?view=` form going forward.

## Consequences

- Four URLs reach a board now: `/stazioni/[slug]` (departures), `/stazioni/[slug]?view=`, and
  the two path routes. `CONTEXT.md`'s "no third spelling" line for `mode` is no longer true
  and was updated.
- Internal navigation (the mode toggle in `BoardScreen`, the station picker's links) always
  points at the path routes — the bare and `?view=` forms are an entry point for old links,
  not something the app links to itself.
- `packages/core` is untouched: `BoardMode` is still `'departures' | 'arrivals'`, the
  `/stazioni` prefix and the path segment mapping (`partenze`/`arrivi`) live in `apps/web`
  only (`apps/web/src/lib/board-routes.ts`).

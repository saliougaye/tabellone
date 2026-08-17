# The mode is a query param on one page, not a second route

**Status:** accepted · supersedes the route list in ARCHITECTURE.md §4.1

The board originally had two routes, `/[slug]` for departures and `/[slug]/arrivi` for
arrivals. Instead there is one page, `/[slug]`, and the mode is a query param:
`/[slug]?view=arrivals|departures`. Absent or unrecognised `view` resolves to `departures` —
a mangled link still shows a board.

One page means the departures/arrivals toggle is a single component switching one piece of
state, rather than a navigation between two routes that render the same thing from the same
package. Since RFI serves arrivals and departures from two distinct endpoints, the mode is a
parameter of the read either way; putting it in the URL as a param rather than a path segment
makes that symmetry visible.

## Considered options

A second route (`/[slug]/arrivi`) would give arrivals their own URL segment, their own
`metadata`, and a plain server-side render with no `searchParams` to thread. It was rejected
because the two pages would be the same page, and keeping them in sync is a permanent cost
paid for a cosmetic difference in the URL.

## Consequences

Both spellings are still public URLs and therefore a contract (ADR-007): `?view=arrivals` and
the bare `/[slug]` must keep working. `metadata` for the page has to be generated from
`searchParams`, not just from the slug. The param is named `view` on the page and `mode` in
the API (`/api/board/:slug?mode=`); the values are identical, and `CONTEXT.md` records the
pair.

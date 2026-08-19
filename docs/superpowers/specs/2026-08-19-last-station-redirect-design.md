# Last station redirect — design

Reopening the app should drop the user back on the station board they were last
looking at, not the picker screen. Persisted per browser session (`sessionStorage`),
not per device (`localStorage`) — this is deliberately session-scoped, distinct from
the existing "recenti" list in `saved-stations.ts`.

## Storage layer

New `apps/web/src/lib/last-station.ts`, `sessionStorage`-backed, same guarded
read/write style as `saved-stations.ts` (storage absent on SSR, quota/private-mode
failures silent, corrupt JSON ignored).

```ts
type LastStation = { slug: string; mode: BoardMode }

recordLastStation(slug: string, mode: BoardMode): void
consumeRedirect(): LastStation | null
```

Two `sessionStorage` keys:

- `tabellone:last-station` — `{ slug, mode }` of the board currently/last open.
- `tabellone:home-redirected` — set the first time `consumeRedirect()` runs in this
  session, regardless of outcome.

`consumeRedirect()` returns the stored station only on its first call per session;
every later call (even after a station is later recorded) returns `null` once the
flag is set. This makes the redirect fire at most once per session, on the first
mount of `/` — see "Escape hatch" below for why.

## Recording

`board-screen.tsx` already has an effect recording visits to `localStorage`:

```ts
useEffect(() => {
  if (stationName) recordVisit(slug, stationName)
}, [slug, stationName])
```

Add a sibling effect, keyed on `slug` + `mode` (not `stationName` — a mode switch
alone should update the pointer, the name isn't needed to redirect):

```ts
useEffect(() => {
  recordLastStation(slug, mode)
}, [slug, mode])
```

Fires on mount and on every mode switch (`switchMode`), so the redirect target always
matches the exact board (station + departures/arrivals) the user last had open.

## Redirect gate

`picker-screen.tsx` gains a check ahead of its existing catalogue/recents effects:

```ts
const router = useRouter()
const [redirecting, setRedirecting] = useState<boolean | null>(null) // null = not checked yet

useEffect(() => {
  const last = consumeRedirect()
  if (last) {
    router.replace(canonicalBoardPath(last.slug, last.mode))
    setRedirecting(true)
  } else {
    setRedirecting(false)
  }
}, [router])

if (redirecting !== false) return null // still checking, or mid-redirect
```

Everything else in `PickerScreen` (catalogue fetch, recents/favourites load, empty
state) is unchanged and only reached once `redirecting === false`.

`canonicalBoardPath` (already in `apps/web/src/lib/board-routes.ts`) builds the target
URL, so the redirect always lands on the canonical `/stazioni/:slug/partenze` or
`/stazioni/:slug/arrivi` route (ADR-011) — same helper `BoardScreen` already uses for
its own mode-switch navigation.

## Escape hatch: why "once per session," not every visit

A user who deliberately navigates back to `/` (logo, "cambia stazione" on desktop,
browser back) must land on the picker, not get bounced straight back to the board
they just left. Redirecting only on the *first* mount of `/` in a session — via the
`tabellone:home-redirected` flag — solves this without a query-param escape hatch:
the first landing on `/` in a fresh session (a new tab/window, or the PWA relaunching)
sends the user to their last board; every subsequent visit to `/` in that same
session shows the picker normally, including right after the auto-redirect consumed
the flag.

If the app's very first `/` mount in a session happens before any station was ever
opened, there's nothing to redirect to — the flag is still set (no second chance),
and the picker is shown. This is correct: even if the user opens a station later in
the same session and returns to `/`, they should see the picker they explicitly
asked for, not get redirected past it.

## Out of scope

- No test coverage requested — skipped.
- No change to `saved-stations.ts` / "recenti" (`localStorage`) — orthogonal, stays
  as-is.
- No visible UI change; this is pure navigation behavior.

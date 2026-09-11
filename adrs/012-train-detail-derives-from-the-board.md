# The train detail page derives from the board, and is not indexed

**Status:** accepted · extends ADR-011's route shape, does not reopen it

A traveller waiting for one train wants that train alone on the screen: the board answers
"what is leaving", and once you know which train is yours the other nineteen rows are noise —
especially across an app switch, where returning to the tab means finding your row again in a
list that has moved on since.

So a train gets a page: `/stazioni/:slug/partenze/:trainNumber` and
`/stazioni/:slug/arrivi/:trainNumber`. Two properties make it cheap:

- **It is nested under the board, and reads the board.** The page fetches nothing of its own:
  it subscribes to the very same React Query entry as the board it came from
  (`['board', slug, mode]`), picks its row out of `rows`, and renders that. Arriving from the
  board it paints from cache with no request at all; arriving cold it triggers the one board
  read that route would have made anyway. RFI traffic is unchanged, which is the constraint
  that governs everything here (ARCHITECTURE 7) — **there is no per-train endpoint and there
  must not be one**, because RFI has no per-train source: the station board is the only
  document, and a train page that fetched "its" train would be fetching a station board under
  another name, once per open page instead of once per station.
- **The URL carries the train number, not an internal id.** `9612`, `CB710` — what is printed
  on the row, on the ticket and on the platform sign. Same principle as ADR-007: the public
  identifier is the one the traveller can read.

## The train number is not unique, and that is accepted

A train number identifies a *service*, not a stop. On one board it can appear twice — a board
spanning midnight carries two service dates — and the same number runs again tomorrow. The
row's real identity is `trainNumber` + `scheduledTime`, which is what the board uses as its
React key.

The URL still carries the number alone, and the page resolves it to **the first matching row
in board order**, which is the soonest one. Rejected alternatives: putting the scheduled time
in the URL (`/partenze/9612-1832`) makes the link unshareable the moment the train is
rescheduled and unreadable always; putting the service date in makes it long and still does
not disambiguate the midnight case. The ambiguity is real but small, the wrong resolution
costs the reader one glance at a time they can see on the page, and the page is a live view of
a board — not an archive that has to address a specific past stop.

Matching is case-insensitive (`cb710` finds `CB710`), because a hand-typed URL is a URL.

## Not indexed

`robots: noindex, follow`. A board URL is permanent — Roma Termini's departures exist forever
— but a train URL is true for an hour: `9612` is on that board today and gone tonight, and a
number that ran once may never run again. Indexing them would trade a few thousand permanent,
rankable station pages for hundreds of thousands of URLs that 404-in-spirit within the day,
and search results promising a train that is no longer there are worse than no result. The
station board, which *is* the durable page, keeps all the ranking (ADR-011).

The sitemap lists board URLs only, unchanged.

## Consequences

- The page has a state the board does not: **the train is no longer on this board**. It is not
  an error and not an empty board (ARCHITECTURE 2.2) — it is a departure that happened — so it
  says that, names the station, and leads back to the board.
- The route ladder on this page never folds: `LADDER_MAX_RUNGS` exists because a board row is
  one of twenty, and this page is one train. `RouteLadder` takes a `startExpanded` prop for it.
- `StationBoard.stationId` is the slug, and the page builds its own URLs from it. That was
  already true (`store.ts` writes `stationId: slug`); it is now depended on, and `types.ts`
  says so.
- No change to `packages/core`, to the API contract, or to the cache: this is a second reader
  of an existing payload.

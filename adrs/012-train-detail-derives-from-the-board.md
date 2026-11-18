# The train detail page derives from the board, and is not indexed

**Status:** accepted · extends ADR-011's route shape, does not reopen it · amended November 2026 (the train page is the board with the train's sheet open)

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

## Amendment (November 2026): the train page *is* the board, with the sheet open

The first version of this ADR drew a page of its own (a hero card and a stops ladder). The
seventh design pass made that page redundant: a board row already opens a **ticket sheet** with
the route, platform, state, countdown and stops — everything the page showed. Two screens for
one train, with one of them a dead end that lost the reader's place in the list, was the wrong
shape. So:

- `/stazioni/:slug/partenze/:trainNumber` (and `/arrivi/:trainNumber`) renders **the board of
  that station and mode with that train's ticket sheet open**. Same component, same React Query
  entry, same poll; the URL, the SSR metadata, the `noindex, follow` robots rule and the
  Open Graph image are unchanged.
- **The open sheet lives in the URL.** Tapping a ticket *pushes* the train URL
  (`history.pushState`), so the link is shareable and the browser's Back closes the sheet.
  Closing from the sheet itself (X, drag, veil, Escape) goes `history.back()` when we pushed the
  entry, and otherwise `replaceState`s to the board URL (a cold visit to a train URL has no board
  entry behind it). Switching Partenze/Arrivi closes the sheet first, because the URL is per mode.
  The state passed to `pushState` is `null` on purpose: Next's router recognises its own marker
  in `history.state`, ignores the URL and rewrites it back on its next update.
- "The train is no longer on this board" is now a small sheet over the board ("Non è più sul
  tabellone") with a button back to the board, instead of a page.
- The sheet's "open the train" action is gone — the sheet is the train page. "Condividi" copies
  the current train URL.
- The ladder and the hero card (`FlightCard`, `StopsRail`, `fl-*`, `sh-head`, `sh-rail`) were
  deleted with the page. Everything above about **not having an endpoint of its own**, the
  **non-unique train number** and **not being indexed** still holds, unchanged.

## Consequences

- The sheet has a state a ticket does not: **the train is no longer on this board**. It is not
  an error and not an empty board (ARCHITECTURE 2.2) — it is a departure that happened — so it
  says that, names the station, and leads back to the board.
- `StationBoard.stationId` is the slug, and the page builds its own URLs from it. That was
  already true (`store.ts` writes `stationId: slug`); it is now depended on, and `types.ts`
  says so.
- No change to `packages/core`, to the API contract, or to the cache: this is a second reader
  of an existing payload.

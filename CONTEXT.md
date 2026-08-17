# Context — Tabellone

Glossary. The project's own words, with tight definitions. No implementation details, no
spec: those live in `ARCHITECTURE.md`.

**Naming rule.** Code, types, identifiers and CSS custom properties are **English**. Only
user-facing copy is **Italian**. Where a term names RFI's own DOM (`RVettore`,
`FermateSuccessive`), the Italian is kept verbatim because it is the foreign system's
identifier, not ours.

## Core

**Board** — the arrivals or departures list for one station at one moment. Italian copy:
*tabellone*. Never "timetable": a board shows what is happening, a timetable shows what is
planned.

**Mode** — which of the two boards is being looked at: `departures` or `arrivals`. Two
separate things at the source, so never "the board with a filter". Spelled `view` in page
URLs (`/[slug]?view=arrivals`) and `mode` in the API (`/api/board/:slug?mode=arrivals`); same
values, two parameter names, no third spelling.

**Row** — one train's line on a board. A row is a *stop*: the same train appears as a row
on many stations' boards, with a different time on each.

**Notice** — a board-level announcement, addressed to the whole station rather than to one
train. Italian copy: *avviso*.

**Catalogue** — the set of stations the app knows. A station absent from the catalogue does
not exist for the app and is not searchable.

## Identity

**Slug** — the public identifier of a station, as it appears in a URL. Immutable once
published, and a promise to whoever saved the link. Italian words, because station names
are proper nouns.

**Place ID** — RFI's opaque identifier for a station. Ours to hold, never to publish.
Sourced from RFI (`rfiPlaceId`), can change without notice, never appears in a URL, a
payload or a favourite.

**Alias** — an alternative slug that redirects to the canonical one. Covers what users type
spontaneously, and absorbs renames.

## The train on a row

**Operator** — the railway undertaking actually running the train (Trenitalia, Italo,
Trenord). RFI's own word for this is *vettore*, and its own markup also calls it *cliente*.
Drives grouping and colour accent.

**Brand** — the commercial name the traveller recognises (Frecciarossa, Malpensa Express).
Distinct from operator: someone looking for the Frecciarossa is not thinking "Trenitalia".
One operator has many brands; a brand always has at most one operator.

**Sigla** — the 2–3 letter monochrome mark standing in for an operator's logo. Ours,
drawn by us, never a fetched image. Italian word kept: it is what the mark is called.

**Category** — the kind of service (high speed, intercity, regional, suburban, bus). Italian
source word: *categoria*. Bus is an ordinary category, not an exception: replacement and
coach services are a normal presence on the board.

**Train number** — the train's identifier, **alphanumeric** (`9612`, `CB710`). Not a number
in the arithmetic sense; never parsed as one.

**Headsign** — the name shown to tell the traveller where the train goes: the destination on
a departures board, the origin on an arrivals board. One field, whose meaning follows the
mode.

**Service date** — the local calendar date of *this stop*, not of the train's departure from
its origin. A train leaving at 23:50 and a train arriving at 00:10 have different service
dates. It is the anchor that turns `HH:MM` into an absolute instant.

**Via stops** — the train's remaining stops, with times. Italian source: *fermate
successive*.

## State of a row

**Platform** — which track the train uses. Italian copy: *binario*. Unassigned is a real
and frequent state, distinct from unknown: the station has not decided yet.

**Delay** — how many minutes late the train is. Italian copy: *ritardo*. Absent means on
time, which is a statement, not missing data.

**Imminent** — the train is about to depart or arrive. RFI marks it with a blinking dot
(`RExLampeggio`, `HInArrivo`).

**Cancelled** vs **partially cancelled** — cancelled: the train is not running. Partially
cancelled: it runs, but not over the whole route, so for *this* station it may or may not
call. Two different states, never collapsed.

**Rerouted** — the train runs but over a different path, so its stops are not the scheduled
ones.

## Freshness

**Generated at** — when the data was read from RFI. Always present, always truthful: it is
what lets the app say "data from 3 minutes ago" instead of feigning freshness.

**Stale** — the data shown is older than intended and a newer read has not succeeded.
Italian copy: *dati non aggiornati*. Stale is a normal state and is shown, not hidden.

**Empty board** — no trains in the window, which at night is **correct**. Distinct from a
**failed read**, where we do not know what is running. Never rendered the same way.

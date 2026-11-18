# Board notices are read on the server: a strike is a window, not a string

**Status:** accepted · extends ADR-003 and ADR-008 (our own enums, raw values never cross)

RFI's board notices arrive as free uppercase text, sometimes with an English copy after
` / `, in at least three spellings of the same strike ("DALLE ORE 21.00 DEL 20 NOVEMBRE…",
"DALLE ORE 21:00…", "DALLE 21:00…"). Until now `StationBoard.notices` was `string[]` and the UI
printed them as they came. A strike is not a sentence to print, it is a **window in time** the
traveller wants placed against now: announced, about to start, under way, just over. Weight on
the screen follows the phase, so something has to turn text into instants.

The decision: that reading lives in `packages/core/src/notices.ts`, a **pure function** next to
the parser, and the API carries the result — `{ kind: 'strike', from, to, national, who, text }`
or `{ kind: 'info', text }`.

- **Why the server.** The window carries no year and two wall-clock times in `Europe/Rome`.
  Resolving that is time arithmetic, and the project rule is that all time arithmetic happens on
  the server with a real timezone library (ARCHITECTURE 5.1). The client ends up with two ISO
  instants and compares them with `now`; it never parses Italian dates.
- **Why not parse in the client and keep `string[]`.** It was tried in the prototype and it works,
  but it puts a regex over a third party's free text in the browser, reproduced per tab, with
  `Date` and `Intl` doing the DST work the rule forbids.
- **Degrade, never throw.** Text that mentions a strike but does not match any known window
  shape becomes `info` with its own words. Missing a strike's weight is a cosmetic loss; a
  notice that fails the board is not acceptable (ADR-003's spirit: the parser stack must not turn
  surprises in RFI's text into a 5xx).
- **The raw text stays.** `text` is RFI's Italian, sentence-cased, English copy dropped, so the
  sheet can still show "what RFI said" next to our reading of it.

**Cost.** The API shape changes (`notices` is no longer `string[]`); a board cached just before
the deploy carries the old shape for at most the 90 s key TTL. The reader knows four wordings;
a fifth is an `info` until someone adds a pattern and a fixture for it.

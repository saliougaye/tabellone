# Route Handler, not Server Action, for reading the board

**Status:** accepted

Board reads go through a Route Handler; Server Actions are reserved for mutations
(favourites).

Server Actions are POST-only, non-cacheable, and executed serially over the same
connection. Polling requires cacheable GET reads.

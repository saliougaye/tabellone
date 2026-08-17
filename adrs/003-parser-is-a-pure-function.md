# The parser is a pure function

**Status:** accepted

RFI will change its markup: it is a question of when, not if. The `parser` therefore takes
HTML and returns `BoardRow[]` — zero I/O, zero Redis access, zero fetching.

It is the one module that will break, and the one that must be verifiable without touching
the network. If it gets entangled in caching logic, every markup change becomes a production
debugging session instead of a failing test.

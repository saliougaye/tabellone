# The slug is the public identifier, the RFI place ID stays internal

**Status:** accepted

Every station has an opaque `rfiPlaceId`, and public URLs could use it directly, avoiding a
mapping layer. Public URLs use the slug instead: `rfiPlaceId` never appears in a URL, an API
payload or a saved favourite, and the slug is immutable once published.

Three reasons converge. URLs are readable and shareable, which matters for an app that gets
passed around in messages. The RFI ID is outside our control and can change (see the monthly
drift check): if it were in the URL, every internal RFI reorganisation would break users'
saved links. And the mapping gives us a place to handle aliases and redirects, which without
slugs we would have nowhere to put.

## Consequences

The slug is never derived from the name at runtime. If it were, a typo correction on RFI's
side would silently change every URL. Slugs are generated once, by hand-checked script, when
the catalogue is built.

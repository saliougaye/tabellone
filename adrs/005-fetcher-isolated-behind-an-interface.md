# The fetcher is isolated behind an interface

**Status:** accepted

All traffic towards RFI goes through `fetchBoard(placeId, mode)`, with no runtime
dependencies.

The egress IP may be filtered depending on the deployment. Isolation turns relocating the
fetcher into hours of work rather than a rewrite. The deployment choice is deliberately
deferred.

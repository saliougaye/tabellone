# Next.js monolith with the domain in an extractable package

**Status:** accepted

A separate data service (Fastify) would give independent deploys and a controllable egress
IP, at the cost of a second deployable and an internal hop. We chose a single Next.js
deployable instead, with the domain living in `packages/core`, which knows nothing about
Next.

For a POC the monolith is simpler in every respect: one repo, one deploy, shared types for
free, no hop. Splitting the domain into a package costs almost nothing today and keeps
future extraction open — exposing `packages/core` over HTTP would be a few dozen lines,
without touching domain code.

## Consequences

`packages/core` never imports from Next: no `next/headers`, no `NextRequest`, no `after()`.
Runtime hooks are passed in as parameters. As of the initial scaffold this rule has **no
automated check** — it holds by review only.

## Exit condition

Extract a separate service when the frontend's deploy cadence becomes a problem for the
data service, or when a dedicated egress IP towards RFI is needed.

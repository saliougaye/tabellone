# Polling and refresh-on-read, not SSE and a scheduled refresher

**Status:** accepted

The initial design called for a long-running refresher, Redis pub/sub and an SSE hub pushing
to clients. Instead the client polls every 20 s and data refreshes on read: no SSE, no
pub/sub, no scheduled process.

SSE pays off when the server must push events the client cannot anticipate. Here the only
event is "the data changed", which polling discovers within 20 seconds anyway. In exchange
the following disappear: the long-running process, pub/sub, the SSE hub, the hot-station
registry, the problem of deploys closing streams, and heartbeats through intermediate
proxies. The single-flight lock — the real protection mechanism for RFI — is unchanged.

## Consequences

Polling consumes one invocation every 20 s per active tab. With cache-served responses these
are millisecond invocations, but the count is worth watching on long-lived tabs. Mitigation:
suspend polling when the tab is not visible.

## Review condition

Reconsider push if notifications appear, or any event the client cannot discover on its own.

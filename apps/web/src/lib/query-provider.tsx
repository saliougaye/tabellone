'use client'

/**
 * The single React Query client for the app. Board polling (ADR-006) is expressed as
 * query options rather than hand-rolled timers: `refetchInterval` drives the 20 s poll and
 * React Query's focus manager — which listens to `visibilitychange` — suspends it while
 * the document is hidden and refetches on return, the behaviour the hand-rolled hook used
 * to implement itself.
 *
 * The other reason this exists: the cache is keyed per station *and* mode, so flipping
 * departures ↔ arrivals reuses an already-fetched board instead of waiting a round trip
 * on every toggle.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The server is the source of truth for freshness (Redis TTL + stale-while-
        // revalidate); the client never holds a board back on its own.
        staleTime: 0,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state, not at module scope: one client per browser session, never shared
  // between requests on the server.
  const [client] = useState(makeQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/**
 * `slug → rfiPlaceId`, plus station metadata.
 *
 * Static JSON committed to the repo (`src/catalog/stations.json`), imported at build time:
 * not in Redis, not built at runtime, zero round-trip (ARCHITECTURE 11.1). Building the real
 * catalogue is a one-off offline job whose slugs must be reviewed by hand before publication,
 * because a slug is a permanent public contract (ADR-007) — today's three entries all carry
 * `rfiPlaceId: "PLACEHOLDER"`, real slugs, real place ids still pending.
 */
import stations from './catalog/stations.json'
import type { Station } from './types'

/** Every station the app knows, retired ones included. */
export function listStations(): Station[] {
  return stations as Station[]
}

/** Exact slug lookup. Aliases are resolved separately, so a redirect stays distinguishable. */
export function findStationBySlug(slug: string): Station | undefined {
  return listStations().find((station) => station.slug === slug)
}

/** Canonical slug for an alias, or `undefined` if the slug is already canonical or unknown. */
export function resolveAlias(slug: string): string | undefined {
  return listStations().find((station) => station.aliases.includes(slug))?.slug
}

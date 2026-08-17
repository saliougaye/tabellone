/**
 * `slug → rfiPlaceId`, plus station metadata.
 *
 * Static JSON committed to the repo (`src/catalog/stations.json`), imported at build time:
 * not in Redis, not built at runtime, zero round-trip (ARCHITECTURE 11.1). The file is
 * currently an empty list — building the real catalogue is a one-off offline job whose slugs
 * must be reviewed by hand before publication, because a slug is a permanent public contract
 * (ADR-007).
 */
import { NotImplementedError } from './errors'
import type { Station } from './types'

/** Every station the app knows, retired ones included. */
export function listStations(): Station[] {
  throw new NotImplementedError('listStations')
}

/** Exact slug lookup. Aliases are resolved separately, so a redirect stays distinguishable. */
export function findStationBySlug(_slug: string): Station | undefined {
  throw new NotImplementedError('findStationBySlug')
}

/** Canonical slug for an alias, or `undefined` if the slug is already canonical or unknown. */
export function resolveAlias(_slug: string): string | undefined {
  throw new NotImplementedError('resolveAlias')
}

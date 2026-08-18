/**
 * Favourites and recents, purely client-side in `localStorage` — nothing is persisted
 * server-side in v1. Entries carry the slug (the public identifier, ADR-007 — never the
 * RFI place id) plus a display-name cache so lists stay readable when the catalogue is
 * unreachable. All reads are guarded: storage may be absent (SSR) or corrupted.
 */

export type SavedStation = {
  slug: string
  name: string
  /** ISO instant of the last visit, recents are ordered by it. */
  visitedAt: string
}

const FAVOURITES_KEY = 'tabellone:favourites'
const RECENTS_KEY = 'tabellone:recents'
const MAX_RECENTS = 5

function read(key: string): SavedStation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SavedStation =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as SavedStation).slug === 'string' &&
        typeof (entry as SavedStation).name === 'string',
    )
  } catch {
    return []
  }
}

function write(key: string, entries: SavedStation[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries))
  } catch {
    /* quota or private mode: favourites silently stay in memory only */
  }
}

export function listFavourites(): SavedStation[] {
  return read(FAVOURITES_KEY)
}

export function isFavourite(slug: string): boolean {
  return listFavourites().some((entry) => entry.slug === slug)
}

export function toggleFavourite(slug: string, name: string): boolean {
  const favourites = listFavourites()
  const exists = favourites.some((entry) => entry.slug === slug)
  const next = exists
    ? favourites.filter((entry) => entry.slug !== slug)
    : [...favourites, { slug, name, visitedAt: new Date().toISOString() }]
  write(FAVOURITES_KEY, next)
  return !exists
}

export function listRecents(): SavedStation[] {
  return read(RECENTS_KEY)
}

export function recordVisit(slug: string, name: string): void {
  const others = listRecents().filter((entry) => entry.slug !== slug)
  const next = [{ slug, name, visitedAt: new Date().toISOString() }, ...others].slice(
    0,
    MAX_RECENTS,
  )
  write(RECENTS_KEY, next)
}

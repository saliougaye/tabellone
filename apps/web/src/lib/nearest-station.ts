/**
 * The nearest station to a point, from the catalogue's own coordinates. Pure: the browser's
 * geolocation lives in the home screen, this is only the arithmetic.
 *
 * The catalogue carries coordinates for a handful of stations (the rest are `0, 0`, "unknown"),
 * so only those take part, and a reader who is nowhere near any of them gets `far` rather than
 * the least-bad wrong answer: the home then falls back to their own stations.
 */
import type { Station } from '@tabellone/core'

/** Beyond this a "nearest station" is not near enough to be useful on a home screen. */
export const NEAR_MAX_METRES = 30_000

const EARTH_RADIUS_M = 6_371_000
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance, haversine. */
export function metresBetween(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRadians(bLat - aLat)
  const dLon = toRadians(bLon - aLon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export type Nearest =
  | { state: 'found'; station: Station; metres: number }
  /** Stations with known coordinates exist, none within `NEAR_MAX_METRES`. */
  | { state: 'far' }
  /** Not one station in the catalogue has coordinates. */
  | { state: 'unknown' }

export function nearestStation(stations: Station[], lat: number, lon: number): Nearest {
  let best: { station: Station; metres: number } | null = null
  for (const station of stations) {
    if (station.retiredAt || (station.lat === 0 && station.lon === 0)) continue
    const metres = metresBetween(lat, lon, station.lat, station.lon)
    if (!best || metres < best.metres) best = { station, metres }
  }
  if (!best) return { state: 'unknown' }
  return best.metres > NEAR_MAX_METRES ? { state: 'far' } : { state: 'found', ...best }
}

/** "350 m" · "1,2 km" · "12 km". */
export function formatDistance(metres: number): string {
  return metres < 1000
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`
}

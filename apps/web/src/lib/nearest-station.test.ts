import type { Station } from '@tabellone/core'
import { describe, expect, it } from 'vitest'
import { formatDistance, metresBetween, nearestStation } from './nearest-station'

const station = (slug: string, lat: number, lon: number, over: Partial<Station> = {}): Station => ({
  slug,
  name: slug,
  aliases: [],
  rfiPlaceId: '0',
  lat,
  lon,
  city: '',
  isMajor: false,
  checkedAt: '2026-01-01',
  ...over,
})

const centrale = station('milano-centrale', 45.4863, 9.2047)
const garibaldi = station('milano-porta-garibaldi', 45.4844, 9.1873)
const termini = station('roma-termini', 41.9009, 12.5017)
const unknown = station('somewhere', 0, 0)

describe('metresBetween', () => {
  it('is zero for the same point', () => {
    expect(metresBetween(45.4863, 9.2047, 45.4863, 9.2047)).toBeCloseTo(0, 3)
  })

  it('measures Milano Centrale to Porta Garibaldi at about 1.4 km', () => {
    const m = metresBetween(centrale.lat, centrale.lon, garibaldi.lat, garibaldi.lon)
    expect(m).toBeGreaterThan(1300)
    expect(m).toBeLessThan(1600)
  })
})

describe('nearestStation', () => {
  it('picks the closest station with known coordinates', () => {
    const near = nearestStation([termini, centrale, garibaldi], 45.4855, 9.19)
    expect(near.state).toBe('found')
    if (near.state === 'found') expect(near.station.slug).toBe('milano-porta-garibaldi')
  })

  it('ignores stations whose coordinates are 0, 0 and retired ones', () => {
    const retired = station('closed', 45.4855, 9.19, { retiredAt: '2026-01-01' })
    const near = nearestStation([unknown, retired, centrale], 45.4855, 9.19)
    expect(near.state === 'found' && near.station.slug).toBe('milano-centrale')
  })

  it('says far when the closest known station is beyond 30 km', () => {
    expect(nearestStation([termini], 45.4855, 9.19).state).toBe('far')
  })

  it('says unknown when no station has coordinates', () => {
    expect(nearestStation([unknown], 45.4855, 9.19).state).toBe('unknown')
    expect(nearestStation([], 45.4855, 9.19).state).toBe('unknown')
  })
})

describe('formatDistance', () => {
  it('rounds metres to ten and switches to km from 1000', () => {
    expect(formatDistance(347)).toBe('350 m')
    expect(formatDistance(1234)).toBe('1,2 km')
    expect(formatDistance(12_000)).toBe('12 km')
  })
})

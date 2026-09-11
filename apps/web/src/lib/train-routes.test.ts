/**
 * The URL contract of the train page (ADR-012): what it builds, and how it resolves back to
 * a row when the number it carries is not unique.
 */
import type { BoardRow } from '@tabellone/core'
import { describe, expect, it } from 'vitest'
import { findRowByTrainNumber, trainDetailPath } from './train-routes'

const row = (over: Partial<BoardRow> = {}): BoardRow => ({
  operator: 'TRENITALIA',
  brand: 'Frecciarossa',
  category: 'HIGH_SPEED',
  trainNumber: '9612',
  serviceDate: '2026-09-11',
  headsign: 'Milano Centrale',
  viaStops: [],
  scheduledTime: '2026-09-11T23:50:00+02:00',
  delayMinutes: null,
  platform: { scheduled: '12', actual: null, isConfirmed: false },
  status: 'ON_TIME',
  blinking: false,
  ...over,
})

describe('trainDetailPath', () => {
  it('nests the train under the canonical board route', () => {
    expect(trainDetailPath('roma-termini', 'departures', '9612')).toBe(
      '/stazioni/roma-termini/partenze/9612',
    )
    expect(trainDetailPath('roma-termini', 'arrivals', 'CB710')).toBe(
      '/stazioni/roma-termini/arrivi/CB710',
    )
  })
})

describe('findRowByTrainNumber', () => {
  it('finds the row, whatever case the URL was typed in', () => {
    expect(findRowByTrainNumber([row({ trainNumber: 'CB710' })], 'cb710')?.trainNumber).toBe(
      'CB710',
    )
  })

  it('takes the first match when a board carries the number twice', () => {
    // A board spanning midnight: same service, two service dates. The board is time-ordered,
    // so the first match is the sooner one.
    const tonight = row({ serviceDate: '2026-09-11', scheduledTime: '2026-09-11T23:50:00+02:00' })
    const tomorrow = row({ serviceDate: '2026-09-12', scheduledTime: '2026-09-12T00:20:00+02:00' })
    expect(findRowByTrainNumber([tonight, tomorrow], '9612')?.serviceDate).toBe('2026-09-11')
  })

  it('answers null rather than guessing when the train is not on the board', () => {
    expect(findRowByTrainNumber([row()], '1111')).toBeNull()
  })
})

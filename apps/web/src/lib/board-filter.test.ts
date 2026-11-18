/**
 * The filter is the one place where a typed query decides what a traveller does or does not
 * see on a board, so its matching rules are tested directly rather than through the UI.
 */
import type { BoardRow } from '@tabellone/core'
import { describe, expect, it } from 'vitest'
import { filterRows, matchedViaStop } from './board-filter'

const row = (over: Partial<BoardRow> = {}): BoardRow => ({
  operator: 'TRENITALIA',
  brand: 'Frecciarossa',
  category: 'HIGH_SPEED',
  trainNumber: '9612',
  serviceDate: '2026-09-11',
  headsign: 'Milano Centrale',
  viaStops: [{ name: 'Bologna Centrale', time: '16:10' }],
  scheduledTime: '2026-09-11T14:32:00+02:00',
  delayMinutes: null,
  platform: { scheduled: '12', actual: null, isConfirmed: false },
  status: 'ON_TIME',
  blinking: false,
  ...over,
})

const rows = [
  row(),
  row({
    trainNumber: 'CB710',
    brand: null,
    category: 'BUS',
    headsign: 'Forlì',
    viaStops: [],
  }),
  row({
    trainNumber: '2345',
    brand: 'Trenord',
    operator: 'TRENORD',
    category: 'REGIONAL',
    headsign: 'Bergamo',
    viaStops: [{ name: 'Monza', time: '15:02' }],
  }),
]

describe('filterRows', () => {
  it('returns every row when nothing is asked', () => {
    expect(filterRows(rows, '')).toHaveLength(3)
    expect(filterRows(rows, '   ')).toHaveLength(3)
  })

  it('matches the headsign, the train number and the brand', () => {
    expect(filterRows(rows, 'milano')).toHaveLength(1)
    expect(filterRows(rows, 'cb710')[0]?.headsign).toBe('Forlì')
    expect(filterRows(rows, 'frecciarossa')).toHaveLength(1)
  })

  it('matches a stop the row prints in its ladder', () => {
    expect(filterRows(rows, 'bologna')[0]?.trainNumber).toBe('9612')
  })

  it('folds accents, so a phone keyboard finds Forlì', () => {
    expect(filterRows(rows, 'forli')).toHaveLength(1)
  })

  it('requires every term, in any field and any order', () => {
    expect(filterRows(rows, '96 fr')).toHaveLength(1)
    expect(filterRows(rows, 'milano bergamo')).toHaveLength(0)
  })
})

describe('matchedViaStop', () => {
  it('names the stop when only a stop explains the match', () => {
    expect(matchedViaStop(row(), 'bologna')?.time).toBe('16:10')
  })

  it('says nothing when the headsign or the number already explain it', () => {
    expect(matchedViaStop(row(), 'milano')).toBeNull()
    expect(matchedViaStop(row(), '9612')).toBeNull()
  })

  it('says nothing without a query or without a matching stop', () => {
    expect(matchedViaStop(row(), '  ')).toBeNull()
    expect(matchedViaStop(row(), 'napoli')).toBeNull()
  })
})

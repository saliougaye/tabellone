/**
 * The filter is the one place where a typed query decides what a traveller does or does not
 * see on a board, so its matching rules are tested directly rather than through the UI.
 */
import type { BoardRow } from '@tabellone/core'
import { describe, expect, it } from 'vitest'
import { chipCategories, emptyFilter, filterRows, isFilterActive } from './board-filter'

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
    expect(filterRows(rows, emptyFilter)).toHaveLength(3)
    expect(isFilterActive(emptyFilter)).toBe(false)
  })

  it('matches the headsign, the train number and the brand', () => {
    expect(filterRows(rows, { ...emptyFilter, query: 'milano' })).toHaveLength(1)
    expect(filterRows(rows, { ...emptyFilter, query: 'cb710' })[0]?.headsign).toBe('Forlì')
    expect(filterRows(rows, { ...emptyFilter, query: 'frecciarossa' })).toHaveLength(1)
  })

  it('matches a stop the row prints in its ladder', () => {
    expect(filterRows(rows, { ...emptyFilter, query: 'bologna' })[0]?.trainNumber).toBe('9612')
  })

  it('folds accents, so a phone keyboard finds Forlì', () => {
    expect(filterRows(rows, { ...emptyFilter, query: 'forli' })).toHaveLength(1)
  })

  it('requires every term, in any field and any order', () => {
    expect(filterRows(rows, { ...emptyFilter, query: '96 fr' })).toHaveLength(1)
    expect(filterRows(rows, { ...emptyFilter, query: 'milano bergamo' })).toHaveLength(0)
  })

  it('treats the categories as a union, and combines them with the query', () => {
    expect(filterRows(rows, { query: '', categories: ['BUS', 'REGIONAL'] })).toHaveLength(2)
    expect(filterRows(rows, { query: 'forli', categories: ['REGIONAL'] })).toHaveLength(0)
  })
})

describe('chipCategories', () => {
  it('offers only the categories on the board, fastest first', () => {
    expect(chipCategories(rows, [])).toEqual(['HIGH_SPEED', 'REGIONAL', 'BUS'])
  })

  it('keeps a selected category drawn even once the board no longer has it', () => {
    // The mode was switched and the arrivals board has no bus: the chip has to survive, or
    // the reader is left with an empty board and no visible cause.
    expect(chipCategories([row()], ['BUS'])).toEqual(['HIGH_SPEED', 'BUS'])
  })
})

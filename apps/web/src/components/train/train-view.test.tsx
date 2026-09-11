/**
 * The train page's presentation: one train, its figures, and the full route. The cases that
 * matter here are the ones the board deliberately does *not* render this way — the ladder
 * that must not fold, and the way back to the board the page came from.
 */
import type { BoardRow, StationBoard } from '@tabellone/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TrainView } from './train-view'

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver

afterEach(cleanup)

const stops = [
  'Firenze S.M.N.',
  'Prato Centrale',
  'Bologna Centrale',
  'Modena',
  'Reggio Emilia',
  'Parma',
  'Piacenza',
  'Milano Centrale',
]

const row = (over: Partial<BoardRow> = {}): BoardRow => ({
  operator: 'TRENITALIA',
  brand: 'Frecciarossa',
  category: 'HIGH_SPEED',
  trainNumber: '9612',
  serviceDate: '2026-08-26',
  headsign: 'Milano Centrale',
  viaStops: stops.map((name, i) => ({ name, time: `1${i}:05` })),
  scheduledTime: '2026-08-26T14:32:00+02:00',
  delayMinutes: null,
  platform: { scheduled: '12', actual: null, isConfirmed: false },
  status: 'ON_TIME',
  blinking: false,
  ...over,
})

const board = (over: Partial<StationBoard> = {}): StationBoard => ({
  stationId: 'roma-termini',
  stationName: 'Roma Termini',
  mode: 'departures',
  generatedAt: '2026-08-26T14:30:00+02:00',
  isStale: false,
  rows: [],
  notices: [],
  ...over,
})

const now = new Date('2026-08-26T14:31:00+02:00')

describe('TrainView', () => {
  it('makes the train the subject and leads back to its board', () => {
    render(<TrainView board={board()} row={row()} now={now} />)
    // The plate names the train, not the station: this page is one train.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Milano Centrale')
    expect(screen.getByText('9612')).toBeTruthy()
    // Twice on purpose: the figure at the top, and this station's own rung of the ladder.
    expect(screen.getAllByText('14:32')).toHaveLength(2)
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/stazioni/roma-termini/partenze')
  })

  it('prints every rung: the fold is a board device, not a page one', () => {
    render(<TrainView board={board()} row={row()} now={now} />)
    // The stop the board's folded ladder hides, and no fold control at all.
    expect(screen.getByText('Modena')).toBeTruthy()
    expect(screen.queryByText(/fermate$/)).toBeNull()
  })

  it('carries a delay and a cancellation the way the board does', () => {
    cleanup()
    render(
      <TrainView board={board()} row={row({ status: 'DELAYED', delayMinutes: 18 })} now={now} />,
    )
    expect(screen.getByText('+18 min')).toBeTruthy()
    // Scheduled time struck through, actual time shown big.
    expect(screen.getAllByText('14:50').length).toBeGreaterThan(0)

    cleanup()
    render(<TrainView board={board()} row={row({ status: 'CANCELLED' })} now={now} />)
    expect(screen.getByText('Cancellato')).toBeTruthy()
  })

  it('shows the station notices, which are addressed to whoever is waiting', () => {
    render(
      <TrainView board={board({ notices: ['Sciopero del personale'] })} row={row()} now={now} />,
    )
    expect(screen.getByText('Sciopero del personale')).toBeTruthy()
  })
})

describe('TrainGone', () => {
  it('says the train left rather than that something failed, and leads back', async () => {
    const { TrainGone } = await import('./train-states')
    render(
      <TrainGone
        trainNumber="9612"
        stationLabel="Roma Termini"
        boardPath="/stazioni/roma-termini/partenze"
      />,
    )
    expect(screen.getByText('Treno non più in tabellone')).toBeTruthy()
    // Not the board's failed-read copy: nothing failed here.
    expect(screen.queryByText('Dati non disponibili')).toBeNull()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/stazioni/roma-termini/partenze')
  })
})

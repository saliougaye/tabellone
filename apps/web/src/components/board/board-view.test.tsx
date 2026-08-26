/**
 * A render smoke test for the board's presentation: the composition is one component tree
 * with two row shapes, and the states it has to get right (delayed, cancelled, imminent,
 * confirmed platform, empty) are exactly the ones no fixture in this repo exercises while
 * `fetcher` and `parser` are unimplemented. This is what stands in for opening the app.
 */

import type { BoardRow, StationBoard } from '@tabellone/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BoardView } from './board-view'

// jsdom implements neither observer; `ModeToggle` measures its pill with one and
// `MarqueeText` measures its overflow with the other.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver
// jsdom has no media-query engine either; `MarqueeText` asks it about reduced motion.
globalThis.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList) as typeof matchMedia

afterEach(cleanup)

const row = (over: Partial<BoardRow> = {}): BoardRow => ({
  operator: 'TRENITALIA',
  brand: 'Frecciarossa',
  category: 'HIGH_SPEED',
  trainNumber: '9612',
  serviceDate: '2026-08-26',
  headsign: 'Milano Centrale',
  viaStops: [
    { name: 'Firenze S.M.N.', time: '15:30' },
    { name: 'Bologna Centrale', time: '16:10' },
  ],
  scheduledTime: '2026-08-26T14:32:00+02:00',
  delayMinutes: null,
  platform: { scheduled: '12', actual: null, isConfirmed: false },
  status: 'ON_TIME',
  blinking: false,
  ...over,
})

const board = (rows: BoardRow[]): StationBoard => ({
  stationId: '830',
  stationName: 'Roma Termini',
  mode: 'departures',
  generatedAt: '2026-08-26T14:30:00+02:00',
  isStale: false,
  rows,
  notices: [],
})

describe('BoardView', () => {
  it('renders a full board', () => {
    render(
      <BoardView
        board={board([
          row(),
          row({ trainNumber: 'CB710', status: 'DELAYED', delayMinutes: 18, category: 'BUS' }),
          row({ trainNumber: '2345', status: 'CANCELLED' }),
          row({
            trainNumber: '9999',
            status: 'IMMINENT',
            blinking: true,
            platform: { scheduled: '3', actual: '5', isConfirmed: true },
          }),
        ])}
        now={new Date('2026-08-26T14:31:00+02:00')}
        onSwitchMode={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Roma Termini')
    // One lead train and one list, so the station's own name is the only `h1` and each list
    // block is an `h2` under it.
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Prossime partenze')
    // Every exceptional state reaches the screen through the one row implementation.
    expect(screen.getByText('+18 min')).toBeTruthy()
    expect(screen.getByText('Cancellato')).toBeTruthy()
    expect(screen.getByText('In partenza')).toBeTruthy()
    // The confirmed platform is the inverted block, and it is the actual platform, not the
    // scheduled one.
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('folds the middle of a long route ladder and opens it on tap', () => {
    // Nine rungs: this station plus eight stops. Two at each end stay printed, the five
    // between them fold into one rung.
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
    render(
      <BoardView
        board={board([row({ viaStops: stops.map((name, i) => ({ name, time: `1${i}:05` })) })])}
        now={new Date('2026-08-26T14:31:00+02:00')}
        onSwitchMode={() => {}}
      />,
    )
    expect(screen.getByText('Ferma a')).toBeTruthy()
    // The station the reader is standing in is a rung of its own, not just the heading.
    expect(screen.getAllByText('Roma Termini').length).toBeGreaterThan(1)
    expect(screen.queryByText('Modena')).toBeNull()
    fireEvent.click(screen.getByText('+5 fermate'))
    expect(screen.getByText('Modena')).toBeTruthy()
    expect(screen.queryByText('+5 fermate')).toBeNull()
    // Position names the ends of the journey, in either mode.
    expect(screen.getByText('Partenza')).toBeTruthy()
    expect(screen.getByText('Arrivo')).toBeTruthy()
  })

  it('renders an empty board', () => {
    render(<BoardView board={board([])} now={new Date()} onSwitchMode={() => {}} />)
    expect(screen.getByText('Nessun treno in questo momento')).toBeTruthy()
  })
})

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
  // The slug, not RFI's place id: that is what `StationBoard.stationId` carries, and the
  // board builds its train links out of it.
  stationId: 'roma-termini',
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

  it('narrows the board to what the reader typed, and says so in the count', () => {
    render(
      <BoardView
        board={board([
          row(),
          row({ trainNumber: '2345', headsign: 'Napoli Centrale', viaStops: [] }),
          row({ trainNumber: 'CB710', headsign: 'Bergamo', category: 'BUS', viaStops: [] }),
        ])}
        now={new Date('2026-08-26T14:31:00+02:00')}
        onSwitchMode={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { expanded: false, name: /cerca e filtra/i }))
    fireEvent.change(screen.getByLabelText(/cerca treno/i), { target: { value: 'napoli' } })
    expect(screen.getByText('Napoli Centrale')).toBeTruthy()
    expect(screen.queryByText('Bergamo')).toBeNull()
    // The count says what is shown *of* what is there: a bare "1" would read as a board that
    // had emptied on its own.
    expect(screen.getByText('1 di 3')).toBeTruthy()
  })

  it('filters by category, and a filter matching nothing is not an empty board', () => {
    render(
      <BoardView
        board={board([row(), row({ trainNumber: 'CB710', category: 'BUS', viaStops: [] })])}
        now={new Date('2026-08-26T14:31:00+02:00')}
        onSwitchMode={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { expanded: false, name: /cerca e filtra/i }))
    fireEvent.click(screen.getByRole('button', { pressed: false, name: 'Bus' }))
    expect(screen.getByText('CB710')).toBeTruthy()
    expect(screen.queryByText('9612')).toBeNull()

    // A category that is on the board plus a query that is not: the trains exist, the filter
    // hides them, and the copy has to be the one that offers a way back.
    fireEvent.change(screen.getByLabelText(/cerca treno/i), { target: { value: 'zzz' } })
    expect(screen.getByText('Nessun treno corrisponde')).toBeTruthy()
    expect(screen.queryByText('Nessun treno in questo momento')).toBeNull()
    fireEvent.click(screen.getAllByText('Azzera filtri')[0] as HTMLElement)
    expect(screen.getByText('9612')).toBeTruthy()
  })

  it('offers no filter on a board with nothing to filter', () => {
    render(<BoardView board={board([])} now={new Date()} onSwitchMode={() => {}} />)
    expect(screen.queryByRole('button', { name: /cerca e filtra/i })).toBeNull()
  })

  it("leads to a train's own page from the row that has no stops to expand", () => {
    render(
      <BoardView
        board={board([row(), row({ trainNumber: 'CB710', category: 'BUS', viaStops: [] })])}
        now={new Date('2026-08-26T14:31:00+02:00')}
        onSwitchMode={() => {}}
      />,
    )
    // The lead train keeps its expansion and carries the link inside it; the stopless row has
    // nothing to expand, so its whole band is the link (ADR-012).
    const detail = screen.getByRole('link', { name: /CB710/ })
    expect(detail.getAttribute('href')).toBe('/stazioni/roma-termini/partenze/CB710')
    expect(screen.getByRole('link', { name: /9612/ }).getAttribute('href')).toBe(
      '/stazioni/roma-termini/partenze/9612',
    )
  })

  it('renders an empty board', () => {
    render(<BoardView board={board([])} now={new Date()} onSwitchMode={() => {}} />)
    expect(screen.getByText('Nessun treno in questo momento')).toBeTruthy()
  })
})

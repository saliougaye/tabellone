/**
 * TEMPORARY — delete together with /dev/scenari when the real backend lands.
 *
 * Typed fixtures for the dev gallery: every board state the UI must support, one
 * scenario per entry. They import the real domain types so the typechecker keeps the
 * gallery honest — when `StationBoard` changes, these fail to compile.
 *
 * Times are offsets from a `now` passed by the caller: countdowns and freshness labels
 * behave like live data on every reload. Fixtures never cross the API boundary — route
 * handlers stay 501 stubs; only the gallery page renders these.
 */
import type { BoardMode, BoardRow, StationBoard } from '@tabellone/core'

function at(now: Date, minutes: number): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString()
}

const serviceDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' })

function serviceDate(now: Date): string {
  return serviceDateFormat.format(now)
}

function row(now: Date, partial: Omit<BoardRow, 'serviceDate'>): BoardRow {
  return { serviceDate: serviceDate(now), ...partial }
}

/** Every row shape at once: the visual checklist of the parser's future edge cases. */
export function fullBoard(now: Date, mode: BoardMode = 'departures'): StationBoard {
  const rows: BoardRow[] = [
    row(now, {
      operator: 'TRENITALIA',
      brand: 'Frecciarossa',
      category: 'HIGH_SPEED',
      trainNumber: '9513',
      headsign: 'Roma Termini',
      viaStops: [
        { name: 'Bologna Centrale', time: at(now, 62) },
        { name: 'Firenze S.M.N.', time: at(now, 99) },
        { name: 'Roma Termini', time: at(now, 185) },
      ],
      scheduledTime: at(now, 2),
      delayMinutes: null,
      platform: { scheduled: '12', actual: '12', isConfirmed: true },
      status: 'IMMINENT',
      blinking: true,
    }),
    row(now, {
      operator: 'ITALO',
      brand: 'Italo',
      category: 'HIGH_SPEED',
      trainNumber: '8903',
      headsign: 'Venezia S. Lucia',
      viaStops: [
        { name: 'Verona Porta Nuova', time: at(now, 88) },
        { name: 'Padova', time: at(now, 141) },
        { name: 'Venezia S. Lucia', time: at(now, 168) },
      ],
      scheduledTime: at(now, 17),
      delayMinutes: null,
      platform: { scheduled: '5', actual: '5', isConfirmed: true },
      status: 'ON_TIME',
      blinking: false,
    }),
    row(now, {
      operator: 'TRENORD',
      brand: null,
      category: 'REGIONAL',
      trainNumber: '2045',
      headsign: 'Bologna Centrale',
      viaStops: [
        { name: 'Lodi', time: at(now, 55) },
        { name: 'Piacenza', time: at(now, 76) },
        { name: 'Parma', time: at(now, 108) },
        { name: 'Bologna Centrale', time: at(now, 159) },
      ],
      scheduledTime: at(now, 27),
      delayMinutes: 6,
      platform: { scheduled: '1', actual: null, isConfirmed: false },
      status: 'DELAYED',
      blinking: false,
    }),
    row(now, {
      operator: 'TRENITALIA',
      brand: null,
      category: 'INTERCITY',
      trainNumber: '654',
      headsign: 'Genova P. Principe',
      viaStops: [
        { name: 'Pavia', time: at(now, 70) },
        { name: 'Genova P. Principe', time: at(now, 146) },
      ],
      scheduledTime: at(now, 41),
      delayMinutes: 115,
      platform: { scheduled: '4', actual: null, isConfirmed: false },
      status: 'DELAYED',
      blinking: false,
    }),
    row(now, {
      operator: 'TRENITALIA',
      brand: 'Frecciarossa',
      category: 'HIGH_SPEED',
      trainNumber: '9519',
      headsign: 'Firenze S.M.N.',
      viaStops: [
        { name: 'Bologna Centrale', time: at(now, 118) },
        { name: 'Firenze S.M.N.', time: at(now, 155) },
      ],
      scheduledTime: at(now, 55),
      delayMinutes: null,
      platform: { scheduled: null, actual: null, isConfirmed: false },
      status: 'CANCELLED',
      blinking: false,
    }),
    row(now, {
      operator: 'TRENORD',
      brand: null,
      category: 'REGIONAL_FAST',
      trainNumber: '2718',
      headsign: 'Verona Porta Nuova',
      viaStops: [
        { name: 'Brescia', time: at(now, 104) },
        { name: 'Verona Porta Nuova', time: at(now, 139) },
      ],
      scheduledTime: at(now, 66),
      delayMinutes: null,
      platform: { scheduled: '3', actual: '7', isConfirmed: true },
      status: 'PARTIAL',
      blinking: false,
    }),
    row(now, {
      operator: 'TRENITALIA',
      brand: null,
      category: 'REGIONAL',
      trainNumber: '10462',
      headsign: 'Torino Porta Nuova',
      viaStops: [
        { name: 'Novara', time: at(now, 121) },
        { name: 'Torino Porta Nuova', time: at(now, 172) },
      ],
      scheduledTime: at(now, 78),
      delayMinutes: null,
      platform: { scheduled: '8', actual: null, isConfirmed: false },
      status: 'REROUTED',
      blinking: false,
    }),
    row(now, {
      // BUS is an ordinary category, not an edge case; train numbers are alphanumeric.
      operator: 'TRENITALIA',
      brand: null,
      category: 'BUS',
      trainNumber: 'CB710',
      headsign: 'Piacenza',
      viaStops: [{ name: 'Piacenza', time: at(now, 158) }],
      scheduledTime: at(now, 92),
      delayMinutes: null,
      platform: { scheduled: null, actual: null, isConfirmed: false },
      status: 'ON_TIME',
      blinking: false,
    }),
    row(now, {
      // Unrecognised operator → OTHER with the neutral mark, never an invented colour.
      operator: 'OTHER',
      brand: null,
      category: 'OTHER',
      trainNumber: 'EC42',
      headsign: 'Zürich HB',
      viaStops: [
        { name: 'Como San Giovanni', time: at(now, 143) },
        { name: 'Lugano', time: at(now, 176) },
      ],
      scheduledTime: at(now, 107),
      delayMinutes: null,
      platform: { scheduled: '11', actual: null, isConfirmed: false },
      status: 'ON_TIME',
      blinking: false,
    }),
    row(now, {
      operator: 'ITALO',
      brand: 'Italo',
      category: 'HIGH_SPEED',
      trainNumber: '8911',
      headsign: 'Napoli Centrale',
      viaStops: [
        { name: 'Bologna Centrale', time: at(now, 185) },
        { name: 'Roma Termini', time: at(now, 262) },
        { name: 'Napoli Centrale', time: at(now, 331) },
      ],
      scheduledTime: at(now, 125),
      delayMinutes: null,
      platform: { scheduled: '6', actual: null, isConfirmed: false },
      status: 'ON_TIME',
      blinking: false,
    }),
  ]

  return {
    stationId: 'milano-centrale',
    stationName: 'Milano Centrale',
    mode,
    generatedAt: now.toISOString(),
    isStale: false,
    rows,
    notices: [],
  }
}

/** Empty at night: a normal state, rendered differently from a failed read. */
export function emptyBoard(now: Date): StationBoard {
  return {
    stationId: 'napoli-centrale',
    stationName: 'Napoli Centrale',
    mode: 'departures',
    generatedAt: now.toISOString(),
    isStale: false,
    rows: [],
    notices: [],
  }
}

/** Stale: last good data served while RFI is unreachable, honestly labelled. */
export function staleBoard(now: Date): StationBoard {
  const generatedAt = new Date(now.getTime() - 3 * 60_000)
  return { ...fullBoard(generatedAt), generatedAt: generatedAt.toISOString(), isStale: true }
}

/** Board-level notices above the list. */
export function noticesBoard(now: Date): StationBoard {
  return {
    ...fullBoard(now),
    stationId: 'roma-termini',
    stationName: 'Roma Termini',
    rows: fullBoard(now).rows.slice(0, 3),
    notices: [
      'Circolazione rallentata fra Milano e Bologna per un guasto alla linea.',
      'Sciopero del personale previsto dalle 21:00 alle 24:00.',
    ],
  }
}

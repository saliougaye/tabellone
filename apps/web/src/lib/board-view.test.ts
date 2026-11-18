import type { BoardRow } from '@tabellone/core'
import { describe, expect, it } from 'vitest'
import {
  countByOperator,
  formatTicketDuration,
  groupByHorizon,
  horizonOf,
  stubCountdown,
  ticketPill,
  ticketRoute,
  upcomingRows,
} from './board-view'

const NOW = new Date('2026-11-17T12:00:00+01:00')
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString()

const row = (minutes: number, over: Partial<BoardRow> = {}): BoardRow => ({
  operator: 'TRENITALIA',
  brand: 'Frecciarossa',
  category: 'HIGH_SPEED',
  trainNumber: String(9000 + minutes),
  serviceDate: '2026-11-17',
  headsign: 'Milano Centrale',
  viaStops: [{ name: 'Bologna Centrale', time: '13:10' }],
  scheduledTime: at(minutes),
  delayMinutes: null,
  platform: { scheduled: null, actual: null, isConfirmed: false },
  status: 'ON_TIME',
  blinking: false,
  ...over,
})

describe('upcomingRows', () => {
  it('drops what left more than 30 minutes ago and sorts by expected, not scheduled, time', () => {
    const late = row(5, { status: 'DELAYED', delayMinutes: 40 }) // expected in 45
    const rows = [late, row(20), row(-31), row(-30), row(2)]
    expect(upcomingRows(rows, NOW).map((r) => r.trainNumber)).toEqual([
      '8970',
      '9002',
      '9020',
      '9005',
    ])
  })
})

describe('horizonOf / groupByHorizon', () => {
  it('cuts at 30 and 60 minutes, inclusive on the sooner side', () => {
    expect(horizonOf(row(30), NOW)).toBe('soon')
    expect(horizonOf(row(31), NOW)).toBe('hour')
    expect(horizonOf(row(60), NOW)).toBe('hour')
    expect(horizonOf(row(61), NOW)).toBe('later')
    expect(horizonOf(row(-10), NOW)).toBe('soon')
  })

  it('leaves empty groups out and keeps order within a group', () => {
    const groups = groupByHorizon([row(5), row(10), row(90)], NOW)
    expect(groups.map((g) => g.horizon)).toEqual(['soon', 'later'])
    expect(groups[0]?.rows.map((r) => r.trainNumber)).toEqual(['9005', '9010'])
  })
})

describe('countByOperator', () => {
  const rows = [
    row(5),
    row(10, { operator: 'ITALO', brand: 'Italo', headsign: 'Napoli Centrale' }),
    row(15, { operator: 'TRENORD', brand: 'Trenord', headsign: 'Bergamo', viaStops: [] }),
    row(-45, { operator: 'TRENORD' }),
  ]

  it('counts the trains the list would show, per operator and in total', () => {
    expect(countByOperator(rows, NOW, '')).toEqual({ all: 3, TRENITALIA: 1, ITALO: 1, TRENORD: 1 })
  })

  it('applies the search first', () => {
    expect(countByOperator(rows, NOW, 'napoli')).toEqual({ all: 1, ITALO: 1 })
    expect(countByOperator(rows, NOW, 'nowhere')).toEqual({ all: 0 })
  })
})

describe('stubCountdown', () => {
  it('counts down, then says the train is about to go and never that it has gone', () => {
    expect(stubCountdown(row(7), 'departures', NOW)).toBe('tra 7 min')
    expect(stubCountdown(row(72), 'departures', NOW)).toBe('tra 1 h 12')
    expect(stubCountdown(row(125), 'departures', NOW)).toBe('tra 2 h 05')
    expect(stubCountdown(row(0), 'departures', NOW)).toBe('in partenza')
    expect(stubCountdown(row(-12), 'departures', NOW)).toBe('in partenza')
    expect(stubCountdown(row(-12), 'arrivals', NOW)).toBe('in arrivo')
    expect(stubCountdown(row(30, { status: 'IMMINENT' }), 'departures', NOW)).toBe('in partenza')
    expect(stubCountdown(row(30, { status: 'CANCELLED' }), 'departures', NOW)).toBe('soppresso')
  })
})

describe('ticketPill', () => {
  it('only exceptions on the list, everything in the opened ticket', () => {
    expect(ticketPill(row(5), 'departures')).toBeNull()
    expect(ticketPill(row(5), 'departures', true)).toEqual({ tone: 'ok', text: 'In orario' })
    expect(ticketPill(row(5, { status: 'DELAYED', delayMinutes: 12 }), 'departures')).toEqual({
      tone: 'late',
      text: '+12 min',
    })
    expect(ticketPill(row(5, { status: 'CANCELLED' }), 'departures')?.tone).toBe('bad')
    expect(ticketPill(row(5, { status: 'IMMINENT' }), 'arrivals', true)).toEqual({
      tone: 'now',
      text: 'In arrivo',
    })
  })
})

describe('ticketRoute', () => {
  it('draws arrival and duration when the stop list ends at the destination', () => {
    const r = row(10, {
      scheduledTime: '2026-11-17T12:10:00+01:00',
      headsign: 'MILANO CENTRALE',
      viaStops: [
        { name: 'BOLOGNA CENTRALE', time: '13:10' },
        { name: 'MILANO CENTRALE', time: '14:40' },
      ],
    })
    const route = ticketRoute(r, 'departures', 'ROMA TERMINI')
    expect(route.from).toEqual({ time: '12:10', late: null, place: 'Roma Termini' })
    expect(route.to).toEqual({ time: '14:40', late: null, place: 'Milano Centrale' })
    expect(route.durationMinutes).toBe(150)
    expect(route.stops.map((s) => s.name)).toEqual([
      'Roma Termini',
      'Bologna Centrale',
      'Milano Centrale',
    ])
    expect(formatTicketDuration(150)).toBe('2 h 30')
    expect(formatTicketDuration(42)).toBe('42 min')
  })

  it('says nothing about the arrival when RFI’s list stops before the destination', () => {
    const r = row(10, {
      scheduledTime: '2026-11-17T12:10:00+01:00',
      headsign: 'ROMA TERMINI',
      viaStops: [{ name: 'FIRENZE S.M. NOVELLA', time: '13:30' }],
    })
    const route = ticketRoute(r, 'departures', 'Milano Centrale')
    expect(route.to.time).toBeNull()
    expect(route.durationMinutes).toBeNull()
  })

  it('on an arrivals board the time here is the arrival, and a late one shows the new time', () => {
    const r = row(10, {
      scheduledTime: '2026-11-17T12:10:00+01:00',
      status: 'DELAYED',
      delayMinutes: 15,
    })
    const route = ticketRoute(r, 'arrivals', 'Milano Centrale')
    expect(route.from).toEqual({ time: null, late: null, place: 'da Milano Centrale' })
    expect(route.to).toEqual({ time: '12:10', late: '12:25', place: 'Milano Centrale' })
    expect(route.stops).toEqual([])
  })
})

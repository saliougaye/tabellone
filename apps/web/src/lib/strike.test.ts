import type { BoardRow } from '@tabellone/core'
import { describe, expect, it } from 'vitest'
import {
  calendarDaysBetween,
  dayWord,
  type StrikeNotice,
  strikeCopy,
  strikeImpact,
  strikePhase,
} from './strike'

const strike: StrikeNotice = {
  kind: 'strike',
  from: '2026-11-20T21:00:00.000+01:00',
  to: '2026-11-21T20:00:00.000+01:00',
  national: true,
  who: 'Gruppo FS Italiane, Italo e Trenord',
  text: '',
}
const at = (iso: string) => new Date(iso)

describe('strikePhase', () => {
  it('is announced more than 24 h before the start', () => {
    expect(strikePhase(strike, at('2026-11-19T20:59:00+01:00'))).toBe('announced')
  })
  it('is imminent from 24 h before until the start', () => {
    expect(strikePhase(strike, at('2026-11-19T21:00:00+01:00'))).toBe('imminent')
    expect(strikePhase(strike, at('2026-11-20T20:59:00+01:00'))).toBe('imminent')
  })
  it('is ongoing from the start until the end', () => {
    expect(strikePhase(strike, at('2026-11-20T21:00:00+01:00'))).toBe('ongoing')
    expect(strikePhase(strike, at('2026-11-21T19:59:00+01:00'))).toBe('ongoing')
  })
  it('stays over for three hours, then is gone', () => {
    expect(strikePhase(strike, at('2026-11-21T20:00:00+01:00'))).toBe('over')
    expect(strikePhase(strike, at('2026-11-21T22:59:00+01:00'))).toBe('over')
    expect(strikePhase(strike, at('2026-11-21T23:00:00+01:00'))).toBeNull()
  })
  it('is gone, not thrown, on an instant it cannot read', () => {
    expect(strikePhase({ from: 'x', to: 'y' }, at('2026-11-20T21:00:00+01:00'))).toBeNull()
  })
})

describe('calendarDaysBetween / dayWord', () => {
  it('counts Rome calendar days, not 24 h blocks', () => {
    // 25 h long day (fall back, 25 Oct 2026): 00:30 → 23:30 the same day is 0 days, next day is 1.
    expect(calendarDaysBetween('2026-10-25T00:30:00+02:00', '2026-10-25T23:30:00+01:00')).toBe(0)
    expect(calendarDaysBetween('2026-10-25T00:30:00+02:00', '2026-10-26T00:10:00+01:00')).toBe(1)
  })
  it('says oggi / stasera / domani / a date', () => {
    const now = at('2026-11-20T10:00:00+01:00')
    expect(dayWord('2026-11-20T15:00:00+01:00', now)).toBe('oggi')
    expect(dayWord('2026-11-20T21:00:00+01:00', now)).toBe('stasera')
    expect(dayWord('2026-11-21T08:00:00+01:00', now)).toBe('domani')
    expect(dayWord('2026-11-23T08:00:00+01:00', now)).toMatch(/lun 23 nov/)
  })
})

describe('strikeCopy', () => {
  it('announced: how many days, the window', () => {
    const c = strikeCopy(strike, 'announced', at('2026-11-17T12:00:00+01:00'))
    expect(c.kicker).toBe('Tra 3 giorni')
    expect(c.title).toBe('Sciopero nazionale')
    expect(c.line).toBe('Da ven 20 nov, 21:00 a sab 21 nov, 20:00')
  })
  it('imminent: tonight, and how long to go', () => {
    const c = strikeCopy(strike, 'imminent', at('2026-11-20T18:00:00+01:00'))
    expect(c.kicker).toBe('Tra 3 h')
    expect(c.title).toBe('Sciopero da stasera alle 21:00')
    expect(c.line).toBe('Fino a domani alle 20:00')
  })
  it('ongoing: until when, and how long is left', () => {
    const c = strikeCopy(strike, 'ongoing', at('2026-11-21T10:00:00+01:00'))
    expect(c.kicker).toBe('In corso')
    expect(c.line).toBe('Fino a stasera alle 20:00 · finisce tra 10 h')
  })
  it('over: says when it ended', () => {
    expect(strikeCopy(strike, 'over', at('2026-11-21T21:00:00+01:00')).title).toBe(
      'Sciopero finito alle 20:00',
    )
  })
})

describe('strikeImpact', () => {
  const row = (over: Partial<BoardRow>): BoardRow =>
    ({ status: 'ON_TIME', delayMinutes: null, ...over }) as BoardRow
  it('counts trains 5+ minutes late and cancelled ones apart', () => {
    expect(
      strikeImpact([
        row({}),
        row({ status: 'DELAYED', delayMinutes: 4 }),
        row({ status: 'DELAYED', delayMinutes: 5 }),
        row({ status: 'CANCELLED', delayMinutes: 30 }),
      ]),
    ).toEqual({ late: 1, cancelled: 1 })
  })
})

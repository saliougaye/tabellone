/**
 * Followed trains live in `localStorage`: what must hold is the rules around the entries —
 * identity, the cap of five, and that an entry drops itself — not the storage itself.
 */
import type { BoardRow } from '@tabellone/core'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  type FollowedTrain,
  followKey,
  isFollowing,
  listFollowed,
  MAX_FOLLOWED,
  parseFollowed,
  syncExpectedTimes,
  toggleFollowed,
  unfollow,
} from './followed-trains'

const at = (hhmm: string) => `2026-11-18T${hhmm}:00+01:00`
const NOON = new Date(at('12:00'))

const train = (over: Partial<FollowedTrain> = {}): FollowedTrain => ({
  slug: 'milano-centrale',
  mode: 'departures',
  trainNumber: '9612',
  scheduledAt: at('14:32'),
  headsign: 'ROMA TERMINI',
  stationName: 'MILANO CENTRALE',
  ...over,
})

beforeEach(() => window.localStorage.clear())

describe('toggleFollowed', () => {
  it('follows, then unfollows, the same train', () => {
    expect(toggleFollowed(train(), NOON)).toBe(true)
    expect(isFollowing(train(), NOON)).toBe(true)
    expect(toggleFollowed(train(), NOON)).toBe(false)
    expect(listFollowed(NOON)).toEqual([])
  })

  it('keys by station, mode, number and time: the same number elsewhere is another train', () => {
    toggleFollowed(train(), NOON)
    toggleFollowed(train({ mode: 'arrivals' }), NOON)
    toggleFollowed(train({ slug: 'roma-termini' }), NOON)
    toggleFollowed(train({ scheduledAt: at('23:55') }), NOON)
    expect(listFollowed(NOON)).toHaveLength(4)
    expect(new Set(listFollowed(NOON).map(followKey)).size).toBe(4)
  })

  it('never holds the same key twice', () => {
    window.localStorage.setItem('tabellone:followed-trains', JSON.stringify([train(), train()]))
    expect(listFollowed(NOON)).toHaveLength(1)
  })

  it('caps at five: the sixth follow pushes the oldest out', () => {
    for (let n = 1; n <= MAX_FOLLOWED + 1; n++)
      toggleFollowed(train({ trainNumber: `T${n}` }), NOON)
    const numbers = listFollowed(NOON).map((entry) => entry.trainNumber)
    expect(numbers).toEqual(['T2', 'T3', 'T4', 'T5', 'T6'])
  })
})

describe('expiry', () => {
  it('drops an entry three hours after the train time', () => {
    const raw = JSON.stringify([train({ scheduledAt: at('08:00') })])
    expect(parseFollowed(raw, new Date(at('10:59')))).toHaveLength(1)
    expect(parseFollowed(raw, new Date(at('11:00')))).toHaveLength(0)
  })

  it('counts from the expected time when the train is late', () => {
    const raw = JSON.stringify([train({ scheduledAt: at('08:00'), expectedAt: at('09:30') })])
    expect(parseFollowed(raw, new Date(at('12:29')))).toHaveLength(1)
    expect(parseFollowed(raw, new Date(at('12:30')))).toHaveLength(0)
  })

  it('does not let an earlier "expected" shorten the life', () => {
    const raw = JSON.stringify([train({ scheduledAt: at('08:00'), expectedAt: at('07:00') })])
    expect(parseFollowed(raw, new Date(at('10:59')))).toHaveLength(1)
  })

  it('does not count an expired entry against the cap', () => {
    const stale = train({ trainNumber: 'OLD', scheduledAt: at('01:00') })
    window.localStorage.setItem('tabellone:followed-trains', JSON.stringify([stale]))
    for (let n = 1; n <= MAX_FOLLOWED; n++) toggleFollowed(train({ trainNumber: `T${n}` }), NOON)
    expect(listFollowed(NOON).map((entry) => entry.trainNumber)).toEqual([
      'T1',
      'T2',
      'T3',
      'T4',
      'T5',
    ])
  })
})

describe('a hostile or broken store', () => {
  it('reads nothing from garbage, and keeps working', () => {
    window.localStorage.setItem('tabellone:followed-trains', '{not json')
    expect(listFollowed(NOON)).toEqual([])
    window.localStorage.setItem('tabellone:followed-trains', '{"a":1}')
    expect(listFollowed(NOON)).toEqual([])
    expect(toggleFollowed(train(), NOON)).toBe(true)
  })

  it('skips malformed entries but keeps the good ones', () => {
    window.localStorage.setItem(
      'tabellone:followed-trains',
      JSON.stringify([{ slug: 1 }, train(), null, train({ mode: 'sideways' as never })]),
    )
    expect(listFollowed(NOON)).toHaveLength(1)
  })
})

describe('unfollow', () => {
  it('removes by key and leaves the rest', () => {
    toggleFollowed(train(), NOON)
    toggleFollowed(train({ trainNumber: '2345' }), NOON)
    unfollow(followKey(train()), NOON)
    expect(listFollowed(NOON).map((entry) => entry.trainNumber)).toEqual(['2345'])
  })
})

describe('syncExpectedTimes', () => {
  const row = (over: Partial<BoardRow>): BoardRow =>
    ({
      trainNumber: '9612',
      scheduledTime: at('14:32'),
      delayMinutes: 20,
      ...over,
    }) as BoardRow

  it('remembers when a late train is really due, so it outlives its timetable time', () => {
    toggleFollowed(train(), NOON)
    syncExpectedTimes('milano-centrale', 'departures', [row({})], NOON)
    const [entry] = listFollowed(NOON)
    expect(Date.parse(entry?.expectedAt ?? '')).toBe(Date.parse(at('14:52')))
    // 3 h after 14:32 would be 17:32; after the expected 14:52 it is 17:52.
    expect(listFollowed(new Date(at('17:40')))).toHaveLength(1)
  })

  it('ignores another station, mode or train, and an on-time one', () => {
    toggleFollowed(train(), NOON)
    syncExpectedTimes('roma-termini', 'departures', [row({})], NOON)
    syncExpectedTimes('milano-centrale', 'arrivals', [row({})], NOON)
    syncExpectedTimes('milano-centrale', 'departures', [row({ trainNumber: '1' })], NOON)
    syncExpectedTimes('milano-centrale', 'departures', [row({ delayMinutes: null })], NOON)
    expect(listFollowed(NOON)[0]?.expectedAt).toBeUndefined()
  })
})

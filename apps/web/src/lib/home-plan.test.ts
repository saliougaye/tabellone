/** The home's read budget: ARCHITECTURE 7.2 says three boards per open, and this is where it holds. */
import { describe, expect, it } from 'vitest'
import { HOME_READ_BUDGET, planHomeReads } from './home-plan'

const followed = (slug: string, hhmm: string, mode: 'departures' | 'arrivals' = 'departures') => ({
  slug,
  mode,
  scheduledAt: `2026-11-18T${hhmm}:00+01:00`,
})

describe('planHomeReads', () => {
  it('with nothing followed, the cards read departures in their order, three at most', () => {
    const reads = planHomeReads([], ['a', 'b', 'c', 'd'])
    expect(reads).toEqual([
      { slug: 'a', mode: 'departures' },
      { slug: 'b', mode: 'departures' },
      { slug: 'c', mode: 'departures' },
    ])
  })

  it('puts the followed trains’ stations first, soonest train first', () => {
    const reads = planHomeReads([followed('late', '18:00'), followed('soon', '09:00')], ['a', 'b'])
    expect(reads.map((read) => read.slug)).toEqual(['soon', 'late', 'a'])
  })

  it('reads one board per station and mode, however many trains are followed there', () => {
    const reads = planHomeReads(
      [followed('mi', '09:00'), followed('mi', '09:30'), followed('mi', '10:00')],
      ['a', 'b', 'c'],
    )
    expect(reads.map((read) => read.slug)).toEqual(['mi', 'a', 'b'])
  })

  it('reads arrivals for a train followed on an arrivals board', () => {
    const reads = planHomeReads([followed('mi', '09:00', 'arrivals')], [])
    expect(reads).toEqual([{ slug: 'mi', mode: 'arrivals' }])
  })

  it('shares the read when a card is the station of a followed departure', () => {
    const reads = planHomeReads([followed('mi', '09:00')], ['mi', 'a', 'b'])
    expect(reads.map((read) => `${read.slug}:${read.mode}`)).toEqual([
      'mi:departures',
      'a:departures',
      'b:departures',
    ])
  })

  it('does not share across modes: a followed arrival and the departures card are two reads', () => {
    const reads = planHomeReads([followed('mi', '09:00', 'arrivals')], ['mi', 'a'])
    expect(reads.map((read) => `${read.slug}:${read.mode}`)).toEqual([
      'mi:arrivals',
      'mi:departures',
      'a:departures',
    ])
  })

  it('never exceeds the budget, even when followed stations alone overflow it', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((slug, i) => followed(slug, `0${i + 1}:00`))
    const reads = planHomeReads(many, ['x'])
    expect(reads).toHaveLength(HOME_READ_BUDGET)
    expect(reads.map((read) => read.slug)).toEqual(['a', 'b', 'c'])
  })
})

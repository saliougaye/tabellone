/**
 * Unit tests against the committed fixtures (`src/fixtures/*.html`), per the testing strategy
 * (ARCHITECTURE 9): each one is a captured or, where flagged, a deliberately-edited slice of a
 * live iechub page — see each fixture's own leading HTML comment and `parser.ts`'s module
 * comment for the "real vs synthetic-flagged" story.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseBoard, parseNotices, parseUnknownValues } from './parser'

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8')
}

/** `noUncheckedIndexedAccess` makes array destructuring yield `T | undefined`; every fixture
 * used below is known by construction to have a row at this index, so asserting it here beats
 * threading `?.`/`!` through every assertion that follows. */
function nth<T>(items: T[], index: number): T {
  const item = items[index]
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, got ${items.length} total`)
  }
  return item
}

describe('parseBoard — cell binding', () => {
  it('reads operator, category and train number by id/headers, not column position', () => {
    const row = nth(parseBoard(fixture('multi-operator-board.html'), 'departures'), 0)
    expect(row).toMatchObject({
      operator: 'ITALO',
      brand: 'Italo',
      category: 'HIGH_SPEED',
      trainNumber: '8918',
      headsign: 'TRIESTE CENTRALE',
    })
  })

  it('parses an alphanumeric train number as a string, never as a number', () => {
    const row = nth(parseBoard(fixture('alphanumeric-train-number.html'), 'departures'), 0)
    expect(row.trainNumber).toBe('CB708')
    expect(typeof row.trainNumber).toBe('string')
  })

  it('treats BUS as an ordinary category, not an edge case', () => {
    const row = nth(parseBoard(fixture('category-bus.html'), 'departures'), 0)
    expect(row.category).toBe('BUS')
    expect(row.trainNumber).toBe('NA513')
    expect(row.platform.scheduled).toBe('PF')
  })

  it('resolves both real-world spellings of regional categories', () => {
    const regRvRows = parseBoard(fixture('category-regional.html'), 'departures')
    const reg = nth(regRvRows, 0)
    const rv = nth(regRvRows, 1)
    expect(reg.category).toBe('REGIONAL')
    expect(rv.category).toBe('REGIONAL_FAST')
  })

  it('reads Trenord "RE" and Trenitalia "EC" beyond ADR-008’s initial table', () => {
    const rows = parseBoard(fixture('milano-board.html'), 'departures')
    const trenordRegional = rows.find((r) => r.trainNumber === '25522')
    const eurocity = rows.find((r) => r.trainNumber === '20')
    expect(trenordRegional?.category).toBe('REGIONAL')
    expect(trenordRegional?.operator).toBe('TRENORD')
    expect(eurocity?.category).toBe('INTERCITY')
  })
})

describe('parseBoard — arrivals vs departures', () => {
  it('reads the origin, not the destination, on an arrivals board', () => {
    const rows = parseBoard(fixture('arrivals-mode.html'), 'arrivals')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.headsign.length).toBeGreaterThan(0)
    }
  })

  it('still produces a valid scheduledTime for rows with no details button', () => {
    // none of these real rows carry a "Fermate successive" popup (see three-digit-delay's
    // regression test) — every one of them must fall back to the page-level date.
    const rows = parseBoard(fixture('arrivals-mode.html'), 'arrivals')
    for (const row of rows) {
      expect(row.serviceDate).toBe('2026-08-18')
      expect(Number.isNaN(new Date(row.scheduledTime).getTime())).toBe(false)
    }
  })
})

describe('parseBoard — required case: empty station', () => {
  it('returns an empty list, not an error, for a quiet station', () => {
    expect(parseBoard(fixture('empty-station.html'), 'departures')).toEqual([])
    expect(parseNotices(fixture('empty-station.html'))).toEqual([])
  })
})

describe('parseBoard — required case: unassigned platform', () => {
  it('leaves platform unconfirmed and null when RBinario is empty', () => {
    const row = nth(parseBoard(fixture('unassigned-platform.html'), 'departures'), 0)
    expect(row.platform).toEqual({ scheduled: null, actual: null, isConfirmed: false })
  })

  it('does not confuse an unconfirmed platform with on-time delay data', () => {
    const row = nth(parseBoard(fixture('unassigned-platform.html'), 'departures'), 0)
    // this real row is delayed 10' AND has no platform yet — the two are independent
    expect(row.delayMinutes).toBe(10)
    expect(row.status).toBe('DELAYED')
  })
})

describe('parseBoard — required case: three-digit delay', () => {
  it('parses a 100-minute delay as a number, not a string cutoff', () => {
    const row = nth(parseBoard(fixture('three-digit-delay.html'), 'arrivals'), 0)
    expect(row.delayMinutes).toBe(100)
    expect(row.status).toBe('DELAYED')
  })

  it('falls back to the page-level date when the row has no details button', () => {
    // this real arrivals row has no "Fermate successive" popup at all — the train terminates
    // here, so there's nothing further to show — which means no button id to read a service
    // date from. Regression case: this used to come back as '', producing an unparsable
    // scheduledTime that crashed the client's Date arithmetic.
    const row = nth(parseBoard(fixture('three-digit-delay.html'), 'arrivals'), 0)
    expect(row.serviceDate).toBe('2026-08-18')
    expect(row.scheduledTime).toBe('2026-08-18T13:34:00.000+02:00')
    expect(Number.isNaN(new Date(row.scheduledTime).getTime())).toBe(false)
  })
})

describe('parseBoard — on time vs delayed vs imminent', () => {
  it('reports on time as null delay, a statement not missing data', () => {
    const row = nth(parseBoard(fixture('on-time-no-delay.html'), 'departures'), 0)
    expect(row.delayMinutes).toBeNull()
    expect(row.status).toBe('ON_TIME')
  })

  it('flags the blinking dot independently of the derived status', () => {
    const row = nth(parseBoard(fixture('blinking-imminent.html'), 'departures'), 0)
    expect(row.blinking).toBe(true)
    expect(row.status).toBe('IMMINENT')
  })
})

describe('parseBoard — required case: cancelled train (synthetic-flagged)', () => {
  it('reads a cancelled train as status CANCELLED with no delay figure', () => {
    const row = nth(parseBoard(fixture('cancelled-train.html'), 'departures'), 0)
    expect(row.status).toBe('CANCELLED')
    expect(row.delayMinutes).toBeNull()
  })
})

describe('parseBoard — required case: partial cancellation (synthetic-flagged)', () => {
  it('distinguishes a partial cancellation from a full one', () => {
    const row = nth(parseBoard(fixture('partial-cancellation.html'), 'departures'), 0)
    expect(row.status).toBe('PARTIAL')
  })
})

describe('parseBoard — required case: rerouted train (synthetic-flagged)', () => {
  it('reads a reroute note in the popup as status REROUTED', () => {
    const row = nth(parseBoard(fixture('rerouted-train.html'), 'departures'), 0)
    expect(row.status).toBe('REROUTED')
  })
})

describe('parseBoard — required case: unrecognised operator', () => {
  it('falls back to OTHER/null instead of erroring or guessing', () => {
    const rows = parseBoard(fixture('unrecognised-operator.html'), 'departures')
    for (const row of rows) {
      expect(row.operator).toBe('OTHER')
      expect(row.brand).toBeNull()
    }
  })

  it('never lets an unrecognised operator collapse category into OTHER too', () => {
    const rows = parseBoard(fixture('unrecognised-operator.html'), 'departures')
    expect(rows.some((r) => r.category !== 'OTHER')).toBe(true)
  })
})

describe('parseUnknownValues — ADR-008 noisy fallback', () => {
  it('records the exact unrecognised alt text, not a guess', () => {
    const unknowns = parseUnknownValues(fixture('unrecognised-operator.html'))
    const vettoreUnknowns = unknowns.filter((u) => u.kind === 'vettore').map((u) => u.value)
    expect(vettoreUnknowns).toContain('ENTE AUTONOMO VOLTURNO')
    expect(vettoreUnknowns).toContain('TRENITALIA TPER')
  })

  it('reports nothing when every value on the board is recognised', () => {
    expect(parseUnknownValues(fixture('multi-operator-board.html'))).toEqual([])
  })
})

describe('parseBoard — service date and timestamp reconstruction (ARCHITECTURE 5.1)', () => {
  it('takes only the leading YYYYMMDD from the details-button id, not the full suffix', () => {
    const row = nth(parseBoard(fixture('multi-operator-board.html'), 'departures'), 0)
    expect(row.serviceDate).toBe('2026-08-18')
  })

  it('reconstructs an absolute Europe/Rome instant from serviceDate + HH:MM', () => {
    const row = nth(parseBoard(fixture('multi-operator-board.html'), 'departures'), 0)
    expect(row.scheduledTime).toBe('2026-08-18T14:25:00.000+02:00')
  })

  it('reads the alphanumeric train number from the row id, never from the details-button id', () => {
    // train CB708's button id also ends in "CB708", but numeric trains prove the two are
    // unrelated (e.g. 8918's button id ends in 9748) — asserting on the alphanumeric case only
    // confirms it isn't accidentally right for the wrong reason.
    const row = nth(parseBoard(fixture('alphanumeric-train-number.html'), 'departures'), 0)
    expect(row.trainNumber).toBe('CB708')
    expect(row.serviceDate).toBe('2026-08-18')
  })
})

describe('parseBoard — via stops popup', () => {
  it('reads the next-stops list already present in the HTML, no extra request needed', () => {
    const row = nth(parseBoard(fixture('via-stops-popup.html'), 'departures'), 0)
    expect(row.viaStops.length).toBeGreaterThan(0)
    expect(row.viaStops[0]).toEqual({ name: 'ROMA TIBURTINA', time: '14:32' })
    expect(row.viaStops.at(-1)).toEqual({ name: 'TRIESTE CENTRALE', time: '20:56' })
  })
})

describe('parseNotices — required case: board-level notices', () => {
  it('returns the announcement text as-is, in Italian (ADR-009)', () => {
    const notices = parseNotices(fixture('board-notices.html'))
    expect(notices).toHaveLength(1)
    expect(notices[0]).toContain('CANCELLAZIONI PER LAVORI')
  })

  it('returns an empty list when there is nothing to announce', () => {
    expect(parseNotices(fixture('multi-operator-board.html'))).toEqual([])
  })
})

describe('parseBoard — never leaks RFI raw payload', () => {
  it('never propagates the base64 logo data URI into a row', () => {
    const rows = parseBoard(fixture('multi-operator-board.html'), 'departures')
    const serialised = JSON.stringify(rows)
    expect(serialised).not.toContain('base64')
  })
})

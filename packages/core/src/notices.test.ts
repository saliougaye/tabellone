/**
 * `notices` is a pure function over RFI's real notice text. The first four strings below are
 * copied from live boards (Nov 2026); everything after them is a case the live text has not
 * produced yet but the reader must survive.
 */
import { describe, expect, it } from 'vitest'
import { readNotice, readNotices } from './notices'

const STRIKE_BILINGUAL =
  'DALLE ORE 21.00  DEL 20 NOVEMBRE ALLE ORE 20.00  DEL 21 NOVEMBRE  I TRENI POTRANNO SUBIRE RITARDI O VARIAZIONI PER UNO SCIOPERO  DEL PERSONALE DEL GRUPPO FS ITALIANE, ITALO E  TRENORD  / FROM 21.00  ON NOVEMBER 20 TO 20.00   ON NOVEMBER 21,  TRAINS COULD BE DELAYED OR CHANGED DUE TO A   STRIKE BY GRUPPO FS ITALIANE, ITALO  AND TRENORD.'
const STRIKE_NATIONAL_COLON =
  'DALLE ORE 21:00 DEL 20 NOVEMBRE  ALLE ORE 20:00 DEL 21 NOVEMBRE,  TRENI CON POSSIBILI RITARDI O VARIAZIONI  PER SCIOPERO NAZIONALE DEL PERSONALE DEL GRUPPO FS ITALIANE, ITALO E TRENORD. INFO SUI CANALI WEB E IN STAZIONE.'
const STRIKE_NO_ORE =
  'DALLE 21:00 DEL 20 NOVEMBRE ALLE 20:00 DEL 21 NOVEMBRE, I TRENI POTRANNO SUBIRE RITARDI O VARIAZIONI PER UNO SCIOPERO NAZIONALE DEL PERSONALE DEL GRUPPO FS ITALIANE, ITALO E TRENORD. INFO SUI CANALI WEB E IN STAZIONE'
const WORKS =
  'PER LAVORI DI POTENZIAMENTO INFRASTRUTTURALE, DAL 23 NOVEMBRE AL 7 DICEMBRE I TRENI REGIONALI DELLA LINEA MILANO - TREVIGLIO POTRANNO SUBIRE VARIAZIONI DI ORARIO.'

const NOW = new Date('2026-11-17T12:00:00+01:00')

function strike(notice: ReturnType<typeof readNotice>) {
  if (notice.kind !== 'strike') throw new Error(`expected a strike, got ${JSON.stringify(notice)}`)
  return notice
}

describe('readNotice — the real strike notices', () => {
  it('reads the bilingual one: window in Rome, English copy dropped, not national', () => {
    const notice = strike(readNotice(STRIKE_BILINGUAL, NOW))
    expect(notice.from).toBe('2026-11-20T21:00:00.000+01:00')
    expect(notice.to).toBe('2026-11-21T20:00:00.000+01:00')
    expect(notice.national).toBe(false)
    expect(notice.who).toBe('Gruppo FS Italiane, Italo e Trenord')
    expect(notice.text).not.toMatch(/november|strike by/i)
    expect(notice.text).toMatch(/^Dalle ore 21\.00 del 20 novembre/)
  })

  it('reads the "ORE 21:00" spelling, national, and stops who at the info sentence', () => {
    const notice = strike(readNotice(STRIKE_NATIONAL_COLON, NOW))
    expect(notice.from).toBe('2026-11-20T21:00:00.000+01:00')
    expect(notice.to).toBe('2026-11-21T20:00:00.000+01:00')
    expect(notice.national).toBe(true)
    expect(notice.who).toBe('Gruppo FS Italiane, Italo e Trenord')
  })

  it('reads the "DALLE 21:00" spelling without a trailing full stop', () => {
    const notice = strike(readNotice(STRIKE_NO_ORE, NOW))
    expect(notice.from).toBe('2026-11-20T21:00:00.000+01:00')
    expect(notice.to).toBe('2026-11-21T20:00:00.000+01:00')
    expect(notice.national).toBe(true)
    expect(notice.who).toBe('Gruppo FS Italiane, Italo e Trenord')
  })

  it('leaves a works notice as info, sentence-cased', () => {
    expect(readNotice(WORKS, NOW)).toEqual({
      kind: 'info',
      text: 'Per lavori di potenziamento infrastrutturale, dal 23 novembre al 7 dicembre i treni regionali della linea Milano - Treviglio potranno subire variazioni di orario.',
    })
  })
})

describe('readNotice — time arithmetic is Europe/Rome, not the host zone', () => {
  it('gives the same instants whatever zone `now` is expressed in', () => {
    const a = strike(readNotice(STRIKE_NO_ORE, new Date('2026-11-17T11:00:00Z')))
    const b = strike(readNotice(STRIKE_NO_ORE, new Date('2026-11-17T23:30:00-08:00')))
    expect(a.from).toBe(b.from)
    expect(a.to).toBe(b.to)
  })

  it('uses the summer offset after the spring transition', () => {
    const text =
      'DALLE ORE 21.00 DEL 3 APRILE ALLE ORE 21.00 DEL 4 APRILE SCIOPERO NAZIONALE DEL PERSONALE FS'
    const notice = strike(readNotice(text, new Date('2026-03-30T10:00:00+02:00')))
    expect(notice.from).toBe('2026-04-03T21:00:00.000+02:00')
    expect(notice.to).toBe('2026-04-04T21:00:00.000+02:00')
  })

  it('spans the spring-forward night: 02:30 does not exist and moves forward an hour', () => {
    // Italy, 2026: clocks go from 02:00 to 03:00 on 29 March.
    const text =
      'DALLE ORE 22.00 DEL 28 MARZO ALLE ORE 02.30 DEL 29 MARZO SCIOPERO DEL PERSONALE FS'
    const notice = strike(readNotice(text, new Date('2026-03-25T10:00:00+01:00')))
    expect(notice.from).toBe('2026-03-28T22:00:00.000+01:00')
    expect(notice.to).toBe('2026-03-29T03:30:00.000+02:00')
  })

  it('spans the fall-back night: 02:30 exists twice and the earlier one is taken', () => {
    // Italy, 2026: clocks go from 03:00 back to 02:00 on 25 October.
    const text =
      'DALLE ORE 22.00 DEL 24 OTTOBRE ALLE ORE 02.30 DEL 25 OTTOBRE SCIOPERO DEL PERSONALE FS'
    const notice = strike(readNotice(text, new Date('2026-10-20T10:00:00+02:00')))
    expect(notice.from).toBe('2026-10-24T22:00:00.000+02:00')
    expect(notice.to).toBe('2026-10-25T02:30:00.000+02:00')
  })
})

describe('readNotice — the year the text does not carry', () => {
  it('ends a window that crosses New Year’s Eve in the year after it started', () => {
    const text =
      'DALLE ORE 21.00 DEL 31 DICEMBRE ALLE ORE 21.00 DEL 1 GENNAIO SCIOPERO DEL PERSONALE FS'
    const notice = strike(readNotice(text, new Date('2026-12-28T10:00:00+01:00')))
    expect(notice.from).toBe('2026-12-31T21:00:00.000+01:00')
    expect(notice.to).toBe('2027-01-01T21:00:00.000+01:00')
  })

  it('puts a January strike announced in December in the next year', () => {
    const text =
      'DALLE ORE 09.00 DEL 12 GENNAIO ALLE ORE 17.00 DEL 12 GENNAIO SCIOPERO DEL PERSONALE FS'
    const notice = strike(readNotice(text, new Date('2026-12-28T10:00:00+01:00')))
    expect(notice.from).toBe('2027-01-12T09:00:00.000+01:00')
  })

  it('keeps a December strike that has just ended in the year it happened', () => {
    const text =
      'DALLE ORE 21.00 DEL 30 DICEMBRE ALLE ORE 21.00 DEL 31 DICEMBRE SCIOPERO DEL PERSONALE FS'
    const notice = strike(readNotice(text, new Date('2027-01-02T10:00:00+01:00')))
    expect(notice.from).toBe('2026-12-30T21:00:00.000+01:00')
    expect(notice.to).toBe('2026-12-31T21:00:00.000+01:00')
  })
})

describe('readNotice — other window shapes and degradation', () => {
  it('reads a one-day window ("dalle … alle … del 20 novembre")', () => {
    const text =
      'DALLE ORE 09.00 ALLE ORE 17.00 DEL 20 NOVEMBRE SCIOPERO REGIONALE DEL PERSONALE TRENORD.'
    const notice = strike(readNotice(text, NOW))
    expect(notice.from).toBe('2026-11-20T09:00:00.000+01:00')
    expect(notice.to).toBe('2026-11-20T17:00:00.000+01:00')
    expect(notice.national).toBe(false)
    expect(notice.who).toBe('Trenord')
  })

  it('reads "ore 24.00" as midnight at the end of the day', () => {
    const text =
      'DALLE ORE 21.00 DEL 20 NOVEMBRE ALLE ORE 24.00 DEL 20 NOVEMBRE SCIOPERO DEL PERSONALE FS'
    expect(strike(readNotice(text, NOW)).to).toBe('2026-11-21T00:00:00.000+01:00')
  })

  it('degrades to info, without throwing, when the strike has no window', () => {
    const text = 'POSSIBILI RITARDI PER SCIOPERO DEL PERSONALE FS. INFO IN STAZIONE.'
    const notice = readNotice(text, NOW)
    expect(notice.kind).toBe('info')
    expect(notice.text).toBe('Possibili ritardi per sciopero del personale FS. Info in stazione.')
  })

  it('degrades to info when the date does not exist', () => {
    const text =
      'DALLE ORE 21.00 DEL 31 NOVEMBRE ALLE ORE 20.00 DEL 1 DICEMBRE SCIOPERO DEL PERSONALE FS'
    expect(readNotice(text, NOW).kind).toBe('info')
  })

  it('degrades to info when the month is not a month', () => {
    const text =
      'DALLE ORE 21.00 DEL 20 NOVEMBREX ALLE ORE 20.00 DEL 21 NOVEMBRE SCIOPERO DEL PERSONALE FS'
    expect(readNotice(text, NOW).kind).toBe('info')
  })

  it('degrades to info on an impossible hour', () => {
    const text =
      'DALLE ORE 25.00 DEL 20 NOVEMBRE ALLE ORE 20.00 DEL 21 NOVEMBRE SCIOPERO DEL PERSONALE FS'
    expect(readNotice(text, NOW).kind).toBe('info')
  })

  it('never throws on empty or strange input', () => {
    for (const text of ['', '   ', '/', ' / THE', 'SCIOPERO', 'SCIOPERO DALLE ALLE DEL']) {
      expect(() => readNotice(text, NOW)).not.toThrow()
    }
    expect(readNotice('', NOW)).toEqual({ kind: 'info', text: '' })
  })
})

describe('readNotices', () => {
  it('keeps one strike per window and every info notice', () => {
    const notices = readNotices(
      [STRIKE_BILINGUAL, WORKS, STRIKE_NATIONAL_COLON, STRIKE_NO_ORE],
      NOW,
    )
    expect(notices.map((n) => n.kind)).toEqual(['strike', 'info'])
    expect(strike(notices[0] as never).national).toBe(false)
  })

  it('returns nothing for a board with no notices', () => {
    expect(readNotices([], NOW)).toEqual([])
  })
})

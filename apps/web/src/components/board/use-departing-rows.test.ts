import type { TrainStatus } from '@tabellone/core'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseExitDuration, rowExitClass, useDepartingRows } from './use-departing-rows'

/** Stands in for a `BoardRow`: the hook is generic and only ever calls `keyFn`. */
type Row = { id: string; status: TrainStatus }

const keyFn = (row: Row) => row.id
const row = (id: string, status: TrainStatus = 'ON_TIME'): Row => ({ id, status })

/** No stylesheet is loaded in jsdom, so `--duration-exit` is unreadable and the hook falls
 *  back to 320ms — the value the token holds. */
const EXIT_MS = 320

afterEach(cleanup)

describe('parseExitDuration', () => {
  it('reads the token in both CSS time units', () => {
    expect(parseExitDuration('320ms')).toBe(320)
    expect(parseExitDuration(' 0.32s ')).toBe(320)
  })

  it('falls back to the token value when nothing can be read', () => {
    expect(parseExitDuration('')).toBe(320)
  })

  it('never drops below the commit floor, so reduced motion still renders one frame', () => {
    expect(parseExitDuration('1ms')).toBe(50)
  })
})

describe('rowExitClass', () => {
  it('sends a cancelled train out by the cancelled exit and everything else by departed', () => {
    expect(rowExitClass({ status: 'CANCELLED' })).toBe('animate-exit-cancelled')
    expect(rowExitClass({ status: 'DELAYED' })).toBe('animate-exit-departed')
    expect(rowExitClass({ status: 'IMMINENT' })).toBe('animate-exit-departed')
  })
})

describe('useDepartingRows', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes an unchanged list straight through as idle', () => {
    const rows = [row('a'), row('b')]
    const { result } = renderHook(() => useDepartingRows(rows, keyFn))
    expect(result.current.map((entry) => [entry.key, entry.phase])).toEqual([
      ['a', 'idle'],
      ['b', 'idle'],
    ])
  })

  it('does not treat a fresh array of the same keys as a change', () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('a'), row('b')] } },
    )
    // What the board really does on every render: slice `board.rows` again.
    rerender({ rows: [row('a'), row('b')] })
    expect(result.current.every((entry) => entry.phase === 'idle')).toBe(true)
  })

  it('always hands back the incoming row object, so a delay update is never held back', () => {
    const updated = row('a', 'DELAYED')
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('a')] } },
    )
    rerender({ rows: [updated] })
    expect(result.current.at(0)?.row).toBe(updated)
  })

  it('holds a vanished row as leaving, in the gap it left, then drops it', () => {
    const departing = row('a', 'CANCELLED')
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('x'), departing, row('b')] } },
    )

    rerender({ rows: [row('x'), row('b')] })
    expect(result.current.map((entry) => [entry.key, entry.phase])).toEqual([
      ['x', 'idle'],
      ['a', 'leaving'],
      ['b', 'idle'],
    ])
    // The snapshot survives the row leaving the data: it is what picks the exit variant.
    const held = result.current.at(1)
    if (!held) throw new Error('expected the departed row to still be held')
    expect(held.row).toBe(departing)
    expect(rowExitClass({ status: held.row.status })).toBe('animate-exit-cancelled')

    act(() => {
      vi.advanceTimersByTime(EXIT_MS)
    })
    expect(result.current.map((entry) => entry.key)).toEqual(['x', 'b'])
  })

  it('keeps a row that left from the head of the list at the head', () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('a'), row('b')] } },
    )
    rerender({ rows: [row('b')] })
    expect(result.current.map((entry) => [entry.key, entry.phase])).toEqual([
      ['a', 'leaving'],
      ['b', 'idle'],
    ])
  })

  it('treats a row that comes back before its timeout as still idle, with no ghost left', () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('a'), row('b')] } },
    )

    rerender({ rows: [row('b')] })
    act(() => {
      vi.advanceTimersByTime(EXIT_MS / 2)
    })
    rerender({ rows: [row('a'), row('b')] })

    expect(result.current.map((entry) => [entry.key, entry.phase])).toEqual([
      ['a', 'idle'],
      ['b', 'idle'],
    ])

    // The cancelled timer must not fire and take the live row with it.
    act(() => {
      vi.advanceTimersByTime(EXIT_MS * 2)
    })
    expect(result.current.map((entry) => [entry.key, entry.phase])).toEqual([
      ['a', 'idle'],
      ['b', 'idle'],
    ])
  })

  it('holds several departures at once and drops each on its own timer', () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('a'), row('b'), row('c')] } },
    )

    rerender({ rows: [row('b')] })
    expect(result.current.map((entry) => [entry.key, entry.phase])).toEqual([
      ['a', 'leaving'],
      ['b', 'idle'],
      ['c', 'leaving'],
    ])

    act(() => {
      vi.advanceTimersByTime(EXIT_MS)
    })
    expect(result.current.map((entry) => entry.key)).toEqual(['b'])
  })

  it('empties completely when the whole board is replaced', () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: Row[] }) => useDepartingRows(rows, keyFn),
      { initialProps: { rows: [row('a')] } },
    )
    rerender({ rows: [] })
    act(() => {
      vi.advanceTimersByTime(EXIT_MS)
    })
    expect(result.current).toEqual([])
  })
})

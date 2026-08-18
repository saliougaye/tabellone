import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useRolledValue } from './use-rolled-value'

afterEach(cleanup)

function rolled(initial: number | null) {
  return renderHook(({ delay }: { delay: number | null }) => useRolledValue(delay), {
    initialProps: { delay: initial },
  })
}

describe('useRolledValue', () => {
  it('does not roll on first render: there is no previous value to have moved from', () => {
    const { result } = rolled(5)
    expect(result.current.className).toBe('')
  })

  it('rolls up when the delay grows', () => {
    const { result, rerender } = rolled(5)
    rerender({ delay: 12 })
    expect(result.current.className).toBe('animate-value-up')
  })

  it('rolls down when the delay shrinks', () => {
    const { result, rerender } = rolled(12)
    rerender({ delay: 5 })
    expect(result.current.className).toBe('animate-value-down')
  })

  it('rolls up when a delay appears where there was none', () => {
    const { result, rerender } = rolled(null)
    rerender({ delay: 3 })
    expect(result.current.className).toBe('animate-value-up')
  })

  it('rolls down when a delay is cleared', () => {
    const { result, rerender } = rolled(9)
    rerender({ delay: null })
    expect(result.current.className).toBe('animate-value-down')
  })

  it('does not roll for no change', () => {
    const { result, rerender } = rolled(7)
    rerender({ delay: 7 })
    expect(result.current.className).toBe('')
  })

  it('does not roll from null to null', () => {
    const { result, rerender } = rolled(null)
    rerender({ delay: null })
    expect(result.current.className).toBe('')
  })

  it('does not roll between null and zero: different values, same number of minutes', () => {
    const { result, rerender } = rolled(null)
    rerender({ delay: 0 })
    expect(result.current.className).toBe('')
  })

  it('keeps the direction across renders that do not change the delay', () => {
    const { result, rerender } = rolled(2)
    rerender({ delay: 8 })
    const key = result.current.key
    rerender({ delay: 8 })
    expect(result.current.className).toBe('animate-value-up')
    expect(result.current.key).toBe(key)
  })

  it('changes the key exactly when the delay changes', () => {
    const { result, rerender } = rolled(null)
    const first = result.current.key

    rerender({ delay: null })
    expect(result.current.key).toBe(first)

    rerender({ delay: 0 })
    const second = result.current.key
    expect(second).not.toBe(first)

    rerender({ delay: 0 })
    expect(result.current.key).toBe(second)

    rerender({ delay: 4 })
    expect(result.current.key).not.toBe(second)
  })
})

import { describe, expect, it } from 'vitest'
import { keys, TTL } from './store'

// The key schema is a contract with ARCHITECTURE 7.4: the board key abbreviates the mode
// to dep/arr, the lock key does not. Encoded as a test so a refactor cannot silently
// orphan every cached board.
describe('redis key schema', () => {
  it('builds board keys with the abbreviated mode', () => {
    expect(keys.board('123', 'departures')).toBe('board:123:dep')
    expect(keys.board('123', 'arrivals')).toBe('board:123:arr')
  })

  it('builds lock keys with the full mode', () => {
    expect(keys.lock('123', 'departures')).toBe('lock:123:departures')
    expect(keys.lock('123', 'arrivals')).toBe('lock:123:arrivals')
  })
})

describe('ttl policy', () => {
  it('orders the windows: fresh < stale-while-revalidate < key expiry', () => {
    expect(TTL.fresh).toBeLessThan(TTL.staleWhileRevalidate)
    expect(TTL.staleWhileRevalidate).toBeLessThan(TTL.key)
  })
})

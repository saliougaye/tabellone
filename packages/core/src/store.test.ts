import { describe, expect, it } from 'vitest'
import { TTL } from './store'

describe('ttl policy', () => {
  it('orders the windows: fresh < stale-while-revalidate < key expiry', () => {
    expect(TTL.fresh).toBeLessThan(TTL.staleWhileRevalidate)
    expect(TTL.staleWhileRevalidate).toBeLessThan(TTL.key)
  })
})

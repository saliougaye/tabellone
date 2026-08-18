/**
 * The concrete `BoardStore` (ARCHITECTURE 7.4). This file, and only this file, may build one
 * of the literal Redis key strings — `store.ts` calls the named methods above and never
 * touches a key or a raw Redis verb.
 */
import Redis from 'ioredis'
import { RFI_MAX_REQUESTS_PER_SECOND, TTL } from './store'
import type { BoardMode, BoardStore, StationBoard } from './types'

const keys = {
  /** `dep`/`arr` in the board key: the key schema abbreviates, the API does not. */
  board: (placeId: string, mode: BoardMode) =>
    `board:${placeId}:${mode === 'departures' ? 'dep' : 'arr'}`,
  lock: (placeId: string, mode: BoardMode) => `lock:${placeId}:${mode}`,
  healthRfi: 'health:rfi',
  unknown: (kind: 'vettore' | 'categoria' | 'status') => `unknown:${kind}`,
  /** One counter per wall-clock second, self-expiring — the token bucket towards RFI. */
  rateLimitWindow: (unixSecond: number) => `ratelimit:rfi:${unixSecond}`,
} as const

export function createRedisBoardStore(redisUrl: string): BoardStore {
  const client = new Redis(redisUrl)

  return {
    async getBoard(placeId, mode) {
      const raw = await client.get(keys.board(placeId, mode))
      return raw ? (JSON.parse(raw) as StationBoard) : null
    },

    async saveBoard(placeId, mode, board) {
      await client.set(keys.board(placeId, mode), JSON.stringify(board), 'EX', TTL.key)
    },

    async acquireBoardLock(placeId, mode) {
      const result = await client.set(keys.lock(placeId, mode), '1', 'EX', TTL.lock, 'NX')
      return result === 'OK'
    },

    async releaseBoardLock(placeId, mode) {
      await client.del(keys.lock(placeId, mode))
    },

    async logHealthOutcome(outcome) {
      const entry = JSON.stringify({ ...outcome, at: new Date().toISOString() })
      await client.lpush(keys.healthRfi, entry)
      await client.ltrim(keys.healthRfi, 0, 99)
    },

    async recordUnknown(kind, value) {
      await client.sadd(keys.unknown(kind), value)
    },

    async checkRateLimit() {
      const windowKey = keys.rateLimitWindow(Math.floor(Date.now() / 1000))
      const count = await client.incr(windowKey)
      if (count === 1) {
        await client.expire(windowKey, 2)
      }
      return count <= RFI_MAX_REQUESTS_PER_SECOND
    },
  }
}

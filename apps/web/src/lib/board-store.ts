/**
 * Singleton Redis-backed `BoardStore`, built once per server process (ARCHITECTURE 7).
 * `packages/core` owns the key schema and the client; this file only supplies the URL.
 */
import { createRedisBoardStore } from '@tabellone/core'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL is not set — copy .env.example to apps/web/.env.local')
}

export const boardStore = createRedisBoardStore(redisUrl)

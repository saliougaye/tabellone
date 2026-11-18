import { describe, expect, it } from 'vitest'
import { boardTrust } from './presentation'

const NOW = new Date('2026-11-18T12:00:00Z')
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString()
const online = { online: true, pollFailed: false }

describe('boardTrust', () => {
  it('is live for a fresh board', () => {
    expect(boardTrust({ generatedAt: ago(10), isStale: false }, online, NOW)?.kind).toBe('live')
  })

  it('goes stale when the server says so, when the poll failed, or after two minutes', () => {
    expect(boardTrust({ generatedAt: ago(10), isStale: true }, online, NOW)?.kind).toBe('stale')
    expect(
      boardTrust({ generatedAt: ago(10), isStale: false }, { online: true, pollFailed: true }, NOW)
        ?.kind,
    ).toBe('stale')
    expect(boardTrust({ generatedAt: ago(119), isStale: false }, online, NOW)?.kind).toBe('live')
    expect(boardTrust({ generatedAt: ago(240), isStale: false }, online, NOW)).toEqual({
      kind: 'stale',
      minutes: 4,
    })
  })

  it('offline wins over everything, with or without a board', () => {
    const offline = { online: false, pollFailed: false }
    expect(boardTrust({ generatedAt: ago(10), isStale: false }, offline, NOW)?.kind).toBe('offline')
    expect(boardTrust(null, offline, NOW)?.kind).toBe('offline')
  })

  it('has nothing to say without a board while online', () => {
    expect(boardTrust(null, online, NOW)).toBeNull()
  })
})

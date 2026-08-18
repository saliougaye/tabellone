/**
 * Thrown by every module that exists as a signature but not yet as behaviour.
 *
 * It is deliberately loud: a stub that returned an empty board would let the UI be built on
 * top of something that only looks like it works, and an empty board is a legitimate state in
 * this domain (ARCHITECTURE 2.2) — so silence here would be indistinguishable from night.
 */
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`)
    this.name = 'NotImplementedError'
  }
}

/**
 * The one case `readBoard` rejects on: RFI unreachable (or not implemented yet) and nothing
 * cached to fall back to. Maps 1:1 to the API's single non-200, 503 (ARCHITECTURE 6).
 */
export class BoardUnavailableError extends Error {
  constructor(placeId: string, mode: string) {
    super(`no board available for ${placeId} (${mode}): RFI unreachable and nothing cached`)
    this.name = 'BoardUnavailableError'
  }
}

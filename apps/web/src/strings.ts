/**
 * Every user-facing string, in one place (ADR-009). Italian is the only language in v1,
 * but copy that lives here instead of inline in components costs nothing now and makes a
 * future second language a data problem instead of a refactor.
 *
 * Identifiers in English, values in Italian — the naming rule from CONTEXT.md.
 */
export const strings = {
  appName: 'Tabellone',
  departures: 'Partenze',
  arrivals: 'Arrivi',
  /** Empty board at night is a normal state, not an error (ARCHITECTURE 2.2). */
  emptyBoard: 'Nessun treno in questo momento',
  fetchFailed: 'Dati non disponibili',
  staleData: (minutes: number) => `Dati di ${minutes} min fa`,
  scaffold: 'In costruzione',
} as const

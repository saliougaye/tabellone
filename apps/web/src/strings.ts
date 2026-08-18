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
  emptyBoardHint:
    'Di notte, o nelle stazioni piccole, un tabellone vuoto è normale. I treni compariranno qui appena programmati.',
  fetchFailed: 'Dati non disponibili',
  fetchFailedHint:
    'Il tabellone non riesce a leggere i dati della stazione. Riproviamo automaticamente ogni 20 secondi.',
  retry: 'Riprova ora',
  staleData: (minutes: number) => `Dati di ${minutes} min fa`,
  updatedNow: 'aggiornato ora',
  loading: 'Caricamento…',

  /* board header */
  currentStation: 'Stazione corrente',
  platform: 'Binario',
  platformShort: 'Bin',
  platformUnassigned: '—',
  nextDepartures: 'Prossime partenze',
  nextArrivals: 'Prossimi arrivi',
  later: 'Più tardi',
  listCount: (count: number) => `${count} in elenco`,
  stopsAt: 'Ferma a',
  terminusArrival: 'Arrivo',
  terminusDeparted: 'Partito alle',
  follow: 'Segui stazione',
  unfollow: 'Non seguire più',
  followed: 'seguita',
  notices: 'Avvisi',

  /* row states — our own vocabulary, never RFI's raw text */
  statusOnTime: 'In orario',
  statusDelay: (minutes: number) => `+${minutes} min`,
  statusCancelled: 'Cancellato',
  statusPartial: 'Cancellazione parziale',
  statusRerouted: 'Deviato',
  statusImminentDeparture: 'In partenza',
  statusImminentArrival: 'In arrivo',

  /* categories */
  categoryHighSpeed: 'Alta velocità',
  categoryIntercity: 'Intercity',
  categoryRegional: 'Regionale',
  categoryRegionalFast: 'Regionale veloce',
  categorySuburban: 'Suburbano',
  categoryBus: 'Bus',
  categoryOther: 'Treno',

  /* station picker */
  pickStation: 'Seleziona stazione',
  chooseStation: 'Scegli una stazione',
  chooseStationHint:
    'Il tabellone mostra partenze e arrivi in tempo reale della stazione che segui. Cercane una per iniziare.',
  searchStation: 'Cerca stazione',
  searchPlaceholder: 'Nome stazione o città',
  clearSearch: 'Azzera la ricerca',
  suggestedStations: 'Stazioni suggerite',
  recentStations: 'Stazioni recenti',
  favouriteStations: 'Preferite',
  allStations: 'Tutte le stazioni',
  searchResults: 'Risultati',
  stationCount: (count: number) => `${count} ${count === 1 ? 'stazione' : 'stazioni'}`,
  savedCount: (count: number) => `${count} salvate`,
  noResults: (query: string) => `Nessuna stazione per «${query}»`,
  noResultsHint:
    'Controlla il nome oppure cerca la città: molte stazioni sono elencate con il nome del capoluogo.',
  catalogueUnavailable: 'Catalogo non disponibile',
  catalogueUnavailableHint:
    'L’elenco delle stazioni non è raggiungibile in questo momento. Le stazioni salvate restano disponibili.',
  openBoard: 'Apre il tabellone',
  back: 'Indietro',
} as const

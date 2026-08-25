/**
 * Every user-facing string, in one place (ADR-009). Italian is the only language in v1,
 * but copy that lives here instead of inline in components costs nothing now and makes a
 * future second language a data problem instead of a refactor.
 *
 * Identifiers in English, values in Italian — the naming rule from CONTEXT.md.
 */
export const strings = {
  appName: 'Tabellone',
  /** The mark in the app header is a link home, and its accessible name says where. */
  appHome: 'Tabellone, torna alla scelta della stazione',
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
  /* offline is its own state, not a failed read: the request never left the device */
  offlineTitle: 'Sei offline',
  offlineHint: 'Nessuna connessione. Riprova quando la rete torna disponibile.',
  offlineBoardHint:
    'Senza connessione il tabellone non può leggere gli orari in tempo reale. Si aggiorna da solo appena la rete torna.',
  catalogueOffline: 'Sei offline',
  catalogueOfflineHint:
    'Senza connessione l\u2019elenco delle stazioni non è raggiungibile. Le stazioni salvate restano disponibili.',
  staleData: (minutes: number) => `Dati di ${minutes} min fa`,
  /** Stale but less than a minute old: "Dati di 0 min fa" says nothing true. */
  staleDataFresh: 'Dati non aggiornati',
  updatedNow: 'aggiornato ora',
  loading: 'Caricamento…',

  /* board header */
  platform: 'Binario',
  platformShort: 'Bin',
  /* Absence, spelled. The board used to print an em-dash here; a dash is a typographic
     mark standing in for a word, and at 48px in the platform box it reads as a decoration
     rather than as "we do not know yet". */
  platformUnassigned: 'n.d.',
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

  /* operators — spelled out only for the mark's accessible name; the board itself
     shows the sigla on the tile */
  operatorTrenitalia: 'Trenitalia',
  operatorItalo: 'Italo',
  operatorTrenord: 'Trenord',

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
  /* The A–Z list renders a bounded slice of a 2400-station catalogue: the rest are one
     search away, and 2400 anchors in the DOM are not. */
  resultsCapped: (shown: number, total: number) =>
    `Mostrate ${shown} stazioni su ${total}. Cerca per nome per trovare le altre.`,
  noResultsHint:
    'Controlla il nome oppure cerca la città: molte stazioni sono elencate con il nome del capoluogo.',
  catalogueUnavailable: 'Catalogo non disponibile',
  catalogueUnavailableHint:
    'L’elenco delle stazioni non è raggiungibile in questo momento. Le stazioni salvate restano disponibili.',
  openBoard: 'Apre il tabellone',
  back: 'Indietro',
  /* mobile bottom sheet on the board: the station name opens it instead of navigating */
  changeStation: 'Cambia stazione',
  closeSheet: 'Chiudi',
} as const

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
  /** The back link at the top left of a board. */
  backHome: 'Torna alla home',
  departures: 'Partenze',
  arrivals: 'Arrivi',
  retry: 'Riprova ora',
  /* offline is its own state, not a failed read: the request never left the device */
  offlineTitle: 'Sei offline',
  offlineHint: 'Nessuna connessione. Riprova quando la rete torna disponibile.',
  catalogueOffline: 'Sei offline',
  catalogueOfflineHint:
    'Senza connessione l\u2019elenco delle stazioni non è raggiungibile. Le stazioni salvate restano disponibili.',
  loading: 'Caricamento…',

  /* board header */
  platform: 'Binario',
  platformShort: 'Bin',
  nextDepartures: 'Prossime partenze',
  nextArrivals: 'Prossimi arrivi',
  later: 'Più tardi',

  follow: 'Segui stazione',
  unfollow: 'Non seguire più',
  followed: 'seguita',
  notices: 'Avvisi',

  /* row states — our own vocabulary, never RFI's raw text */
  statusOnTime: 'In orario',
  statusDelay: (minutes: number) => `+${minutes} min`,
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
  allStations: 'Tutte le stazioni',
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

  /* countdowns and platforms, shared by the tickets */
  inMinutes: (minutes: number) => `tra ${minutes} min`,
  platformToAssign: 'Da assegnare',
  operatorOther: 'Altri',

  /* board states · "can I trust what I see?" (ARCHITECTURE 4.1) */
  liveLabel: 'dal vivo',
  offlineLabel: 'offline',
  /** Stale but under a minute old: "dati di 0 min fa" says nothing true. */
  staleLabel: (minutes: number) => (minutes < 1 ? 'non aggiornati' : `dati di ${minutes} min fa`),
  staleStripTitle: (minutes: number) =>
    minutes < 1 ? 'Dati non aggiornati' : `Dati di ${minutes} min fa`,
  staleStripBody: 'RFI non risponde, riprovo ogni 20 s.',
  offlineStripTitle: 'Sei offline',
  offlineStripBody: (time: string) =>
    `dati delle ${time}. Binari e ritardi possono essere cambiati.`,
  loadingBoard: 'Carico il tabellone',
  slowRfi: 'RFI risponde lentamente: ancora qualche secondo.',
  /** Empty board at night is a normal state, not an error (ARCHITECTURE 2.2). */
  emptyDepartures: 'Nessuna partenza in questo momento',
  emptyArrivals: 'Nessun arrivo in questo momento',
  emptyHint: (station: string) =>
    `Di notte, o nelle stazioni piccole, è normale: i treni di ${station} compaiono qui appena RFI li programma.`,
  seeArrivals: 'Vedi gli arrivi',
  seeDepartures: 'Vedi le partenze',
  boardReadAt: (time: string) => `Tabellone letto alle ${time} \u00b7 si aggiorna da solo`,
  rfiDownTitle: 'RFI non risponde',
  rfiDownBody: (station: string) =>
    `Non riusciamo a leggere il tabellone di ${station}. La tua connessione funziona: \u00e8 il sito di RFI a non rispondere. Riproviamo da soli ogni 20 secondi.`,
  retryShort: 'Riprova',
  retrying: 'Riprovo\u2026',
  offlineCardTitle: 'Sei offline',
  offlineCardBody: (station: string) =>
    `Senza connessione non possiamo leggere il tabellone di ${station}. Si aggiorna da solo appena la rete torna.`,

  /* the seventh pass · tickets, the "Cerca prima" header, notices as tickets, the home cards */
  homeTitle: 'I tuoi prossimi treni',
  homeSearchPlaceholder: 'Cerca una stazione o una città',
  filterAll: 'Tutti',
  filterSearchAria: 'Cerca destinazione, fermata o numero di treno',
  filterSearchPlaceholder: 'Dove vai? Città, fermata, n°',
  operatorFilterAria: 'Filtra per operatore',
  modeAria: 'Partenze o arrivi',
  switchToArrivals: 'Passa agli arrivi',
  switchToDepartures: 'Passa alle partenze',
  clockAria: (time: string) => `Ora ${time}`,
  stationChangeAria: (name: string) => `${name}, cambia stazione`,
  /* tickets */
  withinThirtyMinutes: 'Entro 30 minuti',
  withinAnHour: 'Entro un\u2019ora',
  trainCount: (count: number) => `${count} ${count === 1 ? 'treno' : 'treni'}`,
  ticketSuppressed: 'Soppresso',
  /* RFI drops a train once it has left: one still listed after its time has not gone yet */
  ticketNowDeparting: 'in partenza',
  ticketNowArriving: 'in arrivo',
  ticketNight: 'Notte',
  inHoursShort: (hours: number, minutes: string) => `tra ${hours} h ${minutes}`,
  durationHours: (hours: number, minutes: string) => `${hours} h ${minutes}`,
  minutesShort: (minutes: number) => `${minutes} min`,
  hoursShort: (hours: number) => `${hours} h`,
  daysLong: (days: number) => `${days} giorni`,
  fromPlace: (name: string) => `da ${name}`,
  fromPlaceLead: 'da ',
  stopsAtVia: (name: string, time: string) => `Ferma a ${name} \u00b7 ${time}`,
  platformAria: (platform: string) => `Binario ${platform}`,
  platformToAssignLower: 'da assegnare',
  ticketAria: (
    service: string,
    number: string,
    departures: boolean,
    place: string,
    time: string,
    platform: string | null,
  ) =>
    `${service} ${number}, ${departures ? 'per' : 'da'} ${place}, ore ${time}, binario ${platform ?? 'da assegnare'}`,
  noTrainFor: (query: string) => `Nessun treno per \u201c${query}\u201d`,
  noTrainForHint: 'Prova con una citt\u00e0 o una fermata intermedia.',
  noTrainInCategory: 'Nessun treno per questo operatore',
  noTrainInCategoryHint: 'Nessun treno di questo operatore nelle prossime ore.',
  showAllShort: 'Mostra tutti',
  /* the opened ticket */
  stateHead: 'Stato',
  departsHead: 'Parte',
  arrivesHead: 'Arriva',
  stopsHead: (count: number) => `Fermate \u00b7 ${count}`,
  noStopsDepartures: 'RFI non elenca le fermate di questo treno.',
  noStopsArrivals: 'Per gli arrivi RFI non elenca le fermate precedenti.',
  /* following a train, and the train URL's sheet */
  followTrain: 'Segui questo treno',
  followingTrain: 'Seguito',
  followTrainToast: (number: string) => `Segui il ${number}: binario e ritardo restano in vista`,
  unfollowTrainToast: 'Non segui pi\u00f9 questo treno',
  yourTrains: 'I tuoi treni',
  followedAria: 'Treno seguito',
  trainLabel: (number: string) => `Treno ${number}`,
  trainGoneTitle: 'Non \u00e8 pi\u00f9 sul tabellone',
  trainGoneBody: (number: string, departures: boolean, station: string) =>
    `Il ${number} non compare pi\u00f9 fra ${departures ? 'le partenze' : 'gli arrivi'} di ${station}:${departures ? ' probabilmente \u00e8 gi\u00e0 partito,' : ' probabilmente \u00e8 gi\u00e0 arrivato,'} oppure oggi non \u00e8 pi\u00f9 previsto.`,
  seeAllDepartures: 'Vedi tutte le partenze',
  seeAllArrivals: 'Vedi tutti gli arrivi',
  share: 'Condividi',
  linkCopied: 'Link copiato',
  /* the station switcher */
  stationsHead: 'Stazioni',
  yourStations: 'Le tue stazioni',
  recentsHead: 'Recenti',
  hereTag: 'Qui',
  followHint: 'Aggiungila alle tue stazioni',
  followedHint: '\u00c8 tra le tue stazioni: la ritrovi in cima',
  followingLabel: 'Seguita',
  followAdd: 'Aggiungi',
  loadingCatalogue: 'Carico il catalogo\u2026',
  switcherEmptyHint: 'Scrivi il nome di una stazione o di una citt\u00e0.',
  /* notices */
  strikeSheetLabel: 'Avviso di sciopero',
  strike: 'Sciopero',
  strikeNational: 'Sciopero nazionale',
  strikeStart: 'Inizio',
  strikeEnd: 'Fine',
  strikeWhoLead: 'Sciopera il personale di',
  rfiNoticeText: 'Testo dell\u2019avviso RFI',
  today: 'oggi',
  tonight: 'stasera',
  tomorrow: 'domani',
  tomorrowCap: 'Domani',
  dayAt: (day: string, time: string) => `${day} alle ${time}`,
  inDays: (days: number) => `Tra ${days} giorni`,
  inWords: (span: string) => `Tra ${span}`,
  until: (when: string) => `Fino a ${when}`,
  strikeWindow: (fromDay: string, fromTime: string, toDay: string, toTime: string) =>
    `Da ${fromDay}, ${fromTime} a ${toDay}, ${toTime}`,
  strikeFrom: (when: string) => `Sciopero da ${when}`,
  strikeOngoingKicker: 'In corso',
  strikeOngoing: 'Sciopero in corso',
  strikeUntilEnds: (when: string, span: string) => `Fino a ${when} \u00b7 finisce tra ${span}`,
  strikeOverKicker: 'Finito',
  strikeOver: (time: string) => `Sciopero finito alle ${time}`,
  strikeOverHint: 'Possono restare ritardi sui treni in viaggio.',
  strikeStubUntil: 'fino alle',
  strikeImpactHere: 'Qui ora:',
  strikeNoImpact: 'Su questo tabellone, per ora, nessun ritardo.',
  strikeNoImpactTicket: 'Per ora nessun ritardo qui',
  strikeImpactTicket: (late: number, cancelled: number) =>
    `Qui ora: ${late} in ritardo${cancelled ? ` \u00b7 ${cancelled} soppressi` : ''}`,
  trainsLate: (count: number) => (count === 1 ? 'treno in ritardo' : 'treni in ritardo'),
  trainsSuppressed: (count: number) => (count === 1 ? 'soppresso' : 'soppressi'),
  /* the home */
  locate: 'Mostra la stazione pi\u00f9 vicina',
  locating: 'Cerco la stazione pi\u00f9 vicina\u2026',
  locatePrivacy: 'Usiamo la posizione solo su questo telefono, non la salviamo.',
  nothingNear: 'Nessuna stazione nota entro 30 km: qui sotto le tue.',
  nearYou: (distance: string) => `Vicino a te \u00b7 ${distance}`,
  bigStations: 'Grandi stazioni',
  bigStation: (city?: string) => `Grande stazione${city ? ` \u00b7 ${city}` : ''}`,
  savedTag: (favourite: boolean, city?: string) =>
    `${favourite ? 'Preferita' : 'Recente'}${city ? ` \u00b7 ${city}` : ''}`,
  otherYourStations: 'Altre tue stazioni',
  followedTrainsHead: 'Treni che segui',
  followedTrainsSub: 'Binario e ritardo, dal loro tabellone',
  followedFromStation: (station: string) => `Da ${station}`,
  followedAtStation: (station: string) => `A ${station}`,
  followedGone: 'Non pi\u00f9 sul tabellone',
  followedRemove: (number: string) => `Non seguire pi\u00f9 il ${number}`,
  cardUnavailable: 'Dati non disponibili ora. Riprova tra poco.',
  cardNoDepartures: 'Nessuna partenza nelle prossime ore.',
} as const

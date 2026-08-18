/**
 * HTML → domain. **Pure functions, zero I/O** (ADR-003): no fetching, no cache, no clock read
 * that is not passed in. This is the module RFI will break, and the only one that must be
 * verifiable in milliseconds against committed fixtures.
 *
 * Binding rules, all of them load-bearing (ARCHITECTURE 2.2):
 *  - cells are found by `id`/`headers` (`RVettore`, `RCategoria`, `RTreno`, `RStazione`,
 *    `ROrario`, `RRitardo`, `RBinario`, `RExLampeggio`, `RDettagli`), never by column position.
 *    Verified against a live capture: RFI repeats the same cell `id` on every `<tr>` (invalid
 *    HTML, real markup regardless), so every lookup below is scoped to one row's subtree —
 *    never a document-wide `getElementById`.
 *  - operator and category are **images**: the only handle is `alt`, read through explicit
 *    lookup tables, never text heuristics (ADR-008)
 *  - the service date comes from the details button id (`btn_20260818CB708`), and is what turns
 *    `HH:MM` into an instant in `Europe/Rome` — with Luxon, never `Date` (ARCHITECTURE 5.1).
 *    Only the first 8 digits (`YYYYMMDD`) are trustworthy: for purely numeric train numbers the
 *    remaining suffix is an internal RFI id, *not* the train number restated (verified against a
 *    live capture — e.g. train `8918`'s button id ends in `9748`). The train number itself comes
 *    from the row's own `id`/`RTreno` text, never from the button id.
 *  - **not every row has that button.** Verified against a live arrivals capture: a train with
 *    no further stops beyond this station gets no "Fermate successive" popup at all (39 of 40
 *    rows on one real Roma Termini arrivals board), so there is no button id to read a date
 *    from. The page itself always carries one, though: `<label id="UltimoaggiData">... aggiornato
 *    il  DD/MM/YYYY ... alle ore  HH:MM:SS`. That page-generation date is the fallback anchor for
 *    any row missing its own — accurate for the documented ~90-minute window this board covers,
 *    marginally wrong only in the sliver-of-a-second case of a delayed train whose *original*
 *    service date was yesterday and today's page date has already rolled over.
 *
 * `CANCELLED` / `PARTIAL` / `REROUTED` are the one gap ARCHITECTURE.md leaves open: "verified
 * behaviour" there only covers platform/delay/blinking. No live train in any of those three
 * states turned up across four boards sampled while building this file, and RFI's own
 * `Monitor.js`/`APScript.js` carry no status logic (the page is fully server-rendered). The
 * detection below is a best-effort reading of the `RRitardo` cell text — `Cancellato` /
 * `Soppresso` for a full cancellation, anything containing `parzial` for a partial one — plus a
 * `instradat`/`deviat` scan of the popup's free-text "Informazioni" block for reroutes. Flagged,
 * not verified: confirm against a real fixture the day one of these three actually appears on a
 * board, and delete this comment once it has.
 */
import { DateTime } from 'luxon'
import { type HTMLElement, parse as parseHtml } from 'node-html-parser'
import type {
  BoardMode,
  BoardRow,
  Brand,
  Operator,
  Platform,
  RawHtml,
  TrainCategory,
  TrainStatus,
  ViaStop,
} from './types'

/** `alt` on `RVettore`'s `<img>` → operator + display brand. Case-sensitive: RFI's `alt`s are
 * upper case. Initial table per ADR-008, extended with values seen on a live capture.
 * Deliberately *not* in this table despite showing up on that capture: `ENTE AUTONOMO
 * VOLTURNO` (a real Campania regional operator) and `TRENITALIA TPER` (a real Trenitalia/TPER
 * joint venture, Emilia-Romagna) — both are undertakings the fallback below is exactly for
 * (ADR-008 §Fallback), not values worth guessing an operator/brand split for on one sighting. */
const VETTORE_TABLE: Record<string, { operator: Operator; brand: Brand }> = {
  TRENITALIA: { operator: 'TRENITALIA', brand: 'Trenitalia' },
  FRECCIAROSSA: { operator: 'TRENITALIA', brand: 'Frecciarossa' },
  FRECCIARGENTO: { operator: 'TRENITALIA', brand: 'Frecciargento' },
  FRECCIABIANCA: { operator: 'TRENITALIA', brand: 'Frecciabianca' },
  INTERCITY: { operator: 'TRENITALIA', brand: 'Intercity' },
  'INTERCITY NOTTE': { operator: 'TRENITALIA', brand: 'Intercity Notte' },
  'LEONARDO EXPRESS': { operator: 'TRENITALIA', brand: 'Leonardo Express' },
  ITALO: { operator: 'ITALO', brand: 'Italo' },
  TRENORD: { operator: 'TRENORD', brand: 'Trenord' },
  'MALPENSA EXPRESS': { operator: 'TRENORD', brand: 'Malpensa Express' },
}

/** `alt` on `RCategoria`'s `<img>`, prefix `Categoria ` stripped → `TrainCategory`. RFI uses
 * short codes on a live capture (`REG`, `RV`, `RE`, `EC`) rather than the full words ADR-008's
 * table anticipated; both spellings are kept so either markup era resolves the same way. `RE`
 * (Trenord's own regional boards) and `EC` (Eurocity, at Milano Centrale) are additions beyond
 * ADR-008's initial table, confirmed against a live capture rather than guessed from the code
 * alone. */
const CATEGORIA_TABLE: Record<string, TrainCategory> = {
  "ALTA VELOCITA'": 'HIGH_SPEED',
  INTERCITY: 'INTERCITY',
  'INTERCITY NOTTE': 'INTERCITY',
  EC: 'INTERCITY',
  REG: 'REGIONAL',
  REGIONALE: 'REGIONAL',
  RE: 'REGIONAL',
  RV: 'REGIONAL_FAST',
  'REGIONALE VELOCE': 'REGIONAL_FAST',
  SUB: 'SUBURBAN',
  SUBURBANO: 'SUBURBAN',
  METROPOLITANO: 'SUBURBAN',
  BUS: 'BUS',
}

export type UnknownValueKind = 'vettore' | 'categoria'
export type UnknownValue = { kind: UnknownValueKind; value: string }

/** One row per train in the window, in the order RFI printed them. Empty list is a valid result. */
export function parseBoard(html: RawHtml, mode: BoardMode): BoardRow[] {
  const root = parseHtml(html)
  return extractRows(root, mode).rows
}

/** Board-level announcements, in Italian, shown as-is (ADR-009). */
export function parseNotices(html: RawHtml): string[] {
  const root = parseHtml(html)
  return root
    .querySelectorAll('.marqueeinfosupp > div')
    .map((el) => el.text.trim())
    .filter((text) => text.length > 0)
}

/** Every `alt` value that fell through `VETTORE_TABLE`/`CATEGORIA_TABLE` to `OTHER`, for the
 * caller to feed into `BoardStore.recordUnknown` (ADR-008). Kept out of `parseBoard`'s own
 * return so the parser stays a plain `html -> BoardRow[]` function; `store.ts` is the one place
 * with a `BoardStore` to write into. */
export function parseUnknownValues(html: RawHtml): UnknownValue[] {
  const root = parseHtml(html)
  return extractRows(root, 'departures').unknowns
}

/** `mode` isn't branched on below: `RStazione`'s text is the destination on a departures board
 * and the origin on an arrivals one, but the cell holds whichever one RFI already rendered —
 * there's nothing left to pick between (ARCHITECTURE 2.2's `name="Destinazione"`/`Provenienza`
 * only *confirms* the mode, it doesn't change what to extract). Kept in the signature anyway:
 * `parseBoard`'s public contract takes a mode per the module it's the pure core of, and this is
 * the one place that shape flows through without a use for it yet. */
function extractRows(
  root: HTMLElement,
  _mode: BoardMode,
): { rows: BoardRow[]; unknowns: UnknownValue[] } {
  const trs = root.querySelectorAll('tbody#bodyTabId > tr')
  const rows: BoardRow[] = []
  const unknowns: UnknownValue[] = []
  const pageDate = parsePageDate(root)

  for (const tr of trs) {
    const trainNumber = tr.getAttribute('id')?.trim() ?? ''
    const headsign = tr.querySelector('[headers="HStazione"]')?.text.trim() ?? ''
    const time = tr.querySelector('[headers="HOrario"]')?.text.trim() ?? ''
    if (isFillerRow({ trainNumber, headsign, time })) {
      continue
    }

    const vettoreAlt = tr.querySelector('[headers="HVettore"] img')?.getAttribute('alt')?.trim()
    const vettore = vettoreAlt ? VETTORE_TABLE[vettoreAlt] : undefined
    if (vettoreAlt && !vettore) {
      unknowns.push({ kind: 'vettore', value: vettoreAlt })
    }

    const categoriaAltRaw = tr
      .querySelector('[headers="HCategoria"] img')
      ?.getAttribute('alt')
      ?.trim()
    const categoriaAlt = categoriaAltRaw?.replace(/^Categoria\s+/i, '')
    const category = categoriaAlt ? CATEGORIA_TABLE[categoriaAlt] : undefined
    if (categoriaAlt && !category) {
      unknowns.push({ kind: 'categoria', value: categoriaAlt })
    }

    const delayText = tr.querySelector('[headers="HRitardo"]')?.text.trim() ?? ''
    const platformText = tr.querySelector('[headers="HBinario"]')?.text.trim() ?? ''
    const blinking = tr.querySelector('[headers="HInArrivo"] img')?.getAttribute('alt') === 'Si'

    const detailsId = tr
      .querySelector('button[id^="btn_"]')
      ?.getAttribute('id')
      ?.replace(/^btn_/, '')
    const serviceDate = reconstructServiceDate(detailsId) || pageDate

    const popup = tr.querySelector('[id^="FermateSuccessive_"]')
    const viaStops = parseViaStops(popup)
    const infoText = findInfoBlock(popup)

    const platform: Platform =
      platformText.length > 0
        ? { scheduled: platformText, actual: platformText, isConfirmed: true }
        : { scheduled: null, actual: null, isConfirmed: false }

    const delayMinutes = /^\d+$/.test(delayText) ? Number.parseInt(delayText, 10) : null

    const status = deriveStatus({ delayText, infoText, blinking, delayMinutes })

    rows.push({
      operator: vettore?.operator ?? 'OTHER',
      brand: vettore?.brand ?? null,
      category: category ?? 'OTHER',
      trainNumber,
      serviceDate,
      headsign,
      viaStops,
      scheduledTime: reconstructTimestamp(serviceDate, time),
      delayMinutes,
      platform,
      status,
      blinking,
    })
  }

  return { rows, unknowns }
}

/** RFI pads a short board out to a fixed row count with blank `<tr name="treno">` rows: no `id`
 * on the `<tr>`, and `RTreno`/`RStazione`/`ROrario` all empty (verified on a live Abano Terme
 * departures capture — one real train, fourteen fillers). They carry no train, so they are not
 * rows; rendered, they read as a `00:00` departure to nowhere. An empty board is still a normal
 * state (ARCHITECTURE 2.2) — it just means every row was a filler. */
function isFillerRow(row: { trainNumber: string; headsign: string; time: string }): boolean {
  return row.trainNumber === '' && row.headsign === '' && row.time === ''
}

/** `<label id="UltimoaggiData">...aggiornato il  18/08/2026 ... alle ore  14:30:19` →
 * `2026-08-18`. The one date every board page carries regardless of what any row has (see
 * module comment) — the fallback for rows with no details button of their own. */
function parsePageDate(root: HTMLElement): string {
  const text = root.querySelector('#UltimoaggiData')?.text ?? ''
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : ''
}

/** `btn_20260818CB708` / `btn_20260818189748` → `2026-08-18`. Only the leading `YYYYMMDD` is
 * ever trustworthy (see module comment); everything after it is ignored. */
function reconstructServiceDate(detailsId: string | undefined): string {
  const digits = detailsId?.slice(0, 8) ?? ''
  if (!/^\d{8}$/.test(digits)) {
    return ''
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

/** `serviceDate` (`YYYY-MM-DD`) + `HH:MM`, interpreted in `Europe/Rome`, to an ISO instant
 * (ARCHITECTURE 5.1). Luxon's default resolution of an ambiguous or nonexistent local time
 * already matches what 5.1 asks for — verified directly: on the 2026 fall-back it picks the
 * earlier (CEST, +02:00) occurrence, and on the 2026 spring-forward it shifts the nonexistent
 * half hour forward into the next real one. No extra DST branching needed. */
function reconstructTimestamp(serviceDate: string, hhmm: string): string {
  const [year, month, day] = serviceDate.split('-').map(Number)
  const [hour, minute] = hhmm.split(':').map(Number)
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return ''
  }
  const instant = DateTime.fromObject({ year, month, day, hour, minute }, { zone: 'Europe/Rome' })
  return instant.toISO() ?? ''
}

/** `FERMA A:VENAFRO (19:29) - ISERNIA (19:59) - ...`, already in the popup with no extra
 * request (ARCHITECTURE 1). */
function parseViaStops(popup: HTMLElement | null): ViaStop[] {
  const block = findLabelledBlock(popup, 'Fermate successive')
  if (!block) {
    return []
  }
  const text = block.text.trim().replace(/^FERMA A:\s*/i, '')
  if (!text) {
    return []
  }
  const stops: ViaStop[] = []
  for (const part of text.split(' - ')) {
    const match = part.trim().match(/^(.*)\s\((\d{2}:\d{2})\)$/)
    const name = match?.[1]
    const time = match?.[2]
    if (name && time) {
      stops.push({ name: name.trim(), time })
    }
  }
  return stops
}

/** The popup's free-text "Informazioni" block, e.g. carriage notes — also the only place a
 * reroute might be readable from today (see module comment). */
function findInfoBlock(popup: HTMLElement | null): string {
  return findLabelledBlock(popup, 'Informazioni')?.text.trim() ?? ''
}

/** The popup pairs a `.titoloInfoAggiuntive` label with the `.testoinfoaggiuntive` block right
 * after it — matched by label text since nothing ties the two together structurally. */
function findLabelledBlock(popup: HTMLElement | null, label: string): HTMLElement | null {
  if (!popup) {
    return null
  }
  const labels = popup.querySelectorAll('.titoloInfoAggiuntive')
  const texts = popup.querySelectorAll('.testoinfoaggiuntive')
  const index = labels.findIndex((el) => el.text.trim().toLowerCase() === label.toLowerCase())
  return index >= 0 ? (texts[index] ?? null) : null
}

/** Best-effort, unverified against a real fixture (see module comment). Priority: a
 * cancellation — full or partial — beats everything else; a reroute beats plain delay/on-time;
 * blinking ("about to depart/arrive") beats a plain delay/on-time label but not the above. */
function deriveStatus(input: {
  delayText: string
  infoText: string
  blinking: boolean
  delayMinutes: number | null
}): TrainStatus {
  const delayLower = input.delayText.toLowerCase()
  if (/parzial/.test(delayLower)) {
    return 'PARTIAL'
  }
  if (/cancellat|soppress/.test(delayLower)) {
    return 'CANCELLED'
  }
  if (/instradat|deviat/i.test(input.infoText)) {
    return 'REROUTED'
  }
  if (input.blinking) {
    return 'IMMINENT'
  }
  if (input.delayMinutes !== null && input.delayMinutes > 0) {
    return 'DELAYED'
  }
  return 'ON_TIME'
}

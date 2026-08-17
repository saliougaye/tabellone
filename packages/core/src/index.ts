/**
 * Public surface of `@tabellone/core`. `apps/web` imports from here and only here: the
 * internal module layout (catalog → fetcher → parser → store) can be reshuffled without
 * touching the app, and what is *not* re-exported is private by construction.
 */
export { findStationBySlug, listStations, resolveAlias } from './catalog'
export { NotImplementedError } from './errors'
export { type FetchBoardResult, fetchBoard } from './fetcher'
export { parseBoard, parseNotices } from './parser'
export { keys, RFI_MAX_REQUESTS_PER_SECOND, readBoard, type StoreDeps, TTL } from './store'
export type {
  BoardCache,
  BoardMode,
  BoardRow,
  Clock,
  Operator,
  Platform,
  RawHtml,
  Station,
  StationBoard,
  TrainCategory,
  TrainStatus,
  ViaStop,
} from './types'

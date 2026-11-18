'use client'

/**
 * The board (ARCHITECTURE 4.1), seventh pass: a header that answers "where is my train" before
 * "which station is this" (`BoardHeader`), strike notices as the first ticket, then every train
 * as a ticket grouped by how soon it goes (`TicketList`). Polls `/api/board/:slug` every 20 s
 * through `useBoard` (ADR-006) and records the visit for the home.
 *
 * This component owns the data and what the header, the list and the sheet share: the search
 * text, the operator chip, the mode, the open train and the followed trains. Search and chips
 * narrow the rows in hand — they never trigger a read.
 *
 * The train page is this board with that train's sheet open (ADR-012): `useTrainSheet` reads
 * the train number from the URL. The board's states (loading, empty, RFI down, offline, stale)
 * are `board-states.tsx`.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { canonicalBoardPath } from '@/lib/board-routes'
import { countByOperator, type OperatorFilter } from '@/lib/board-view'
import { followedFromRow, syncExpectedTimes, toggleFollowed } from '@/lib/followed-trains'
import { useNow } from '@/lib/format'
import { recordLastStation } from '@/lib/last-station'
import { boardTrust } from '@/lib/presentation'
import { isFavourite, recordVisit, toggleFavourite } from '@/lib/saved-stations'
import { useBoard } from '@/lib/use-board'
import { useFollowedTrains } from '@/lib/use-followed-trains'
import { useOnline } from '@/lib/use-online'
import { strings } from '@/strings'
import { BoardHeader } from './board-header'
import { BoardError, BoardSkeleton, EmptyBoard } from './board-states'
import { InfoNotices, StrikeDetail, StrikeTicket, useNotices } from './notices'
import { rowKey } from './parts'
import { StationSwitcher } from './station-switcher'
import { TicketList } from './ticket-list'
import { TicketSheet } from './ticket-sheet'
import { useTrainSheet } from './use-train-sheet'

export function BoardScreen({
  slug,
  initialMode,
  catalogName,
}: {
  slug: string
  initialMode: BoardMode
  /** The station's catalogue name, free at build time, so the header never shows a slug. */
  catalogName?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<BoardMode>(initialMode)
  const { board, loading, error, refresh } = useBoard(slug, mode)
  const online = useOnline()
  const stationName = board?.stationName ?? catalogName ?? slug
  const now = useNow(30_000)
  const [favourite, setFavourite] = useState(false)
  const [query, setQuery] = useState('')
  const [operator, setOperator] = useState<OperatorFilter>('all')
  const [switcher, setSwitcher] = useState(false)
  const [strikeOpen, setStrikeOpen] = useState<string | null>(null)

  useEffect(() => {
    recordVisit(slug, stationName)
    setFavourite(isFavourite(slug))
  }, [slug, stationName])
  // The mode is part of the URL (ADR-011): switching it moves to the canonical path, and the
  // home's session redirect remembers where the reader was.
  useEffect(() => {
    recordLastStation(slug, mode)
  }, [slug, mode])

  const rows = useMemo(() => board?.rows ?? [], [board?.rows])
  const sheet = useTrainSheet(slug, mode, rows, board !== null)

  // A train URL belongs to its mode, so the open sheet closes first — and the navigation waits
  // for the history to settle, or the pending `back()` would undo it.
  const switchMode = async (next: BoardMode) => {
    if (next === mode) return
    await sheet.close()
    setMode(next)
    router.replace(canonicalBoardPath(slug, next), { scroll: false })
  }

  const followed = useFollowedTrains(now)
  const followedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const entry of followed) {
      if (entry.slug !== slug || entry.mode !== mode) continue
      const row = rows.find(
        (r) => r.trainNumber === entry.trainNumber && r.scheduledTime === entry.scheduledAt,
      )
      if (row) keys.add(rowKey(row))
    }
    return keys
  }, [followed, rows, slug, mode])
  // The board knows when a followed train is really due: keep it, so a late train outlives its
  // timetable time (the follow drops itself three hours after).
  useEffect(() => {
    if (rows.length > 0) syncExpectedTimes(slug, mode, rows)
  }, [slug, mode, rows])
  const toggleFollow = (row: BoardRow) =>
    toggleFollowed(followedFromRow(row, slug, mode, stationName))

  const counts = useMemo(() => countByOperator(rows, now, query), [rows, now, query])
  // A board cached before ADR-013 still carries plain strings for up to the key TTL.
  const notices = useMemo(
    () => (board?.notices ?? []).filter((n) => typeof n === 'object' && n !== null),
    [board?.notices],
  )
  const { strikes, infos } = useNotices(notices, now)
  const openStrike = strikes.find((placed) => placed.key === strikeOpen) ?? null

  // Can the data on screen be trusted? A poll that failed while a board is in hand keeps the
  // board and says so; with no board at all it is the loading, error or offline card.
  const trust = boardTrust(board, { online, pollFailed: error }, now)
  const other: BoardMode = mode === 'departures' ? 'arrivals' : 'departures'
  const emptyBoard = board !== null && rows.length === 0

  return (
    <main className="sh bt">
      <div className="bt-wrap hd-wrap">
        <BoardHeader
          stationName={stationName}
          onOpenSwitcher={() => setSwitcher(true)}
          query={query}
          onQuery={setQuery}
          mode={mode}
          onMode={switchMode}
          counts={counts}
          operator={operator}
          onOperator={setOperator}
          hasRows={rows.length > 0}
          trust={trust}
          generatedAt={board?.generatedAt ?? null}
          onRetry={refresh}
        />
        <InfoNotices infos={infos} />

        {!board && !online && (
          <BoardError stationName={stationName} online={false} onRetry={refresh} />
        )}
        {!board && online && loading && <BoardSkeleton />}
        {!board && online && !loading && error && (
          <BoardError stationName={stationName} online onRetry={refresh} />
        )}
        {board && emptyBoard && (
          <EmptyBoard
            mode={mode}
            stationName={stationName}
            generatedAt={board.generatedAt}
            onOther={() => switchMode(other)}
          />
        )}

        {strikes.map((placed) => (
          <StrikeTicket
            key={placed.key}
            placed={placed}
            now={now}
            rows={rows}
            onOpen={() => setStrikeOpen(placed.key)}
          />
        ))}
        {rows.length > 0 && (
          <div className="bt-body" key={mode} data-trust={trust?.kind ?? 'live'}>
            <TicketList
              rows={rows}
              mode={mode}
              now={now}
              query={query}
              operator={operator}
              followedKeys={followedKeys}
              onOpen={sheet.open}
              onReset={() => {
                setQuery('')
                setOperator('all')
              }}
            />
          </div>
        )}

        <TicketSheet
          row={sheet.row}
          missing={sheet.missing}
          mode={mode}
          now={now}
          stationName={stationName}
          followed={sheet.row ? followedKeys.has(rowKey(sheet.row)) : false}
          onToggleFollow={toggleFollow}
          onClose={sheet.close}
        />
        <Sheet
          open={openStrike !== null}
          onClose={() => setStrikeOpen(null)}
          label={strings.strikeSheetLabel}
        >
          {openStrike && <StrikeDetail placed={openStrike} now={now} rows={rows} />}
        </Sheet>
        <StationSwitcher
          open={switcher}
          onClose={() => setSwitcher(false)}
          slug={slug}
          stationName={stationName}
          mode={mode}
          favourite={{
            active: favourite,
            onToggle: () => setFavourite(toggleFavourite(slug, stationName)),
          }}
        />
      </div>
    </main>
  )
}

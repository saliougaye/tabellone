'use client'

/**
 * Live wiring of the board page: polls `/api/board/:slug` (20 s, hidden-suspended, via
 * React Query), keeps the `view` query param in sync (ADR-010), records the visit and
 * toggles the favourite in `localStorage`. Rendering is delegated to the presentational
 * BoardView.
 *
 * Changing station is a bottom sheet on mobile (`StationSheet`) and a link to the picker
 * page on desktop — both end in a normal navigation to `/:slug`, so the sheet is only ever
 * an entry point, never a second source of truth for the current station. It closes on the
 * slug it navigates to, in case Next keeps this component mounted across the param change.
 *
 * With no board to show, the reason matters: a read that failed with the network up is
 * "dati non disponibili" and worth a retry, a read that never left the device is "sei
 * offline" and worth nothing but the network coming back. `useOnline` is what separates
 * them; React Query refetches on reconnect, so the offline screen leaves on its own.
 *
 * Offline is checked *before* `loading`, not after, and that ordering is the whole fix:
 * React Query's default `networkMode: 'online'` pauses a query while the browser reports
 * no connection, so offline never produces an error — the query simply stays pending. Read
 * in `loading`-first order the screen would sit on "Caricamento…" for as long as the
 * network is down.
 *
 * A board already in hand survives going offline: cached rows beat an empty screen, and
 * they are flagged `isStale` because nothing can refresh them until the network returns.
 *
 * Switching departures ↔ arrivals is a different cache key, so the first switch has
 * nothing to show. Rather than freeze on the previous mode's rows — which read as a slow,
 * unresponsive toggle — the header is kept from the last board and the rows become
 * placeholders until the new mode lands. A mode already fetched paints straight away.
 */
import type { BoardMode, StationBoard } from '@tabellone/core'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { StationSheet } from '@/components/picker/station-sheet'
import { isFavourite, recordVisit, toggleFavourite } from '@/lib/saved-stations'
import { useBoard } from '@/lib/use-board'
import { useOnline } from '@/lib/use-online'
import { BoardError, BoardLoading, BoardOffline } from './board-states'
import { BoardView } from './board-view'

export function BoardScreen({
  slug,
  initialMode,
  catalogName,
}: {
  slug: string
  initialMode: BoardMode
  catalogName?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<BoardMode>(initialMode)
  const [favourite, setFavourite] = useState(false)
  // Two flags, not one: `mounted` stays true after the first open so the sheet survives
  // its own exit animation, and stays false on a desktop session that never opens it —
  // where the sheet is unreachable and its catalogue fetch would be pure waste.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMounted, setPickerMounted] = useState(false)

  const openPicker = () => {
    setPickerMounted(true)
    setPickerOpen(true)
  }
  const { board, error, loading, refresh } = useBoard(slug, mode)
  const online = useOnline()

  // The last board of *either* mode, kept only so the header survives a mode switch.
  const lastBoard = useRef<StationBoard | null>(null)
  if (board) lastBoard.current = board

  // The slug is never a fallback here: it is a URL identifier, not a label ("bari-s-spirito"
  // for "Bari S.spirito"). Before the board lands the name comes from the catalogue, passed
  // in by the page; an unknown slug has none, and the label is simply left out.
  const stationName = board?.stationName ?? lastBoard.current?.stationName ?? catalogName

  useEffect(() => {
    setFavourite(isFavourite(slug))
    // The station changed: whatever opened the sheet is done with it.
    setPickerOpen(false)
  }, [slug])

  useEffect(() => {
    // Only once the name is known — a visit recorded as its own slug would show up in
    // "recenti" as one.
    if (stationName) recordVisit(slug, stationName)
  }, [slug, stationName])

  const switchMode = (next: BoardMode) => {
    setMode(next)
    router.replace(next === 'arrivals' ? `/${slug}?view=arrivals` : `/${slug}`, { scroll: false })
  }

  const favouriteProps = {
    active: favourite,
    onToggle: () => setFavourite(toggleFavourite(slug, stationName ?? slug)),
  }

  // Loading with a previous board in hand: the mode switch. Loading with none: first load.
  // Both only reachable with the network up — offline is answered above them.
  const previous = lastBoard.current
  const content =
    board !== null ? (
      <BoardView
        board={error || !online ? { ...board, isStale: true } : board}
        now={new Date()}
        onSwitchMode={switchMode}
        pickerHref="/"
        onOpenPicker={openPicker}
        favourite={favouriteProps}
      />
    ) : !online ? (
      <BoardOffline stationLabel={stationName} onRetry={refresh} />
    ) : loading && previous ? (
      <BoardView
        board={{ ...previous, mode, rows: [], notices: [], isStale: false }}
        now={new Date()}
        onSwitchMode={switchMode}
        pickerHref="/"
        onOpenPicker={openPicker}
        favourite={favouriteProps}
        pending
      />
    ) : loading ? (
      <BoardLoading stationLabel={stationName} />
    ) : (
      <BoardError stationLabel={stationName} onRetry={refresh} />
    )

  return (
    <main
      className="flex min-h-dvh flex-col"
      style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 3vw, 40px) var(--sp-20)' }}
    >
      {content}
      {pickerMounted && <StationSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />}
    </main>
  )
}

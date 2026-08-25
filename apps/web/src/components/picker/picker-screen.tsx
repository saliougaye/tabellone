'use client'

/**
 * Live wiring of the picker page: reads the catalogue from `/api/stations`, the saved
 * stations from `localStorage`.
 *
 * There is no separate first-launch screen any more. It used to be a full empty state whose
 * only control opened the picker — a screen, a tap, and then the screen the reader wanted.
 * Search is the picker's primary object now, so on a first launch the same page simply
 * carries the welcoming heading above the field it was going to hand over to anyway; the
 * copy is unchanged, it just costs one fewer tap.
 *
 * Before any of that: a session-scoped redirect back to the last board open
 * (`sessionStorage`, `consumeRedirect` — design:
 * docs/superpowers/specs/2026-08-19-last-station-redirect-design.md). Fires at most once per
 * session, on the first mount of this screen, so a deliberate return to the picker later in
 * the session isn't bounced straight back to the board.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { StationPicker } from '@/components/picker/station-picker'
import { AppHeader } from '@/components/shell/app-header'
import { canonicalBoardPath } from '@/lib/board-routes'
import { consumeRedirect } from '@/lib/last-station'
import { listFavourites, listRecents, type SavedStation } from '@/lib/saved-stations'
import { useStations } from '@/lib/use-stations'

export function PickerScreen() {
  const router = useRouter()
  const [recents, setRecents] = useState<SavedStation[]>([])
  const [favourites, setFavourites] = useState<SavedStation[]>([])
  const [loaded, setLoaded] = useState(false)
  // null = not checked yet, true = redirecting, false = stay on this screen.
  const [redirecting, setRedirecting] = useState<boolean | null>(null)

  useEffect(() => {
    const last = consumeRedirect()
    if (last) {
      router.replace(canonicalBoardPath(last.slug, last.mode))
      setRedirecting(true)
    } else {
      setRedirecting(false)
    }
  }, [router])

  useEffect(() => {
    setRecents(listRecents())
    setFavourites(listFavourites())
    setLoaded(true)
  }, [])

  // Same query key as the board's "cambia stazione" sheet: whichever screen fetches the
  // catalogue first, the other one opens with it already in hand.
  const { stations, loading, failed, offline } = useStations()

  // Still checking sessionStorage, or mid-redirect to the last board: nothing to paint.
  if (redirecting !== false) return null

  return (
    <>
      <AppHeader />
      <main
        className="flex min-h-[calc(100dvh-4rem)] animate-screen-in flex-col"
        style={{ padding: 'var(--sp-10) var(--screen-margin) var(--sp-20)' }}
      >
        {loaded && (
          <StationPicker
            stations={failed ? null : (stations ?? [])}
            loading={loading}
            offline={offline}
            recents={recents}
            favourites={favourites}
          />
        )}
      </main>
    </>
  )
}

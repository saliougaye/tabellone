'use client'

/**
 * Live wiring of the picker page: reads the catalogue from `/api/stations` (501 today —
 * the picker then shows its honest unavailable state), the saved stations from
 * `localStorage`. First launch with nothing saved shows the sheet-12 empty state, whose
 * CTA opens the picker — the same flow as the prototype (sheet 15).
 */
import type { Station } from '@tabellone/core'
import { useEffect, useState } from 'react'
import { HomeEmpty } from '@/components/picker/home-empty'
import { StationPicker } from '@/components/picker/station-picker'
import { listFavourites, listRecents, type SavedStation } from '@/lib/saved-stations'

export function PickerScreen() {
  const [stations, setStations] = useState<Station[] | null | undefined>(undefined)
  const [recents, setRecents] = useState<SavedStation[]>([])
  const [favourites, setFavourites] = useState<SavedStation[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pickerOpened, setPickerOpened] = useState(false)

  useEffect(() => {
    setRecents(listRecents())
    setFavourites(listFavourites())
    setLoaded(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/stations', { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`stations fetch failed: ${response.status}`)
        return (await response.json()) as Station[]
      })
      .then((payload) => {
        if (!cancelled) setStations(payload)
      })
      .catch(() => {
        if (!cancelled) setStations(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const nothingSaved = loaded && recents.length === 0 && favourites.length === 0
  const showEmptyHome = nothingSaved && !pickerOpened

  return (
    <main
      className="flex min-h-dvh flex-col justify-center"
      style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 3vw, 40px) var(--sp-20)' }}
    >
      {showEmptyHome ? (
        <HomeEmpty onSearch={() => setPickerOpened(true)} />
      ) : (
        loaded && (
          <StationPicker
            stations={stations === undefined ? [] : stations}
            recents={recents}
            favourites={favourites}
          />
        )
      )}
    </main>
  )
}

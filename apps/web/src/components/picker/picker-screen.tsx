'use client'

/**
 * Live wiring of the picker page: reads the catalogue from `/api/stations` (501 today —
 * the picker then shows its honest unavailable state), the saved stations from
 * `localStorage`. First launch with nothing saved shows the sheet-12 empty state, whose
 * CTA opens the picker — the same flow as the prototype (sheet 15).
 */
import { useEffect, useState } from 'react'
import { HomeEmpty } from '@/components/picker/home-empty'
import { StationPicker } from '@/components/picker/station-picker'
import { listFavourites, listRecents, type SavedStation } from '@/lib/saved-stations'
import { useStations } from '@/lib/use-stations'

export function PickerScreen() {
  const [recents, setRecents] = useState<SavedStation[]>([])
  const [favourites, setFavourites] = useState<SavedStation[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pickerOpened, setPickerOpened] = useState(false)

  useEffect(() => {
    setRecents(listRecents())
    setFavourites(listFavourites())
    setLoaded(true)
  }, [])

  // Same query key as the board's "cambia stazione" sheet: whichever screen fetches the
  // catalogue first, the other one opens with it already in hand.
  const { stations, loading, failed } = useStations()

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
            stations={failed ? null : (stations ?? [])}
            loading={loading}
            recents={recents}
            favourites={favourites}
          />
        )
      )}
    </main>
  )
}

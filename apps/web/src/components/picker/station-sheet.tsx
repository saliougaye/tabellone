'use client'

/**
 * "Cambia stazione" on the board, mobile only (< 600px): the same StationPicker as the
 * picker page, rendered inside a bottom sheet instead of a screen away. On a phone the
 * board is one thumb-reach of information and leaving it to pick another station loses it;
 * a sheet keeps the board underneath and dismisses back onto it.
 *
 * The catalogue comes from the shared `useStations` key, so the sheet opens instantly
 * whenever the picker page has already been visited in this session. On a cold open the
 * read is in flight while the sheet is still travelling: the picker's `loading`
 * placeholders hold the final height, so the panel settles once instead of growing under
 * the thumb. Saved stations are
 * read on every open, not once: the favourite star on the board behind can have changed
 * them since.
 */
import { useEffect, useState } from 'react'
import { StationPicker } from '@/components/picker/station-picker'
import { listFavourites, listRecents, type SavedStation } from '@/lib/saved-stations'
import { useStations } from '@/lib/use-stations'
import { strings } from '@/strings'
import { BottomSheet } from '../ui/bottom-sheet'

export function StationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stations, loading, failed } = useStations()
  const [saved, setSaved] = useState<{ recents: SavedStation[]; favourites: SavedStation[] }>({
    recents: [],
    favourites: [],
  })

  useEffect(() => {
    if (!open) return
    setSaved({ recents: listRecents(), favourites: listFavourites() })
  }, [open])

  return (
    <BottomSheet open={open} onClose={onClose} title={strings.changeStation}>
      <StationPicker
        stations={failed ? null : (stations ?? [])}
        loading={loading}
        recents={saved.recents}
        favourites={saved.favourites}
        showHeading={false}
        onSelect={onClose}
      />
    </BottomSheet>
  )
}

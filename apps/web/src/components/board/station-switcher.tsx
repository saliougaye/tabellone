'use client'

/**
 * "Cambia stazione": the one sheet that owns everything about *which* station — search over the
 * real catalogue, the reader's own stations, recents, and the "Segui" toggle for the station on
 * screen. The station bar is a button that opens it; nothing else on the board is about
 * stations, which is what lets the board's header be about trains.
 */
import { ArrowRight, Star, X } from '@phosphor-icons/react'
import type { BoardMode } from '@tabellone/core'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SearchField } from '@/components/ui/search-field'
import { Sheet } from '@/components/ui/sheet'
import { canonicalBoardPath } from '@/lib/board-routes'
import { searchStations, titleCase } from '@/lib/format'
import { listFavourites, listRecents, type SavedStation } from '@/lib/saved-stations'
import { useStations } from '@/lib/use-stations'
import { strings } from '@/strings'

const MAX_RESULTS = 12
const MAX_RECENTS = 6
/** The sheet's slide takes ~320 ms; focus the field after it, or the keyboard fights the animation. */
const FOCUS_AFTER_MS = 320

type Entry = { slug: string; name: string; city?: string; tag?: string }

export function StationSwitcher({
  open,
  onClose,
  slug,
  stationName,
  mode,
  favourite,
}: {
  open: boolean
  onClose: () => void
  slug: string
  stationName: string
  mode: BoardMode
  favourite: { active: boolean; onToggle: () => void }
}) {
  const router = useRouter()
  const { stations, loading } = useStations()
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    const timer = window.setTimeout(
      () => input.current?.focus({ preventScroll: true }),
      FOCUS_AFTER_MS,
    )
    return () => window.clearTimeout(timer)
  }, [open])

  const saved = useMemo(() => {
    if (!open) return { favourites: [] as SavedStation[], recents: [] as SavedStation[] }
    const favourites = listFavourites().filter((s) => s.slug !== slug)
    const recents = listRecents()
      .filter((s) => s.slug !== slug && !favourites.some((f) => f.slug === s.slug))
      .slice(0, MAX_RECENTS)
    return { favourites, recents }
  }, [open, slug])

  const cityOf = (stationSlug: string) => stations?.find((s) => s.slug === stationSlug)?.city
  const trimmed = query.trim()
  const results = trimmed ? searchStations(stations, query, MAX_RESULTS) : []

  const go = (to: string) => {
    onClose()
    router.push(canonicalBoardPath(to, mode))
  }
  const list = (entries: Entry[]) => (
    <ul className="hd-list">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <button type="button" className="hd-st" onClick={() => go(entry.slug)}>
            <span>
              <b>{titleCase(entry.name)}</b>
              {entry.city && <small>{entry.city}</small>}
            </span>
            {entry.tag && <em>{entry.tag}</em>}
            <ArrowRight weight="bold" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <Sheet open={open} onClose={onClose} label={strings.changeStation}>
      <div className="hd-sheet-head">
        <h2>{strings.changeStation}</h2>
        <button type="button" className="hd-x" onClick={onClose} aria-label={strings.closeSheet}>
          <X weight="bold" />
        </button>
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        inputRef={input}
        label={strings.searchStation}
        placeholder={strings.searchPlaceholder}
      />
      <button
        type="button"
        className="hd-follow"
        aria-pressed={favourite.active}
        onClick={favourite.onToggle}
      >
        <span className="ic">
          <Star weight={favourite.active ? 'fill' : 'bold'} />
        </span>
        <span>
          <b>{titleCase(stationName)}</b>
          <small>{favourite.active ? strings.followedHint : strings.followHint}</small>
        </span>
        <em>{favourite.active ? strings.followingLabel : strings.followAdd}</em>
      </button>
      {trimmed ? (
        <>
          <h3 className="hd-h3">{strings.stationsHead}</h3>
          {loading && !stations ? (
            <p className="hd-note">{strings.loadingCatalogue}</p>
          ) : results.length ? (
            list(
              results.map((s) => ({
                slug: s.slug,
                name: s.name,
                city: s.city,
                tag: s.slug === slug ? strings.hereTag : undefined,
              })),
            )
          ) : (
            <p className="hd-note">{strings.noResults(trimmed)}</p>
          )}
        </>
      ) : (
        <>
          {saved.favourites.length > 0 && (
            <>
              <h3 className="hd-h3">{strings.yourStations}</h3>
              {list(saved.favourites.map((s) => ({ ...s, city: cityOf(s.slug) })))}
            </>
          )}
          {saved.recents.length > 0 && (
            <>
              <h3 className="hd-h3">{strings.recentsHead}</h3>
              {list(saved.recents.map((s) => ({ ...s, city: cityOf(s.slug) })))}
            </>
          )}
          {!saved.favourites.length && !saved.recents.length && (
            <p className="hd-note">{strings.switcherEmptyHint}</p>
          )}
        </>
      )}
    </Sheet>
  )
}

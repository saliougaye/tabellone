'use client'

/**
 * Station picker, presentational (sheets 13–14): search field, suggested tiles, A–Z
 * groups, saved stations (recents + favourites). The catalogue arrives as a prop —
 * `null` means the catalogue read failed, and the picker says so honestly while the
 * saved stations, which live client-side, keep working. `offline` narrows that same box
 * to the reason when the device has no connection at all: the catalogue is not broken,
 * it is simply unreachable from here.
 */
import type { Station } from '@tabellone/core'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SkeletonBlock } from '@/components/ui/skeleton-block'
import { canonicalBoardPath } from '@/lib/board-routes'
import type { SavedStation } from '@/lib/saved-stations'
import { strings } from '@/strings'

type PickerProps = {
  stations: Station[] | null
  recents: SavedStation[]
  favourites: SavedStation[]
  /**
   * The catalogue read is still in flight. Kept apart from `stations === null`, which means
   * it *failed*: while loading, the picker shows placeholders of the same height as the
   * real rows instead of an empty list. Inside the bottom sheet that is the difference
   * between a panel that settles once and a panel that visibly grows under the thumb.
   */
  loading?: boolean
  /**
   * The device has no network connection. Only changes the copy of the catalogue-failed
   * box — the saved stations above it are `localStorage` and work offline unchanged.
   */
  offline?: boolean
  /**
   * `false` drops the app name and the page title: inside the mobile bottom sheet the
   * sheet's own title bar already names the panel, and a second heading would repeat it.
   * The search field is part of the picker either way.
   */
  showHeading?: boolean
  /**
   * Called when a station row is activated, before the navigation. The sheet uses it to
   * dismiss itself; the picker page has nothing to close and leaves it undefined.
   */
  onSelect?: (slug: string) => void
}

export function StationPicker({
  stations,
  recents,
  favourites,
  loading = false,
  offline = false,
  showHeading = true,
  onSelect,
}: PickerProps) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!stations) return []
    if (!trimmed) return stations
    return stations.filter((station) =>
      `${station.name} ${station.city} ${station.aliases.join(' ')}`
        .toLowerCase()
        .includes(trimmed),
    )
  }, [stations, trimmed])

  const groups = useMemo(() => {
    const byLetter = new Map<string, Station[]>()
    for (const station of filtered) {
      const letter = station.name[0]?.toUpperCase() ?? '#'
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), station])
    }
    return [...byLetter.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const suggested = useMemo(
    () => (stations ?? []).filter((station) => station.isMajor).slice(0, 4),
    [stations],
  )
  const favouriteSlugs = useMemo(() => new Set(favourites.map((entry) => entry.slug)), [favourites])

  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-8 min-[900px]:grid-cols-[minmax(0,1.9fr)_minmax(260px,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-col gap-3">
          {showHeading && (
            <>
              <span className="text-text-tertiary type-label">{strings.appName}</span>
              <h1 className="m-0 type-primary-wide" style={{ fontWeight: 'var(--weight-max)' }}>
                {strings.pickStation}
              </h1>
            </>
          )}
          <div className="relative flex items-center">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={strings.searchPlaceholder}
              disabled={loading || !stations}
              className="box-border w-full rounded-field border border-line-strong bg-surface-raised pr-10 pl-8 text-text-primary outline-none type-secondary min-h-(--touch-min) focus:border-focus disabled:opacity-60"
              style={{ paddingTop: 'var(--sp-3)', paddingBottom: 'var(--sp-3)' }}
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={strings.clearSearch}
                className="absolute right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-text-tertiary"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <PickerSkeleton />
        ) : stations === null ? (
          <section className="flex flex-col items-center gap-3 rounded-minimal border border-line bg-surface-raised px-4 py-10 text-center">
            <span className="type-primary" style={{ fontWeight: 'var(--weight-strong)' }}>
              {offline ? strings.catalogueOffline : strings.catalogueUnavailable}
            </span>
            <p className="m-0 max-w-[34ch] text-text-secondary type-reading">
              {offline ? strings.catalogueOfflineHint : strings.catalogueUnavailableHint}
            </p>
          </section>
        ) : (
          <>
            {trimmed === '' && suggested.length > 0 && (
              <section className="flex flex-col gap-3">
                <span className="text-text-tertiary type-label">{strings.suggestedStations}</span>
                <div className="grid grid-cols-2 gap-2">
                  {suggested.map((station) => (
                    <Link
                      key={station.slug}
                      href={canonicalBoardPath(station.slug, 'departures')}
                      onClick={() => onSelect?.(station.slug)}
                      className="flex flex-col items-start gap-2 rounded-minimal border border-line bg-surface-raised px-3 py-4 no-underline transition-[background-color,border-color]"
                    >
                      <StationSigla city={station.city} />
                      <span
                        className="text-left text-text-primary type-primary"
                        style={{ fontWeight: 'var(--weight-strong)' }}
                      >
                        {station.name}
                      </span>
                      <span className="text-left text-text-tertiary type-tertiary">
                        {station.city}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col pb-8">
              <div className="flex items-baseline justify-between gap-4 pb-3">
                <span className="text-text-tertiary type-label">
                  {trimmed ? strings.searchResults : strings.allStations}
                </span>
                <span className="text-text-tertiary type-tertiary">
                  {strings.stationCount(filtered.length)}
                </span>
              </div>

              {groups.map(([letter, entries]) => (
                <div key={letter}>
                  <div className="border-y border-line bg-surface-pressed px-4 py-2">
                    <span
                      className="text-text-secondary type-label"
                      style={{ fontWeight: 'var(--weight-max)' }}
                    >
                      {letter}
                    </span>
                  </div>
                  {entries.map((station) => (
                    <Link
                      key={station.slug}
                      href={canonicalBoardPath(station.slug, 'departures')}
                      onClick={() => onSelect?.(station.slug)}
                      className="flex w-full items-center gap-3 border-b border-line bg-surface-raised px-4 py-3 no-underline min-h-(--touch-min)"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                        <span
                          className="overflow-hidden text-ellipsis whitespace-nowrap text-text-primary type-primary"
                          style={{ fontWeight: 'var(--weight-strong)' }}
                        >
                          {station.name}
                        </span>
                        <span className="text-text-tertiary type-tertiary">{station.city}</span>
                      </span>
                      {favouriteSlugs.has(station.slug) && (
                        <span
                          className="type-tertiary"
                          style={{
                            fontWeight: 'var(--weight-max)',
                            color: 'var(--state-on-time)',
                          }}
                        >
                          {strings.followed}
                        </span>
                      )}
                      <Chevron />
                    </Link>
                  ))}
                </div>
              ))}

              {trimmed !== '' && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="type-primary" style={{ fontWeight: 'var(--weight-strong)' }}>
                    {strings.noResults(query.trim())}
                  </span>
                  <p className="m-0 max-w-[28ch] text-text-secondary type-reading">
                    {strings.noResultsHint}
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-2 cursor-pointer rounded-minimal border border-line-strong bg-transparent px-5 py-3 text-text-primary type-secondary min-h-(--touch-min)"
                    style={{ fontWeight: 'var(--weight-strong)' }}
                  >
                    {strings.clearSearch}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <aside className="flex flex-col gap-6 min-[900px]:border-l min-[900px]:border-line min-[900px]:pl-6">
        <SavedSection title={strings.favouriteStations} entries={favourites} onSelect={onSelect} />
        <SavedSection
          title={strings.recentStations}
          entries={recents}
          caption={strings.savedCount(recents.length)}
          onSelect={onSelect}
        />
      </aside>
    </div>
  )
}

/**
 * Shape-matched placeholder for the catalogue: the suggested tiles and the first rows of
 * the A–Z list at their real heights (125px tile, 45px row + the sticky letter band), so
 * the layout the data lands into is the layout already on screen.
 */
function PickerSkeleton() {
  const SUGGESTED_TILES = 4
  const ROWS = 8
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{strings.loading}</span>
      <section className="flex flex-col gap-3">
        <SkeletonBlock height="12px" width="150px" index={0} />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: SUGGESTED_TILES }, (_, index) => (
            <SkeletonBlock
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
              key={index}
              height="125px"
              index={index}
            />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <SkeletonBlock height="12px" width="130px" index={0} />
          <SkeletonBlock height="12px" width="76px" index={0} />
        </div>
        <SkeletonBlock height="33px" index={0} />
        <div className="flex flex-col gap-2">
          {Array.from({ length: ROWS }, (_, index) => (
            <SkeletonBlock
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
              key={index}
              height="45px"
              index={index + 1}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function SavedSection({
  title,
  entries,
  caption,
  onSelect,
}: {
  title: string
  entries: SavedStation[]
  caption?: string
  onSelect?: (slug: string) => void
}) {
  if (entries.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <span className="text-text-tertiary type-label">{title}</span>
        {caption && <span className="text-text-tertiary type-tertiary">{caption}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={canonicalBoardPath(entry.slug, 'departures')}
            onClick={() => onSelect?.(entry.slug)}
            className="flex items-center gap-3 rounded-minimal border border-line bg-surface-raised p-3 no-underline min-h-(--touch-min)"
          >
            <StationSigla city={entry.name} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap text-text-primary type-primary"
                style={{ fontWeight: 'var(--weight-strong)' }}
              >
                {entry.name}
              </span>
              <span className="text-text-tertiary type-tertiary">{strings.openBoard}</span>
            </span>
            <Chevron />
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Display-only 2-letter tile for picker rows; derived, never an identifier. */
function StationSigla({ city }: { city: string }) {
  return (
    <span
      className="inline-flex h-10 w-10 flex-none items-center justify-center border border-line bg-veil-empty text-text-secondary type-secondary"
      style={{ fontWeight: 'var(--weight-max)' }}
    >
      {city
        .replace(/[^\p{L}]/gu, '')
        .slice(0, 2)
        .toUpperCase()}
    </span>
  )
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="var(--nav-affordance)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none"
      aria-hidden="true"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      fill="none"
      stroke="var(--text-tertiary)"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="pointer-events-none absolute left-3"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.6" />
      <path d="M10.4 10.4 14 14" />
    </svg>
  )
}

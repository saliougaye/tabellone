'use client'

/**
 * The station picker: search field, saved stations, suggested stations, and a bounded slice
 * of the A–Z catalogue. The catalogue arrives as a prop — `null` means the read failed, and
 * the picker says so honestly while the saved stations, which live client-side, keep
 * working. `offline` narrows that same box to the reason when the device has no connection
 * at all: the catalogue is not broken, it is simply unreachable from here.
 *
 * Search is the primary object on this screen, not a filter above a list. The catalogue is
 * 2400 stations; the previous version rendered every one of them as an anchor on first paint
 * (2400 links, 2400 rows, before the reader had typed anything), which is a page that costs
 * a second to lay out in order to show a list nobody scrolls to the end of. Here the list is
 * capped at `MAX_LISTED` and says so, and the way to the other 2300 is the field at the top.
 */
import { CaretRight, MagnifyingGlass, Star, X } from '@phosphor-icons/react'
import type { Station } from '@tabellone/core'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { iconSize } from '@/components/ui/icon'
import { SkeletonBlock } from '@/components/ui/skeleton-block'
import { canonicalBoardPath } from '@/lib/board-routes'
import type { SavedStation } from '@/lib/saved-stations'
import { strings } from '@/strings'

/**
 * How many stations the A–Z list renders. Not a paging window: it is the point past which a
 * list stops being browsable and the search field is the better tool, and the copy under it
 * says exactly that.
 */
const MAX_LISTED = 60

type PickerProps = {
  stations: Station[] | null
  recents: SavedStation[]
  favourites: SavedStation[]
  /**
   * The catalogue read is still in flight. Kept apart from `stations === null`, which means
   * it *failed*: while loading, the picker shows placeholders of the same height as the real
   * rows instead of an empty list. Inside the bottom sheet that is the difference between a
   * panel that settles once and a panel that visibly grows under the thumb.
   */
  loading?: boolean
  /**
   * The device has no network connection. Only changes the copy of the catalogue-failed box
   * — the saved stations above it are `localStorage` and work offline unchanged.
   */
  offline?: boolean
  /**
   * `false` drops the page heading: inside the mobile bottom sheet the sheet's own title bar
   * already names the panel, and a second heading would repeat it. The search field is part
   * of the picker either way.
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
  const nothingSaved = favourites.length === 0 && recents.length === 0

  const filtered = useMemo(() => {
    if (!stations) return []
    if (!trimmed) return stations
    return stations.filter((station) =>
      `${station.name} ${station.city} ${station.aliases.join(' ')}`
        .toLowerCase()
        .includes(trimmed),
    )
  }, [stations, trimmed])

  const listed = useMemo(() => filtered.slice(0, MAX_LISTED), [filtered])

  const groups = useMemo(() => {
    const byLetter = new Map<string, Station[]>()
    for (const station of listed) {
      const letter = station.name[0]?.toUpperCase() ?? '#'
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), station])
    }
    return [...byLetter.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [listed])

  const suggested = useMemo(
    () => (stations ?? []).filter((station) => station.isMajor).slice(0, 4),
    [stations],
  )
  const favouriteSlugs = useMemo(() => new Set(favourites.map((entry) => entry.slug)), [favourites])

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-10">
      <header className="flex flex-col gap-5">
        {showHeading && (
          <div className="flex max-w-[46ch] flex-col gap-3 border-line-strong border-b-2 pb-5">
            <h1 className="m-0 type-plate">
              {nothingSaved ? strings.chooseStation : strings.pickStation}
            </h1>
            {nothingSaved && (
              <p className="m-0 text-text-secondary type-reading [text-wrap:pretty]">
                {strings.chooseStationHint}
              </p>
            )}
          </div>
        )}
        {/* The one large control on the screen: this is what the page is for. */}
        <div className="relative flex items-center">
          <MagnifyingGlass
            size={iconSize.control}
            color="var(--text-tertiary)"
            aria-hidden="true"
            className="pointer-events-none absolute left-4"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.searchPlaceholder}
            aria-label={strings.searchStation}
            disabled={loading || !stations}
            className="box-border w-full rounded-field border-2 border-line-strong bg-surface-raised py-4 pr-12 pl-12 text-text-primary outline-none type-primary min-h-(--touch-min) placeholder:text-text-tertiary focus:border-focus disabled:opacity-60"
            style={{ transition: 'var(--motion-state)' }}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={strings.clearSearch}
              className="absolute right-3 inline-flex size-9 cursor-pointer items-center justify-center border-0 bg-transparent text-text-tertiary"
            >
              <X size={iconSize.control} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <PickerSkeleton />
      ) : stations === null ? (
        <section className="flex max-w-[40ch] flex-col gap-3 border-line-strong border-l-2 bg-surface-raised px-4 py-4">
          <span className="type-primary" style={{ fontWeight: 'var(--weight-strong)' }}>
            {offline ? strings.catalogueOffline : strings.catalogueUnavailable}
          </span>
          <p className="m-0 text-text-secondary type-reading">
            {offline ? strings.catalogueOfflineHint : strings.catalogueUnavailableHint}
          </p>
        </section>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-10">
            {trimmed === '' && suggested.length > 0 && (
              <section className="flex flex-col">
                <SectionHead label={strings.suggestedStations} />
                {/* Exactly as many cells as there are major stations: an empty tile to
                    square off the grid would be a tile that means nothing. */}
                <div className="grid sm:grid-cols-2">
                  {suggested.map((station) => (
                    <Link
                      key={station.slug}
                      href={canonicalBoardPath(station.slug, 'departures')}
                      onClick={() => onSelect?.(station.slug)}
                      className="group flex items-center justify-between gap-3 border-line border-b bg-surface-raised px-4 py-4 no-underline hover:bg-surface-pressed"
                      style={{ transition: 'var(--motion-state)' }}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span
                          className="overflow-hidden text-ellipsis whitespace-nowrap text-text-primary type-primary"
                          style={{ fontWeight: 'var(--weight-max)' }}
                        >
                          {station.name}
                        </span>
                        <span className="text-text-tertiary type-tertiary">{station.city}</span>
                      </span>
                      <CaretRight
                        size={iconSize.control}
                        color="var(--nav-affordance)"
                        aria-hidden="true"
                        className="flex-none"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col">
              <SectionHead
                label={trimmed ? strings.searchResults : strings.allStations}
                count={strings.stationCount(filtered.length)}
              />

              <div>
                {groups.map(([letter, entries]) => (
                  <div key={letter}>
                    <div className="sticky top-16 z-10 border-line-strong border-b bg-surface-pressed px-4 py-1.5">
                      {/* The app's one spaced-caps label (theme.css rule 2, `type-label`):
                          an index letter is the single thing on either screen that is a
                          label naming a region rather than a heading or a datum. */}
                      <span className="text-text-secondary type-label">{letter}</span>
                    </div>
                    {entries.map((station) => (
                      <Link
                        key={station.slug}
                        href={canonicalBoardPath(station.slug, 'departures')}
                        onClick={() => onSelect?.(station.slug)}
                        className="flex w-full items-center gap-3 border-line border-b bg-surface-raised px-4 py-3 no-underline hover:bg-surface-pressed min-h-(--touch-min)"
                        style={{ transition: 'var(--motion-state)' }}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                          <span
                            className="overflow-hidden text-ellipsis whitespace-nowrap text-text-primary type-primary"
                            style={{ fontWeight: 'var(--weight-strong)' }}
                          >
                            {station.name}
                          </span>
                          {station.city && (
                            <span className="text-text-tertiary type-tertiary">{station.city}</span>
                          )}
                        </span>
                        {favouriteSlugs.has(station.slug) && (
                          <Star
                            size={iconSize.meta}
                            weight="fill"
                            color="var(--state-on-time)"
                            aria-label={strings.followed}
                            className="flex-none"
                          />
                        )}
                        <CaretRight
                          size={iconSize.control}
                          color="var(--nav-affordance)"
                          aria-hidden="true"
                          className="flex-none"
                        />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              {filtered.length > listed.length && (
                <p className="m-0 pt-3 text-text-tertiary type-tertiary">
                  {strings.resultsCapped(listed.length, filtered.length)}
                </p>
              )}

              {trimmed !== '' && filtered.length === 0 && (
                <div className="flex max-w-[36ch] flex-col gap-3 py-6">
                  <span className="type-primary" style={{ fontWeight: 'var(--weight-strong)' }}>
                    {strings.noResults(query.trim())}
                  </span>
                  <p className="m-0 text-text-secondary type-reading">{strings.noResultsHint}</p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-1 w-fit cursor-pointer rounded-control border border-line-strong bg-transparent px-6 py-3 text-text-primary type-secondary type-wide uppercase tracking-(--track-label) min-h-(--touch-min)"
                    style={{ fontWeight: 'var(--weight-max)' }}
                  >
                    {strings.clearSearch}
                  </button>
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-8 lg:border-line-strong lg:border-l lg:pl-8">
            <SavedSection
              title={strings.favouriteStations}
              entries={favourites}
              onSelect={onSelect}
            />
            <SavedSection
              title={strings.recentStations}
              entries={recents}
              caption={strings.savedCount(recents.length)}
              onSelect={onSelect}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

/**
 * The band that names a block. Same device as the board's `ListHead`, and the same
 * justification: theme.css rule 2 reserves the spaced-caps style for a label naming a
 * region of the interface, which is precisely what these are.
 */
function SectionHead({ label, count }: { label: string; count?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-line-strong border-b bg-surface-pressed px-4 py-2">
      <h2 className="m-0 text-text-secondary type-label">{label}</h2>
      {count && <span className="text-text-tertiary type-figures type-tertiary">{count}</span>}
    </div>
  )
}

/**
 * Shape-matched placeholder for the catalogue: the suggested tiles and the first rows of the
 * A–Z list at their real heights, so the layout the data lands into is the layout already on
 * screen.
 */
function PickerSkeleton() {
  const SUGGESTED_TILES = 4
  const ROWS = 8
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">{strings.loading}</span>
      <section className="flex flex-col gap-4">
        <SkeletonBlock height="16px" width="150px" index={0} />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: SUGGESTED_TILES }, (_, index) => (
            <SkeletonBlock
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
              key={index}
              height="78px"
              index={index}
            />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <SkeletonBlock height="16px" width="130px" index={0} />
        {Array.from({ length: ROWS }, (_, index) => (
          <SkeletonBlock
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
            key={index}
            height="56px"
            index={index + 1}
          />
        ))}
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
    <section className="flex flex-col">
      <SectionHead label={title} count={caption} />
      <div className="flex flex-col">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={canonicalBoardPath(entry.slug, 'departures')}
            onClick={() => onSelect?.(entry.slug)}
            className="flex items-center gap-3 border-line border-b px-3 py-3 no-underline hover:bg-surface-pressed min-h-(--touch-min)"
            style={{ transition: 'var(--motion-state)' }}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap text-text-primary type-primary"
                style={{ fontWeight: 'var(--weight-strong)' }}
              >
                {entry.name}
              </span>
              <span className="text-text-tertiary type-tertiary">{strings.openBoard}</span>
            </span>
            <CaretRight
              size={iconSize.control}
              color="var(--nav-affordance)"
              aria-hidden="true"
              className="flex-none"
            />
          </Link>
        ))}
      </div>
    </section>
  )
}

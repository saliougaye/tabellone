'use client'

/**
 * Station selection — the other page (ARCHITECTURE 4.1), in the "Vetrina" structure without
 * pictures: the greeting and the question, the search, and one even grid of station cards —
 * favourites, recents (localStorage) and the major stations together, told apart by a tag;
 * one chip narrows it to the favourites. A query turns the grid into a list. Keeps the
 * session-scoped redirect to the last board (`lib/last-station`).
 */
import { ArrowRight, CaretRight, MagnifyingGlass, X } from '@phosphor-icons/react'
import type { Station } from '@tabellone/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { canonicalBoardPath } from '@/lib/board-routes'
import { searchStations, titleCase, useClientValue } from '@/lib/format'
import { consumeRedirect } from '@/lib/last-station'
import { listFavourites, listRecents } from '@/lib/saved-stations'
import { useStations } from '@/lib/use-stations'
import { strings } from '@/strings'
import { Message } from '../board/parts'

type Kind = 'fav' | 'rec' | 'sug'
type Tile = { slug: string; name: string; city?: string; tag: string; kind: Kind }

const boardHref = (slug: string) => canonicalBoardPath(slug, 'departures')

/** The reader's stations in one list: favourites, then recents, then the majors. */
function useTiles(stations: Station[] | null) {
  const favourites = useClientValue(listFavourites, [])
  const recents = useClientValue(listRecents, [])
  return useMemo(() => {
    const cityOf = (slug: string) => stations?.find((s) => s.slug === slug)?.city || undefined
    const fav: Tile[] = favourites.map((f) => ({
      slug: f.slug,
      name: f.name,
      city: cityOf(f.slug),
      tag: strings.tagFavourite,
      kind: 'fav',
    }))
    const rec: Tile[] = recents
      .filter((r) => !favourites.some((f) => f.slug === r.slug))
      .map((r) => ({
        slug: r.slug,
        name: r.name,
        city: cityOf(r.slug),
        tag: strings.tagRecent,
        kind: 'rec',
      }))
    const taken = new Set([...fav, ...rec].map((s) => s.slug))
    const sug: Tile[] = (stations ?? [])
      .filter((s) => s.isMajor && !taken.has(s.slug))
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        city: s.city || undefined,
        tag: strings.tagSuggested,
        kind: 'sug',
      }))
    return [...fav, ...rec, ...sug]
  }, [stations, favourites, recents])
}

function Greeting() {
  const hour = new Date().getHours()
  return hour < 12
    ? strings.greetingMorning
    : hour < 18
      ? strings.greetingAfternoon
      : strings.greetingEvening
}

export function HomeScreen() {
  const router = useRouter()
  const { stations, loading, failed } = useStations()
  const [query, setQuery] = useState('')
  const [onlyFavourites, setOnlyFavourites] = useState(false)
  const results = useMemo(() => searchStations(stations, query, 20), [stations, query])
  const tiles = useTiles(stations)
  const favouriteCount = tiles.filter((t) => t.kind === 'fav').length
  const shown = onlyFavourites ? tiles.filter((t) => t.kind === 'fav') : tiles

  // Once per session: a reader who was on a board goes straight back to it.
  useEffect(() => {
    const last = consumeRedirect()
    if (last) router.replace(canonicalBoardPath(last.slug, last.mode))
  }, [router])

  return (
    <main className="sh">
      <div className="sh-col sh-home">
        <header className="sh-home-head">
          <p className="hi">
            <Greeting />
          </p>
          <h1>{strings.homeTitle}</h1>
        </header>
        <label className="sh-input big">
          <MagnifyingGlass size={18} />
          <span className="sr-only">{strings.searchStation}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.searchPlaceholder}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="clear"
              aria-label={strings.clearSearch}
              onClick={() => setQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </label>
        {query ? (
          results.length ? (
            <section className="sh-card">
              <div className="sh-card-h">
                <h2>{strings.searchResults}</h2>
              </div>
              <ul className="sh-list" style={{ marginTop: 8 }}>
                {results.map((station) => (
                  <li key={station.slug}>
                    <Link href={boardHref(station.slug)}>
                      {station.name}
                      {station.city && station.city !== station.name && (
                        <small>{station.city}</small>
                      )}
                      <CaretRight size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <Message title={strings.noResults(query)} hint={strings.noResultsHint} />
          )
        ) : (
          <>
            {favouriteCount > 0 && (
              <div className="sh-chips">
                <button
                  type="button"
                  className="sh-toggle"
                  aria-pressed={onlyFavourites}
                  onClick={() => setOnlyFavourites((v) => !v)}
                >
                  {strings.favouriteStations}
                  <span className="n">{favouriteCount}</span>
                </button>
              </div>
            )}
            {loading && <Message title={strings.loading} />}
            {failed && (
              <Message
                title={strings.catalogueUnavailable}
                hint={strings.catalogueUnavailableHint}
              />
            )}
            <ul className="sh-grid">
              {shown.map((tile, i) => (
                <li key={tile.slug} style={{ '--i': Math.min(i, 8) } as CSSProperties}>
                  <Link href={boardHref(tile.slug)} className="sh-tile">
                    {tile.kind !== 'sug' && <span className="tag">{tile.tag}</span>}
                    <b>{titleCase(tile.name)}</b>
                    {tile.city && tile.city !== tile.name && <small>{tile.city}</small>}
                    <ArrowRight size={16} className="go" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  )
}

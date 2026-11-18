'use client'

/**
 * Station selection — the other page (ARCHITECTURE 4.1), seventh pass, "Vicino e tue": the
 * home answers "when is my next train" instead of "which station". It shows up to three live
 * cards, each a station with its next three departures as mini tickets: the nearest station
 * within 30 km (when the device position is allowed), then the reader's favourites, then
 * recents; a reader with none sees the major stations under "Grandi stazioni". Their other
 * stations are pills below. A query turns the cards into a list of results. Keeps the
 * session-scoped redirect to the last board (`lib/last-station`).
 *
 * The trains the reader follows come first, as mini tickets with their live platform and delay.
 *
 * RFI traffic: up to three board reads (`departures` or `arrivals`) of `/api/board/:slug` per
 * open, **once** — no polling here, the 20 s poll belongs to the board page. The followed
 * trains' stations win the budget, one read per station and mode (`lib/home-plan.ts`,
 * ARCHITECTURE 7.2).
 */
import { MapPin, Star, X } from '@phosphor-icons/react'
import type { BoardMode, BoardRow, Station } from '@tabellone/core'
import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react'
import { serviceLogo } from '@/components/board/brand-logos'
import { Logo, Message, rowKey } from '@/components/board/parts'
import { Pill, PlatformTile, Stub } from '@/components/board/ticket-list'
import { ClockFace } from '@/components/ui/clock-face'
import { SearchField } from '@/components/ui/search-field'
import { canonicalBoardPath } from '@/lib/board-routes'
import { operatorFill } from '@/lib/board-view'
import { type FollowedTrain, followKey, rowMatches, unfollow } from '@/lib/followed-trains'
import { minutesUntil, searchStations, titleCase, useClientValue, useNow } from '@/lib/format'
import { type HomeRead, planHomeReads, readKey } from '@/lib/home-plan'
import { consumeRedirect } from '@/lib/last-station'
import { formatDistance, type Nearest, nearestStation } from '@/lib/nearest-station'
import { formatTime } from '@/lib/presentation'
import { listFavourites, listRecents } from '@/lib/saved-stations'
import { trainDetailPath } from '@/lib/train-routes'
import { boardQueryKey, fetchBoardJson } from '@/lib/use-board'
import { useFollowedTrains } from '@/lib/use-followed-trains'
import { useStations } from '@/lib/use-stations'
import { strings } from '@/strings'

const href = (slug: string, mode: BoardMode = 'departures') => canonicalBoardPath(slug, mode)

const TRAINS_PER_CARD = 3
const MAX_RECENT_STATIONS = 6

type Mine = { slug: string; name: string; city?: string; fav: boolean }

/** Favourites first, then recents, then the major stations. */
function useMine(stations: Station[] | null): { favs: Mine[]; recents: Mine[]; majors: Mine[] } {
  const favourites = useClientValue(listFavourites, [])
  const recents = useClientValue(listRecents, [])
  return useMemo(() => {
    const cityOf = (slug: string) => stations?.find((s) => s.slug === slug)?.city || undefined
    const favs = favourites.map((f) => ({
      slug: f.slug,
      name: f.name,
      city: cityOf(f.slug),
      fav: true,
    }))
    const rec = recents
      .filter((r) => !favourites.some((f) => f.slug === r.slug))
      .map((r) => ({ slug: r.slug, name: r.name, city: cityOf(r.slug), fav: false }))
    const taken = new Set([...favs, ...rec].map((s) => s.slug))
    const majors = (stations ?? [])
      .filter((s) => s.isMajor && !taken.has(s.slug))
      .map((s) => ({ slug: s.slug, name: s.name, city: s.city || undefined, fav: false }))
    return { favs, recents: rec.slice(0, MAX_RECENT_STATIONS), majors }
  }, [stations, favourites, recents])
}

type NearState =
  | { state: 'idle' | 'asking' | 'denied' | 'unavailable' | 'far' }
  | { state: 'found'; station: Station; metres: number }

/**
 * The nearest station, from the device position. Asked for only when the reader taps the row —
 * unless the browser already says "granted", in which case there is nothing to ask. The
 * position is used on the device to pick a station and is never stored or sent.
 */
function useNearest(stations: Station[] | null) {
  const [near, setNear] = useState<NearState>({ state: 'idle' })
  const locate = () => {
    if (!stations) return
    if (!('geolocation' in navigator)) return setNear({ state: 'unavailable' })
    setNear({ state: 'asking' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const result: Nearest = nearestStation(stations, coords.latitude, coords.longitude)
        setNear(
          result.state === 'found'
            ? { state: 'found', station: result.station, metres: result.metres }
            : result.state === 'far'
              ? { state: 'far' }
              : { state: 'unavailable' },
        )
      },
      (err) => setNear({ state: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: `locate` closes over `stations`, which is the trigger
  useEffect(() => {
    if (!stations) return
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') locate()
      })
      .catch(() => {})
  }, [stations])
  return { near, locate }
}

type BoardResult = { data?: { rows: BoardRow[] }; isPending: boolean; isError: boolean } | undefined

/**
 * One read per planned (station, mode), no polling: the board page keeps the 20 s poll
 * (ADR-006). The plan is the budget (`planHomeReads`): never more than three.
 */
function useHomeBoards(reads: HomeRead[]): Map<string, BoardResult> {
  const results = useQueries({
    queries: reads.map((read) => ({
      queryKey: boardQueryKey(read.slug, read.mode),
      queryFn: () => fetchBoardJson(read.slug, read.mode),
      staleTime: 60_000,
      // Cold cache: three boards at once can meet the single-flight lock and answer 503 while
      // RFI is read. Retrying hits our cache, not RFI; the skeleton stays meanwhile.
      retry: 3,
      retryDelay: (attempt: number) => 2500 * (attempt + 1),
    })),
  })
  return useMemo(() => {
    const byRead = new Map<string, BoardResult>()
    reads.forEach((read, index) => {
      byRead.set(readKey(read), results[index])
    })
    return byRead
  }, [reads, results])
}

function ModeLinks({ slug }: { slug: string }) {
  return (
    <span className="ho-modes">
      <Link href={href(slug, 'departures')}>{strings.departures}</Link>
      <Link href={href(slug, 'arrivals')}>{strings.arrivals}</Link>
    </span>
  )
}

function MiniTicket({
  row,
  slug,
  now,
  index,
}: {
  row: BoardRow
  slug: string
  now: Date
  index: number
}) {
  return (
    <li
      className="mx"
      style={{ '--i': Math.min(index, 8), '--f': operatorFill(row) } as CSSProperties}
    >
      <Link className="mx-btn" href={href(slug)}>
        <Stub row={row} mode="departures" now={now} />
        <span className="mx-main">
          <span className="d">{titleCase(row.headsign)}</span>
          <span className="m">
            {serviceLogo(row).Logo && <Logo row={row} />}
            <span className="bn">{row.trainNumber}</span>
          </span>
        </span>
        <PlatformTile row={row} />
      </Link>
    </li>
  )
}

/**
 * A followed train as a mini ticket: live (platform and delay from its station's board), or —
 * while that board loads, or when it is not among the three the home reads — the timetable it
 * was followed with. A train the board no longer lists is muted, with a way to drop it.
 */
function FollowedTicket({
  train,
  result,
  now,
  index,
}: {
  train: FollowedTrain
  result: BoardResult
  now: Date
  index: number
}) {
  const href = trainDetailPath(train.slug, train.mode, train.trainNumber)
  const arrivals = train.mode === 'arrivals'
  const row = result?.data?.rows.find((candidate) => rowMatches(train, candidate)) ?? null
  const gone = Boolean(result?.data) && !row
  const station = titleCase(train.stationName)
  const place = arrivals ? strings.followedAtStation(station) : strings.followedFromStation(station)
  const destination = `${arrivals ? strings.fromPlaceLead : ''}${titleCase(train.headsign)}`
  return (
    <li
      className="mx ho-fol"
      data-state={row ? 'live' : gone ? 'gone' : 'static'}
      style={
        {
          '--i': Math.min(index, 8),
          '--f': row ? operatorFill(row) : 'var(--f-other)',
        } as CSSProperties
      }
    >
      <Link className="mx-btn" href={href}>
        {row ? (
          <Stub row={row} mode={train.mode} now={now} />
        ) : (
          <span className="tk-stub">
            <b>{formatTime(train.scheduledAt)}</b>
            <small>{gone ? '\u2014' : ''}</small>
          </span>
        )}
        <span className="mx-main">
          <span className="d">{destination}</span>
          <span className="m">
            {row && serviceLogo(row).Logo && <Logo row={row} />}
            <span className="bn">{train.trainNumber}</span>
            {row && <Pill row={row} mode={train.mode} />}
          </span>
          <span className="viam">{gone ? strings.followedGone : place}</span>
        </span>
        {row ? (
          <PlatformTile row={row} />
        ) : (
          <span className="mx-plat">
            {!gone && (
              <>
                <span className="bt-nd" role="img" aria-label={strings.platformToAssign}>
                  –
                </span>
                <span className="lbl">{strings.platformShort}.</span>
              </>
            )}
          </span>
        )}
      </Link>
      {gone && (
        <button
          type="button"
          className="ho-fol-x"
          aria-label={strings.followedRemove(train.trainNumber)}
          onClick={() => unfollow(followKey(train))}
        >
          <X weight="bold" aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

function FollowedSection({
  trains,
  boards,
  now,
}: {
  trains: FollowedTrain[]
  boards: Map<string, BoardResult>
  now: Date
}) {
  const soonestFirst = [...trains].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  )
  return (
    <section className="ho-card ho-fol-card" style={{ '--i': 0 } as CSSProperties}>
      <div className="ho-card-h">
        <div className="ho-card-name">
          <b>
            <span className="ho-star">
              <Star weight="fill" aria-hidden="true" />
            </span>
            {strings.followedTrainsHead}
          </b>
          <small>{strings.followedTrainsSub}</small>
        </div>
      </div>
      <div className="bt-list" data-flaps="true">
        <ul className="mx-list ho-mini">
          {soonestFirst.map((train, i) => (
            <FollowedTicket
              key={followKey(train)}
              train={train}
              result={boards.get(readKey(train))}
              now={now}
              index={i}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}

/** One station, its next three departures, live. */
function StationCard({
  station,
  board,
  now,
  index,
  sub,
}: {
  station: Mine
  board: BoardResult
  now: Date
  index: number
  sub: ReactNode
}) {
  const next = (board?.data?.rows ?? [])
    .filter((r) => minutesUntil(r, now) >= -1 && r.status !== 'CANCELLED')
    .sort((a, b) => minutesUntil(a, now) - minutesUntil(b, now))
    .slice(0, TRAINS_PER_CARD)
  return (
    <section className="ho-card" style={{ '--i': index } as CSSProperties}>
      <div className="ho-card-h">
        <Link className="ho-card-name" href={href(station.slug)}>
          <b>
            {station.fav && (
              <span className="ho-star">
                <Star weight="fill" aria-hidden="true" />
              </span>
            )}
            {titleCase(station.name)}
          </b>
          <small>{sub}</small>
        </Link>
        <ModeLinks slug={station.slug} />
      </div>
      {board?.isPending ? (
        <div className="bt-skel" data-kind="rows" role="status" aria-label={strings.loading}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
      ) : board?.isError ? (
        <p className="hd-note">{strings.cardUnavailable}</p>
      ) : next.length === 0 ? (
        <p className="hd-note">{strings.cardNoDepartures}</p>
      ) : (
        <div className="bt-list" data-flaps="true">
          <ul className="mx-list ho-mini">
            {next.map((row, i) => (
              <MiniTicket key={rowKey(row)} row={row} slug={station.slug} now={now} index={i} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Pills({ stations }: { stations: Mine[] }) {
  return (
    <div className="ho-pills">
      {stations.map((s) => (
        <Link key={s.slug} href={href(s.slug)}>
          {s.fav && (
            <span className="ho-star">
              <Star weight="fill" aria-hidden="true" />
            </span>
          )}
          {titleCase(s.name)}
        </Link>
      ))}
    </div>
  )
}

function Results({
  stations,
  query,
  loading,
  failed,
}: {
  stations: Station[] | null
  query: string
  loading: boolean
  failed: boolean
}) {
  const results = searchStations(stations, query, 20)
  if (loading && !stations) return <p className="hd-note">{strings.loadingCatalogue}</p>
  if (failed && !stations)
    return <Message title={strings.catalogueUnavailable} hint={strings.catalogueUnavailableHint} />
  if (!results.length)
    return <Message title={strings.noResults(query.trim())} hint={strings.noResultsHint} />
  return (
    <section>
      <h2 className="ho-h">{strings.stationsHead}</h2>
      <ul className="ho-rows">
        {results.map((s, i) => (
          <li key={s.slug} className="ho-row" style={{ '--i': Math.min(i, 8) } as CSSProperties}>
            <Link className="ho-name" href={href(s.slug)}>
              <span>
                <b>{titleCase(s.name)}</b>
                {s.city && s.city !== s.name && <small>{s.city}</small>}
              </span>
            </Link>
            <ModeLinks slug={s.slug} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HomeScreen() {
  const router = useRouter()
  const { stations, loading, failed } = useStations()
  const [query, setQuery] = useState('')
  const now = useNow(30_000)
  const { favs, recents, majors } = useMine(stations)
  const { near, locate } = useNearest(stations)
  const followed = useFollowedTrains(now)

  // Once per session: a reader who was on a board goes straight back to it.
  useEffect(() => {
    const last = consumeRedirect()
    if (last) router.replace(canonicalBoardPath(last.slug, last.mode))
  }, [router])

  const nearSlug = near.state === 'found' ? near.station.slug : null
  const nearMine: Mine | null =
    near.state === 'found'
      ? {
          slug: near.station.slug,
          name: near.station.name,
          city: near.station.city || undefined,
          fav: favs.some((f) => f.slug === nearSlug),
        }
      : null
  const own = [...favs, ...recents].filter((s) => s.slug !== nearSlug)
  const personal = [...(nearMine ? [nearMine] : []), ...own]
  const fallback = personal.length === 0
  const candidates = fallback ? majors : personal
  // The budget is three board reads: the followed trains' stations first, the cards after.
  const reads = useMemo(
    () =>
      planHomeReads(
        followed,
        candidates.map((s) => s.slug),
      ),
    [followed, candidates],
  )
  const boards = useHomeBoards(reads)
  const shown = candidates.filter((s) => boards.has(readKey({ slug: s.slug, mode: 'departures' })))
  const shownSlugs = new Set(shown.map((s) => s.slug))
  const rest = fallback ? [] : own.filter((s) => !shownSlugs.has(s.slug))

  const subOf = (s: Mine) =>
    s.slug === nearSlug && near.state === 'found' ? (
      <span className="ho-tag" data-kind="near">
        <MapPin weight="bold" aria-hidden="true" /> {strings.nearYou(formatDistance(near.metres))}
      </span>
    ) : fallback ? (
      <span className="ho-tag">{strings.bigStation(s.city)}</span>
    ) : (
      <span className="ho-tag">{strings.savedTag(s.fav, s.city)}</span>
    )

  return (
    <main className="sh bt">
      <div className="bt-wrap hd-wrap ho">
        <header className="ho-top">
          <div className="row">
            <span className="ho-mark">{strings.appName}</span>
            <ClockFace />
          </div>
          <h1>{strings.homeTitle}</h1>
        </header>
        <div className="hd-cerca ho-search">
          <SearchField
            value={query}
            onChange={setQuery}
            label={strings.searchStation}
            placeholder={strings.homeSearchPlaceholder}
          />
        </div>
        {query.trim() ? (
          <Results stations={stations} query={query} loading={loading} failed={failed} />
        ) : (
          <>
            {followed.length > 0 && <FollowedSection trains={followed} boards={boards} now={now} />}
            {(near.state === 'idle' || near.state === 'asking') && (
              <button
                type="button"
                className="ho-locate"
                onClick={locate}
                disabled={near.state === 'asking' || !stations}
              >
                <MapPin weight="bold" aria-hidden="true" />
                <span>
                  <b>{near.state === 'asking' ? strings.locating : strings.locate}</b>
                  <small>{strings.locatePrivacy}</small>
                </span>
              </button>
            )}
            {near.state === 'far' && (
              <p className="hd-note ho-locnote">
                <MapPin weight="bold" aria-hidden="true" /> {strings.nothingNear}
              </p>
            )}
            {failed && !stations && (
              <Message
                title={strings.catalogueUnavailable}
                hint={strings.catalogueUnavailableHint}
              />
            )}
            {fallback && shown.length > 0 && <h2 className="ho-h">{strings.bigStations}</h2>}
            <div className="ho-live">
              {shown.map((s, k) => (
                <StationCard
                  key={s.slug}
                  station={s}
                  board={boards.get(readKey({ slug: s.slug, mode: 'departures' }))}
                  now={now}
                  index={k}
                  sub={subOf(s)}
                />
              ))}
            </div>
            {rest.length > 0 && (
              <section>
                <h2 className="ho-h">{strings.otherYourStations}</h2>
                <Pills stations={rest} />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}

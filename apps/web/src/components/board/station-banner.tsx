'use client'

/**
 * The station's head: the two things a reader does to a station. Row one is the city and
 * the follow control — a labelled pill whose pressed state is the accent ("Segui" →
 * "Seguita"); row two is the name, which is the switcher: a link home with a chevron in a
 * small disc. The name gets the whole width, so a long one wraps without squeezing the pill.
 */
import { CaretDown, Heart } from '@phosphor-icons/react'
import Link from 'next/link'
import { titleCase } from '@/lib/format'
import { strings } from '@/strings'

export function StationBanner({
  stationName,
  city,
  favourite,
}: {
  stationName: string
  city?: string
  favourite?: { active: boolean; onToggle: () => void }
}) {
  return (
    <header className="sh-head">
      <div className="row">
        <small>{city || strings.stationLabel}</small>
        {favourite && (
          <button
            type="button"
            className="sh-follow"
            aria-pressed={favourite.active}
            aria-label={favourite.active ? strings.unfollow : strings.follow}
            onClick={favourite.onToggle}
          >
            <Heart size={15} weight={favourite.active ? 'fill' : 'bold'} />
            {favourite.active ? strings.followingLabel : strings.followLabel}
          </button>
        )}
      </div>
      <Link href="/" className="sh-switch" title={strings.changeStation}>
        <h1>{titleCase(stationName)}</h1>
        <i aria-hidden="true">
          <CaretDown size={14} weight="bold" />
        </i>
        <span className="sr-only">{strings.changeStation}</span>
      </Link>
    </header>
  )
}

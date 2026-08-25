'use client'

/**
 * The app shell's one persistent header. Before this existed each screen invented its own
 * top area, so the product had no identity above the fold and no fixed place to look for
 * "where am I".
 *
 * Sticky, 64px, one line at every width (Section 4.7: a two-line nav at desktop is broken
 * design). It carries the mark, an optional condensed title, and up to two actions.
 *
 * The condensed title is the only motion here and it earns its place: once the board's own
 * heading has scrolled away, the station name slides up into the header so the reader is
 * never looking at a list of times without knowing whose times they are. Height is fixed
 * while it happens — the swap is `transform` and `opacity` on the inner spans — so nothing
 * below the header reflows mid-scroll.
 */
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Wordmark } from '@/components/shell/wordmark'
import { strings } from '@/strings'

export function AppHeader({
  /** Shown in place of the mark once the page's own heading has scrolled away. */
  condensedTitle,
  condensed = false,
  actions,
}: {
  condensedTitle?: string
  condensed?: boolean
  actions?: ReactNode
}) {
  const showTitle = condensed && Boolean(condensedTitle)
  return (
    <header className="sticky top-0 z-30 border-line-strong border-b bg-surface">
      <div className="mx-auto flex h-16 max-w-(--content-max-width) items-center justify-between gap-4 px-(--screen-margin)">
        {/* Both layers occupy the same grid cell, so neither one's entry moves the other. */}
        <div className="grid min-w-0 flex-1 grid-cols-1 grid-rows-1 items-center">
          <span
            className="col-start-1 row-start-1 min-w-0"
            style={{
              transition: 'var(--motion-header)',
              opacity: showTitle ? 0 : 1,
              transform: showTitle ? 'translateY(-8px)' : 'none',
              // The layer that is out cannot swallow the tap that belongs to the one that
              // is in: they overlap exactly.
              pointerEvents: showTitle ? 'none' : undefined,
            }}
          >
            <Link href="/" className="inline-flex no-underline" aria-label={strings.appHome}>
              <Wordmark />
            </Link>
          </span>
          <span
            aria-hidden={!showTitle}
            className="col-start-1 row-start-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-text-primary type-secondary type-wide uppercase"
            style={{
              fontWeight: 'var(--weight-max)',
              letterSpacing: 'var(--track-label)',
              transition: 'var(--motion-header)',
              opacity: showTitle ? 1 : 0,
              transform: showTitle ? 'none' : 'translateY(8px)',
              pointerEvents: showTitle ? undefined : 'none',
            }}
          >
            {condensedTitle}
          </span>
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

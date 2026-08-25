/**
 * The service mark: the logo's cell-and-bar glyph plus the product name.
 *
 * Same geometry as `public/icons/favicon.svg` (the plate is dropped — inside the app the
 * page already provides the ground the plate exists to give a favicon), drawn in
 * `--brand-mark` so it re-tunes per theme instead of being one fixed teal that reads on
 * white and disappears on near-black. The wordmark is set in the app's own family; there is
 * no separate logotype asset, and inventing one would be a brand change, not a redesign.
 */
import { strings } from '@/strings'

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex flex-none items-center gap-2 text-text-primary">
      <svg
        viewBox="0 0 512 512"
        width={compact ? 18 : 22}
        height={compact ? 18 : 22}
        aria-hidden="true"
        className="flex-none"
      >
        {/* The favicon's rounded cell and bar, squared off to the board's own corner rule
            (theme.css, CORNERS). The mark is the same two shapes in the same places; only
            the radius follows the system the rest of the app follows. */}
        <rect x="84" y="170" width="180" height="172" fill="var(--brand-mark)" />
        <rect x="300" y="228" width="136" height="56" fill="currentColor" />
      </svg>
      {!compact && (
        <span
          className="type-secondary type-wide uppercase"
          style={{ fontWeight: 'var(--weight-max)', letterSpacing: '0.06em' }}
        >
          {strings.appName}
        </span>
      )}
    </span>
  )
}

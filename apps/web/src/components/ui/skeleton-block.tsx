'use client'

/**
 * One placeholder block. Used by every "shape-matched skeleton" in the app (board rows,
 * station list), which is why it lives here rather than next to its first caller: a
 * skeleton only does its job — nothing jumps when the data lands — if all of them share
 * the same geometry, border and rhythm.
 *
 * Under `prefers-reduced-motion` the pulse flattens (theme.css redefines `tab-skeleton` by
 * name) and the block stays a static placeholder.
 */
export function SkeletonBlock({
  height,
  width,
  index,
}: {
  height: string
  width?: string
  /** Position in the list: drives the same entry stagger the real rows use. */
  index: number
}) {
  return (
    <span
      aria-hidden="true"
      className="block animate-skeleton rounded-minimal border border-line bg-surface-raised"
      style={{
        height,
        width: width ?? '100%',
        // The same stagger the real rows use on entry, so the placeholders and the rows
        // that replace them breathe on the same rhythm.
        animationDelay: `calc(${index} * var(--stagger-delay))`,
      }}
    />
  )
}

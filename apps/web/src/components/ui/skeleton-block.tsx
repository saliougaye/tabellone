'use client'

/**
 * One placeholder block. Used by every shape-matched skeleton in the app (board rows,
 * station list), which is why it lives here rather than next to its first caller: a
 * skeleton only does its job — nothing jumps when the data lands — if all of them share
 * the same geometry, border and rhythm.
 *
 * The block holds a low steady opacity and a highlight sweeps across it, left to right
 * (theme.css §6). A pulse says "something is happening here"; a sweep says "and it is
 * still moving, in this direction", which is the difference between a screen that looks
 * busy and one that looks stuck. The sweep is a `transform` on a child, so the block
 * itself never repaints.
 *
 * Under `prefers-reduced-motion` both keyframes flatten by name and the block stays a
 * static placeholder.
 */
import { staggerDelay } from '@/lib/stagger'

export function SkeletonBlock({
  height,
  width,
  index,
}: {
  height: string
  width?: string
  /** Position in the list: drives the same capped entry stagger the real rows use. */
  index: number
}) {
  return (
    <span
      aria-hidden="true"
      className="relative block animate-skeleton overflow-hidden border-line border-b bg-surface-raised"
      style={{
        height,
        width: width ?? '100%',
        // The same cascade the real rows use on entry, so the placeholders and the rows
        // that replace them breathe on the same rhythm.
        animationDelay: staggerDelay(index),
      }}
    >
      <span
        className="absolute inset-y-0 block w-1/3 animate-skeleton-sweep"
        style={{
          // Travels in --surface-pressed rather than in white: the sweep has to read in
          // both themes, and a light highlight on a dark placeholder is a flashlight.
          background: 'linear-gradient(90deg, transparent, var(--surface-pressed), transparent)',
          animationDelay: staggerDelay(index),
        }}
      />
    </span>
  )
}

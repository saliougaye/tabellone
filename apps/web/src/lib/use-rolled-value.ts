'use client'

/**
 * Rolls the dominant time of a row when its delay changes, with the shape the news had:
 * `--anim-value-worse` when the delay grew, `--anim-value-better` when it shrank. The two
 * keyframes are deliberately asymmetric (theme.css §6.3) — bad news should not feel like
 * good news played backwards — which is why they are named after the news rather than after
 * a direction. Both are `both`-filled, so they only play on a fresh DOM node: the caller
 * puts the returned `key` on the span, which is what makes React mount one.
 *
 * The previous delay is kept with the adjust-state-during-render pattern rather than an
 * effect: an effect would compare after the paint, so the roll would start one frame late
 * and against a digit that had already been swapped.
 */
import { useState } from 'react'

export type RollDirection = '' | 'animate-value-worse' | 'animate-value-better'

export type RolledValue = {
  /** Changes exactly when `delayMinutes` does. Put it on the element that rolls. */
  key: number
  className: RollDirection
}

/**
 * No delay and a delay of zero are different values (one is "we do not know of any", the
 * other is "measured, on time") but the same number of minutes, so the transition between
 * them re-mounts the digit without rolling it: there is no direction in it.
 */
function direction(previous: number | null, next: number | null): RollDirection {
  const from = previous ?? 0
  const to = next ?? 0
  if (to > from) return 'animate-value-worse'
  if (to < from) return 'animate-value-better'
  return ''
}

export function useRolledValue(delayMinutes: number | null): RolledValue {
  const [state, setState] = useState<{
    previous: number | null
    key: number
    className: RollDirection
  }>({ previous: delayMinutes, key: 0, className: '' })

  if (state.previous !== delayMinutes) {
    const next = {
      previous: delayMinutes,
      key: state.key + 1,
      className: direction(state.previous, delayMinutes),
    }
    setState(next)
    return { key: next.key, className: next.className }
  }
  return { key: state.key, className: state.className }
}

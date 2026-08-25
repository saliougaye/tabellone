'use client'

/**
 * True once the referenced element has scrolled off the top of the viewport.
 *
 * `IntersectionObserver`, never a scroll listener: a `scroll` handler runs on every frame
 * the user drags, off the compositor thread, and this one would run on a page that is
 * already animating a live list. The observer fires twice in the lifetime of a screen.
 *
 * `rootMargin` is the header's own height, so the flag flips exactly when the element
 * disappears *behind the header* rather than when it leaves the viewport underneath it.
 */
import { type RefObject, useEffect, useState } from 'react'

/** Mirrors the sticky header's height in `AppHeader`. */
const HEADER_HEIGHT = 64

export function useScrolledPast(ref: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return
        // Only "above the top edge" counts. An element scrolled past the *bottom* of the
        // viewport is also not intersecting, and on a short board that is the state the
        // page loads in — without this check the header would open condensed.
        setPast(!entry.isIntersecting && entry.boundingClientRect.top < HEADER_HEIGHT)
      },
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`, threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return past
}

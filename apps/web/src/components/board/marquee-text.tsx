'use client'

/**
 * A single line of text that scrolls back and forth when it is wider than its container,
 * instead of being clipped. Used for the station name: "MILANO CENTRALE" at `type-plate`
 * does not fit 375px, and a truncated station name is a wrong station name.
 *
 * The animation only exists when the text really overflows — measured, never assumed —
 * so short names stay perfectly still. Under `prefers-reduced-motion` there is no
 * scrolling to fall back to (no keyframe can reveal hidden text), so the line is allowed
 * to wrap instead: no movement, no information lost.
 */
import { useEffect, useRef, useState } from 'react'

/** px per second. Slow enough to read a station name at a glance, ~2× a news ticker. */
const SCROLL_SPEED = 45
/** Time held still at each end of the run, so the start of the name is readable. */
const EDGE_PAUSE_MS = 1600

export function MarqueeText({ text, className = '' }: { text: string; className?: string }) {
  const viewport = useRef<HTMLSpanElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const box = viewport.current
    const line = content.current
    if (!box || !line) return
    // The transform does not affect either box, so observing both cannot feed itself.
    const measure = () => setOverflow(Math.max(0, Math.ceil(line.scrollWidth - box.clientWidth)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(line)
    return () => observer.disconnect()
    // No `text` dep: a name change that changes the width resizes the inline-block line,
    // and the observer above is watching exactly that.
  }, [])

  const scrolling = overflow > 0 && !reducedMotion

  return (
    <span
      ref={viewport}
      className={`block ${reducedMotion ? '' : 'overflow-hidden'} ${className}`}
      // The scrolling copy is one line of plain text, so nothing is announced twice;
      // the title attribute only helps a mouse user who arrives mid-run.
      title={overflow > 0 ? text : undefined}
    >
      <span
        ref={content}
        className={`inline-block ${reducedMotion ? '' : 'whitespace-nowrap'} ${scrolling ? 'animate-marquee' : ''}`}
        style={
          scrolling
            ? ({
                '--marquee-distance': `${overflow}px`,
                // Not a custom property: `--anim-marquee` is declared on :root, so a var
                // inside it would already be substituted there, never here.
                animationDuration: `${Math.round((overflow / SCROLL_SPEED) * 2000 + EDGE_PAUSE_MS * 2)}ms`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </span>
  )
}

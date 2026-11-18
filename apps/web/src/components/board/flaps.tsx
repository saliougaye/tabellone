'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'

/**
 * A platform as a split-flap tile: black, figures that roll in once and flip when RFI changes
 * them. Flat until something changes — a board of forty tickets does not rattle for 20 s.
 * Under `prefers-reduced-motion` nothing rolls on mount (the CSS also stops the flip).
 */
const POOL = '0123456789ABCDEFGHJKLMNPRSTUVZ'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** One character. Four layers (top, bottom, and the two halves that fall) only while it flips. */
function FlapChar({ ch, delay = 0, roll = false }: { ch: string; delay?: number; roll?: boolean }) {
  const previous = useRef(ch)
  const [anim, setAnim] = useState<{ from: string; delay: number } | null>(() =>
    roll && !reducedMotion()
      ? { from: POOL[Math.floor(Math.random() * POOL.length)] ?? '0', delay }
      : null,
  )
  useEffect(() => {
    if (previous.current !== ch) {
      setAnim({ from: previous.current, delay: 0 })
      previous.current = ch
    }
  }, [ch])
  useEffect(() => {
    if (!anim) return
    const timer = window.setTimeout(() => setAnim(null), anim.delay + 340)
    return () => window.clearTimeout(timer)
  }, [anim])
  if (!anim)
    return (
      <span className="bt-fc">
        <span className="flat">{ch}</span>
      </span>
    )
  return (
    <span className="bt-fc" style={{ '--d': `${anim.delay}ms` } as CSSProperties}>
      <span className="top">
        <i>{ch}</i>
      </span>
      <span className="bot">
        <i>{anim.from}</i>
      </span>
      <span className="ftop">
        <i>{anim.from}</i>
      </span>
      <span className="fbot">
        <i>{ch}</i>
      </span>
    </span>
  )
}

export function Flaps({
  text,
  roll = false,
  delay = 0,
  label,
}: {
  text: string
  /** Roll the figures in on mount (the first screenful only). */
  roll?: boolean
  delay?: number
  /** The accessible name; the tile itself is decoration. */
  label?: string
}) {
  return (
    <span className="bt-flaps" role="img" aria-label={label ?? text}>
      {[...text].map((char, index) =>
        /[0-9A-Z]/i.test(char) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: a platform is two or three characters, positional by nature
          <FlapChar key={index} ch={char.toUpperCase()} roll={roll} delay={delay + index * 45} />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: same
          <span key={index} className="bt-sep">
            {char}
          </span>
        ),
      )}
    </span>
  )
}

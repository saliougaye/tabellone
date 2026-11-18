'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * True for a moment after `value` changes (never on mount): the hook behind every live flash —
 * a platform that was just assigned, a delay that just grew. The poll replaces the board every
 * 20 s; this is what makes the change visible instead of silent.
 */
export function useFlash<T>(value: T, ms = 2200): boolean {
  const previous = useRef(value)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    setOn(true)
    const timer = window.setTimeout(() => setOn(false), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return on
}

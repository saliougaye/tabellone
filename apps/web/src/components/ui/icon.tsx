'use client'

/**
 * The app's one icon family: Phosphor, regular weight, 1.5-equivalent stroke, sized from
 * the type scale rather than from arbitrary pixel values.
 *
 * Everything that is not a brand mark comes from here. Hand-drawn SVG paths for ordinary
 * chrome (a pin, a chevron, a magnifier) are how an interface ends up with five slightly
 * different strokes and no way to change any of them at once.
 *
 * The exception, and it is a deliberate one: `components/board/brand-logos.tsx`. Those are
 * real service marks traced from the operators' own assets, they draw in `currentColor`,
 * and no icon library has them. They are content, not chrome.
 */
import { IconContext } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

/**
 * One weight for the whole UI. `regular` rather than `bold`: the board is dense with
 * tabular figures at four type levels, and a heavy icon next to `--type-tertiary` text
 * reads as a second emphasis the hierarchy did not ask for.
 */
export function IconProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: 'regular', mirrored: false }}>
      {children}
    </IconContext.Provider>
  )
}

/**
 * Icon sizes, named after the type level they sit beside rather than after their pixels,
 * so an icon follows its text when the scale moves at a breakpoint.
 */
export const iconSize = {
  /** beside --type-tertiary: metadata, freshness, captions */
  meta: 14,
  /** beside --type-secondary: controls, list affordances */
  control: 18,
  /** beside --type-primary: headers, station names */
  header: 22,
  /** empty and error states: the one large glyph on the screen */
  display: 40,
} as const

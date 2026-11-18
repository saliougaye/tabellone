'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { strings } from '@/strings'

/**
 * Escape closes, and focus goes back to whatever opened it. Shared by every layer the seventh
 * pass draws over the board (the station switcher, a strike's sheet, a ticket): the one place
 * that says how a layer behaves for a keyboard.
 */
export function useLayerKeys(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])
}

/** The veil behind a layer: a tap outside closes it. Keyboard users have Escape. */
export function Veil({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <button
      type="button"
      className="tk-veil"
      data-open={open}
      tabIndex={-1}
      aria-label={strings.closeSheet}
      onClick={onClose}
    />
  )
}

/**
 * A sheet over the page: from the bottom on a phone, a centred dialog from 640px. Always
 * mounted and `inert` while closed, so it can animate both ways instead of popping.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  useLayerKeys(open, onClose)
  return (
    <>
      <Veil open={open} onClose={onClose} />
      <section
        className="hd-sheet"
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="tk-grab hd-grab" />
        {children}
      </section>
    </>
  )
}

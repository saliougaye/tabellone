'use client'

/**
 * Bottom sheet with native-app behaviour, on `vaul` (a drawer built over Radix Dialog).
 *
 * The first version of this was a hand-rolled `<dialog>` with two keyframes. It opened and
 * closed correctly but did not *feel* like a sheet: a sheet on a phone is something you
 * push back down with your thumb, and that is drag tracking, rubber-banding past the top
 * edge, and a release that decides by velocity — not only by distance — whether the panel
 * returns or leaves. That is the whole reason for the dependency; the rest of vaul (Radix
 * focus trap, Esc, inert background, scroll lock, keyboard-aware input repositioning) also
 * replaces code we were maintaining here.
 *
 * Motion therefore comes from vaul, not from `theme.css`: it applies the iOS sheet curve
 * (`cubic-bezier(0.32, 0.72, 0, 1)`) inline while transforming, and inline styles cannot be
 * re-declared from a stylesheet. `theme.css` keeps only the `prefers-reduced-motion`
 * override, which has to be `!important` for the same reason.
 *
 * Colours, radii, spacing and the touch minimum still come from the tokens.
 */
import { Drawer } from 'vaul'
import { strings } from '@/strings'

export type BottomSheetProps = {
  open: boolean
  onClose: () => void
  /** Sheet title, also the dialog's accessible name. */
  title: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      // The page shrinks behind the sheet, as iOS does for modals. Needs the
      // `data-vaul-drawer-wrapper` element in the layout to have something to scale.
      shouldScaleBackground
      // vaul would otherwise force `background: black` on the body for the strip revealed
      // around the scaled page. The overlay already covers that strip with --veil-modal, so
      // the black adds nothing while the sheet is open and flashes through in the light
      // theme once the veil has faded on close.
      setBackgroundColorOnScale={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-veil-modal" />
        <Drawer.Content
          // No description: without this Radix logs a missing-`aria-describedby` warning.
          aria-describedby={undefined}
          // Fixed height, not max-height: a sheet whose height follows its content resizes
          // when the catalogue lands and again on every search keystroke. Phone sheets sit
          // at a detent and scroll inside it.
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col rounded-t-(--corner-field) border-t border-line-strong bg-surface outline-none"
        >
          {/* vaul injects its handle rule at runtime (hardcoded light grey, 5px), so the
              token has to outrank an injected stylesheet: inline wins without !important.
              The 44px drag hit area around it is vaul's own. */}
          <Drawer.Handle
            style={{
              // The panel is a flex column holding an overflowing list, so the handle needs
              // to opt out of shrinking or the list crushes it to nothing.
              flex: 'none',
              height: '4px',
              width: '36px',
              marginTop: 'var(--sp-3)',
              marginBottom: 'var(--sp-3)',
              background: 'var(--line-strong)',
              opacity: 1,
            }}
          />
          <div className="flex flex-none items-center justify-between gap-3 border-b border-line px-4 pb-3">
            <Drawer.Title className="m-0 text-text-tertiary type-label">{title}</Drawer.Title>
            <Drawer.Close
              aria-label={strings.closeSheet}
              className="inline-flex flex-none cursor-pointer items-center justify-center rounded-minimal border border-line bg-transparent text-text-secondary min-h-(--touch-min) min-w-(--touch-min)"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </Drawer.Close>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{
              padding: 'var(--sp-4) var(--sp-4) calc(var(--sp-6) + env(safe-area-inset-bottom))',
            }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

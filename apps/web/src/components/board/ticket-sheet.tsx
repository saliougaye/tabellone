'use client'

/**
 * One ticket, opened: a band in the operator's colour with the route drawn large, the platform,
 * the state and the countdown, the stops, and what to do with the train — follow it, or share
 * the link. This sheet *is* the train's page (ADR-012): its open state lives in the URL, so
 * `row` and `missing` come from the route and `onClose` goes back. A bottom sheet on a phone —
 * drag it down to close — and a centred dialog from 640px.
 *
 * A train URL whose train has left the board is not an error: a small sheet says so and leads
 * back to the board.
 */
import { ShareNetwork, Star, Train, X } from '@phosphor-icons/react'
import type { BoardMode, BoardRow } from '@tabellone/core'
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { useLayerKeys, Veil } from '@/components/ui/sheet'
import {
  formatTicketDuration,
  operatorFill,
  platformOf,
  stubCountdown,
  ticketPill,
  ticketRoute,
} from '@/lib/board-view'
import { titleCase } from '@/lib/format'
import { categoryLabel, serviceLabel } from '@/lib/presentation'
import { strings } from '@/strings'
import { Logo } from './parts'

const DRAG_CLOSE_PX = 120
const DRAG_FLICK_PX_PER_MS = 0.11

/** A time on the route: struck and replaced when late, a dash when RFI does not say. */
function EndTime({ time, late }: { time: string | null; late: string | null }) {
  if (!time) return <>—</>
  if (!late) return <>{time}</>
  return (
    <>
      <s>{time}</s>
      <span className="ylw">{late}</span>
    </>
  )
}

export function TicketSheet({
  row: openRow,
  missing: openMissing,
  mode,
  now,
  stationName,
  followed,
  onToggleFollow,
  onClose,
}: {
  /** The ticket to show; `null` closes the sheet (and keeps the last one drawn while it slides out). */
  row: BoardRow | null
  /** A train number in the URL that is not on the board (any more): the "gone" sheet. */
  missing: string | null
  mode: BoardMode
  now: Date
  stationName: string
  followed: boolean
  /** Follows or unfollows; answers whether the train is followed now. */
  onToggleFollow: (row: BoardRow) => boolean
  onClose: () => void
}) {
  const open = openRow !== null || openMissing !== null
  const last = useRef<BoardRow | null>(null)
  const lastMissing = useRef<string | null>(null)
  if (openRow) last.current = openRow
  if (openMissing) lastMissing.current = openMissing
  const row = openRow ?? (openMissing ? null : last.current)
  const missing = openMissing ?? (openRow ? null : lastMissing.current)

  const sheet = useRef<HTMLElement>(null)
  const drag = useRef<{ startY: number; startAt: number; dy: number } | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  useLayerKeys(open, onClose)
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() =>
      sheet.current?.querySelector<HTMLElement>('.tk-x')?.focus({ preventScroll: true }),
    )
    return () => cancelAnimationFrame(frame)
  }, [open])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const say = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2000)
  }

  // Drag-down to close, on the band, on phones only. A flick is as good as a long pull.
  const onDown = (event: PointerEvent) => {
    if (window.innerWidth >= 640 || (event.target as HTMLElement).closest('button')) return
    drag.current = { startY: event.clientY, startAt: performance.now(), dy: 0 }
    sheet.current?.setPointerCapture(event.pointerId)
    if (sheet.current) sheet.current.style.transition = 'none'
  }
  const onMove = (event: PointerEvent) => {
    const gesture = drag.current
    if (!gesture || !sheet.current) return
    gesture.dy = event.clientY - gesture.startY
    // Pulling up resists (a sixth of the distance); pulling down follows the finger.
    sheet.current.style.translate = `0 ${gesture.dy > 0 ? gesture.dy : gesture.dy / 6}px`
  }
  const onUp = () => {
    const gesture = drag.current
    if (!gesture || !sheet.current) return
    drag.current = null
    sheet.current.style.transition = ''
    sheet.current.style.translate = ''
    const speed = Math.abs(gesture.dy) / (performance.now() - gesture.startAt)
    if (gesture.dy > DRAG_CLOSE_PX || (gesture.dy > 10 && speed > DRAG_FLICK_PX_PER_MS)) onClose()
  }

  let body = null
  if (!row && missing) {
    const departures = mode === 'departures'
    body = (
      <div className="tk-gone">
        <div className="tk-grab" />
        <div className="tk-row">
          <span className="nm" id="tk-title">
            {strings.trainLabel(missing)}
          </span>
          <button className="tk-x" type="button" onClick={onClose} aria-label={strings.closeSheet}>
            <X weight="bold" />
          </button>
        </div>
        <h2>{strings.trainGoneTitle}</h2>
        <p>{strings.trainGoneBody(missing, departures, titleCase(stationName))}</p>
        <button type="button" className="tk-gone-go" onClick={onClose}>
          {departures ? strings.seeAllDepartures : strings.seeAllArrivals}
        </button>
      </div>
    )
  } else if (row) {
    const departures = mode === 'departures'
    const route = ticketRoute(row, mode, stationName)
    const platform = platformOf(row)
    const pill = ticketPill(row, mode, true)
    body = (
      <>
        <div
          className="tk-band"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="tk-grab" />
          <div className="tk-row">
            <Logo row={row} large />
            <span className="nm" id="tk-title">
              {serviceLabel(row)} {row.trainNumber} <span>· {categoryLabel[row.category]}</span>
            </span>
            <button
              className="tk-x"
              type="button"
              onClick={onClose}
              aria-label={strings.closeSheet}
            >
              <X weight="bold" />
            </button>
          </div>
          <div className="tk-route">
            <div>
              <div className="v">
                <EndTime time={route.from.time} late={route.from.late} />
              </div>
              <div className="n">{route.from.place}</div>
            </div>
            <div className="mid">
              <Train weight="bold" />
              {route.durationMinutes != null ? formatTicketDuration(route.durationMinutes) : ''}
            </div>
            <div className="r">
              <div className="v">
                <EndTime time={route.to.time} late={route.to.late} />
              </div>
              <div className="n">{route.to.place}</div>
            </div>
          </div>
        </div>
        <div className="tk-fields">
          <div>
            <div className="k">{strings.platform}</div>
            <div className="v">{platform ?? '—'}</div>
            {!platform && <div className="note">{strings.platformToAssignLower}</div>}
          </div>
          <div>
            <div className="k">{strings.stateHead}</div>
            <div className="v sm">
              {pill && <span className={`tk-pill ${pill.tone}`}>{pill.text}</span>}
            </div>
          </div>
          <div>
            <div className="k">{departures ? strings.departsHead : strings.arrivesHead}</div>
            <div className="v sm">{stubCountdown(row, mode, now)}</div>
          </div>
        </div>
        {route.stops.length ? (
          <section className="tk-stops" aria-label={strings.stopsHead(route.stops.length)}>
            <h3>{strings.stopsHead(route.stops.length)}</h3>
            <ol>
              {route.stops.map((stop) => (
                <li key={stop.name + stop.time} className="tk-stop">
                  <time>{stop.time}</time>
                  <span>{stop.name}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <p className="tk-note">
            {departures ? strings.noStopsDepartures : strings.noStopsArrivals}
          </p>
        )}
        <div className="tk-act">
          <button
            type="button"
            className="primary"
            aria-pressed={followed}
            onClick={() =>
              say(
                onToggleFollow(row)
                  ? strings.followTrainToast(row.trainNumber)
                  : strings.unfollowTrainToast,
              )
            }
          >
            <Star weight={followed ? 'fill' : 'bold'} />
            {followed ? strings.followingTrain : strings.followTrain}
          </button>
          <button
            type="button"
            aria-label={strings.share}
            style={{ flex: '0 0 52px' }}
            onClick={() => {
              // The sheet is open, so the address bar already holds this train's URL.
              navigator.clipboard
                ?.writeText(window.location.href)
                .then(() => say(strings.linkCopied))
                .catch(() => {})
            }}
          >
            <ShareNetwork weight="bold" />
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Veil open={open} onClose={onClose} />
      <section
        ref={sheet}
        className="tk-sheet"
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tk-title"
        aria-hidden={!open}
        inert={!open}
        style={row ? ({ '--f': operatorFill(row) } as CSSProperties) : undefined}
      >
        {body}
      </section>
      <div className="tk-toast" role="status" data-show={Boolean(toast)}>
        {toast}
      </div>
    </>
  )
}

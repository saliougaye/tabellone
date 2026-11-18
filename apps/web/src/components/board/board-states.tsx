'use client'

/**
 * The board's states, in the ticket language: every one of them answers "can I trust what I
 * see?" (ARCHITECTURE 4.1).
 *
 *   LiveDot       next to the clock: green "dal vivo", amber "dati di N min fa", grey "offline"
 *   StaleStrip    inside the sticky bar while the data is old or the device is offline
 *                 (the platform tiles dim meanwhile: a platform is what may have changed)
 *   BoardSkeleton ticket-shaped placeholders; after 4 s it admits RFI is slow
 *   EmptyBoard    a normal night, not an error: moon, no red, the other mode one tap away
 *   BoardError    RFI unreachable and nothing cached: says whose problem it is, retries itself
 *                 — and, with no network, its own card ("Sei offline"), not the failed read
 */
import { CloudX, Moon, WifiSlash } from '@phosphor-icons/react'
import type { BoardMode } from '@tabellone/core'
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { titleCase } from '@/lib/format'
import { type BoardTrust, formatTime } from '@/lib/presentation'
import { strings } from '@/strings'

const SKELETON_TICKETS = [0, 1, 2, 3, 4, 5]
const SLOW_AFTER_MS = 4000
const RETRY_COOLDOWN_MS = 1500

function trustLabel(trust: BoardTrust): string {
  if (trust.kind === 'offline') return strings.offlineLabel
  return trust.kind === 'stale' ? strings.staleLabel(trust.minutes) : strings.liveLabel
}

export function LiveDot({ trust }: { trust: BoardTrust | null }) {
  if (!trust) return null
  return (
    <span className="st-live" data-kind={trust.kind} role="status">
      <i aria-hidden="true" />
      {trustLabel(trust)}
    </span>
  )
}

/** In the sticky bar: stays in view all the way down the list. */
export function StaleStrip({
  trust,
  generatedAt,
  onRetry,
}: {
  trust: BoardTrust | null
  generatedAt: string | null
  onRetry: () => void
}) {
  if (!trust || trust.kind === 'live' || !generatedAt) return null
  return (
    <div className="st-strip" data-kind={trust.kind} role="status">
      <i aria-hidden="true" />
      <span>
        {trust.kind === 'offline' ? (
          <>
            <b>{strings.offlineStripTitle}</b> · {strings.offlineStripBody(formatTime(generatedAt))}
          </>
        ) : (
          <>
            <b>{strings.staleStripTitle(trust.minutes)}</b> · {strings.staleStripBody}
          </>
        )}
      </span>
      {trust.kind === 'stale' && (
        <button type="button" onClick={onRetry}>
          {strings.retryShort}
        </button>
      )}
    </div>
  )
}

export function BoardSkeleton() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className="st-skel" role="status" aria-label={strings.loadingBoard}>
      <span className="st-skel-h" />
      <ul>
        {SKELETON_TICKETS.map((n) => (
          <li key={n} style={{ '--i': n } as CSSProperties}>
            <span className="s" />
            <span className="m">
              <b />
              <i />
            </span>
            <span className="p" />
          </li>
        ))}
      </ul>
      <p className="st-slow" data-show={slow} aria-live="polite">
        {slow ? strings.slowRfi : ''}
      </p>
    </div>
  )
}

function Card({
  kind,
  icon,
  title,
  body,
  children,
}: {
  kind: 'empty' | 'error' | 'offline'
  icon: ReactNode
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <section className="st-card" data-kind={kind}>
      <span className="st-ic">{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </section>
  )
}

export function EmptyBoard({
  mode,
  stationName,
  generatedAt,
  onOther,
}: {
  mode: BoardMode
  stationName: string
  generatedAt: string
  onOther: () => void
}) {
  const departures = mode === 'departures'
  return (
    <Card
      kind="empty"
      icon={<Moon weight="bold" aria-hidden="true" />}
      title={departures ? strings.emptyDepartures : strings.emptyArrivals}
      body={strings.emptyHint(titleCase(stationName))}
    >
      <div className="st-actions">
        <button type="button" className="st-btn" onClick={onOther}>
          {departures ? strings.seeArrivals : strings.seeDepartures}
        </button>
      </div>
      <small>{strings.boardReadAt(formatTime(generatedAt))}</small>
    </Card>
  )
}

export function BoardError({
  stationName,
  online,
  onRetry,
}: {
  stationName: string
  online: boolean
  onRetry: () => void
}) {
  const [busy, setBusy] = useState(false)
  const name = titleCase(stationName)
  if (!online)
    return (
      <Card
        kind="offline"
        icon={<WifiSlash weight="bold" aria-hidden="true" />}
        title={strings.offlineCardTitle}
        body={strings.offlineCardBody(name)}
      />
    )
  return (
    <Card
      kind="error"
      icon={<CloudX weight="bold" aria-hidden="true" />}
      title={strings.rfiDownTitle}
      body={strings.rfiDownBody(name)}
    >
      <div className="st-actions">
        <button
          type="button"
          className="st-btn"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            onRetry()
            window.setTimeout(() => setBusy(false), RETRY_COOLDOWN_MS)
          }}
        >
          {busy ? strings.retrying : strings.retry}
        </button>
      </div>
    </Card>
  )
}

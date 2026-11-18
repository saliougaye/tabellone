'use client'

/**
 * Board notices with the weight they deserve (seventh pass, "Biglietto"). The server already
 * read RFI's text (ADR-013); here a strike becomes the first ticket of the list, in the
 * tickets' own language, and its phase — announced, imminent, ongoing, over — decides colour
 * and copy. Tapping it opens a sheet with the window, who strikes, what it is doing to this
 * very board, and RFI's original words. Everything else is one quiet, collapsible line.
 */
import { CaretDown, Info, Warning } from '@phosphor-icons/react'
import type { BoardNotice, BoardRow } from '@tabellone/core'
import { type CSSProperties, useMemo } from 'react'
import {
  clock,
  dayShort,
  dayWord,
  type InfoNotice,
  isStrike,
  type StrikeNotice,
  type StrikePhase,
  strikeCopy,
  strikeImpact,
  strikeKey,
  strikePhase,
} from '@/lib/strike'
import { strings } from '@/strings'

export type PlacedStrike = { strike: StrikeNotice; phase: StrikePhase; key: string }

/** Strikes that still have something to say, each placed in time against `now`; the rest as info. */
export function useNotices(notices: BoardNotice[], now: Date) {
  return useMemo(() => {
    const strikes: PlacedStrike[] = []
    const infos: InfoNotice[] = []
    for (const notice of notices) {
      if (!isStrike(notice)) {
        infos.push(notice)
        continue
      }
      const phase = strikePhase(notice, now)
      if (phase) strikes.push({ strike: notice, phase, key: strikeKey(notice) })
    }
    return { strikes, infos }
  }, [notices, now])
}

function ImpactLine({ rows }: { rows: BoardRow[] }) {
  const { late, cancelled } = strikeImpact(rows)
  if (!late && !cancelled) return <span className="nt-impact">{strings.strikeNoImpact}</span>
  return (
    <span className="nt-impact">
      {strings.strikeImpactHere} <b>{late}</b> {strings.trainsLate(late)}
      {cancelled > 0 && (
        <>
          {' · '}
          <b>{cancelled}</b> {strings.trainsSuppressed(cancelled)}
        </>
      )}
    </span>
  )
}

/** The strike as the first ticket of the list. */
export function StrikeTicket({
  placed,
  now,
  rows,
  onOpen,
}: {
  placed: PlacedStrike
  now: Date
  rows: BoardRow[]
  onOpen: () => void
}) {
  const { strike, phase } = placed
  const copy = strikeCopy(strike, phase, now)
  const { late, cancelled } = strikeImpact(rows)
  const ending = phase === 'ongoing' || phase === 'over'
  return (
    <button
      type="button"
      className="nt-ticket"
      data-phase={phase}
      onClick={onOpen}
      aria-haspopup="dialog"
      style={{ '--i': 0 } as CSSProperties}
    >
      <span className="nt-stub">
        <b>{clock(ending ? strike.to : strike.from)}</b>
        <small>
          {phase === 'ongoing'
            ? strings.strikeStubUntil
            : phase === 'over'
              ? strings.strikeOverKicker.toLowerCase()
              : dayWord(strike.from, now)}
        </small>
      </span>
      <span className="nt-main">
        <b>{copy.title}</b>
        <span>
          {phase === 'ongoing'
            ? late || cancelled
              ? strings.strikeImpactTicket(late, cancelled)
              : strings.strikeNoImpactTicket
            : copy.line}
        </span>
      </span>
      <span className="nt-state">{copy.kicker}</span>
    </button>
  )
}

/** The strike in full, for the sheet. */
export function StrikeDetail({
  placed,
  now,
  rows,
}: {
  placed: PlacedStrike
  now: Date
  rows: BoardRow[]
}) {
  const { strike, phase } = placed
  const copy = strikeCopy(strike, phase, now)
  return (
    <div className="nt-detail" data-phase={phase}>
      <span className="nt-kicker">
        <Warning weight="bold" aria-hidden="true" /> {copy.kicker}
      </span>
      <h2>{copy.title}</h2>
      <div className="nt-window">
        <span>
          <small>{strings.strikeStart}</small>
          <b>{clock(strike.from)}</b>
          <em>{dayShort(strike.from)}</em>
        </span>
        <i aria-hidden="true" />
        <span>
          <small>{strings.strikeEnd}</small>
          <b>{clock(strike.to)}</b>
          <em>{dayShort(strike.to)}</em>
        </span>
      </div>
      {strike.who && (
        <p className="nt-who">
          {strings.strikeWhoLead} <b>{strike.who}</b>.
        </p>
      )}
      {phase === 'ongoing' && <ImpactLine rows={rows} />}
      <details className="nt-raw">
        <summary>
          {strings.rfiNoticeText} <CaretDown weight="bold" aria-hidden="true" />
        </summary>
        <p>{strike.text}</p>
      </details>
    </div>
  )
}

/** Every other notice: one quiet line that opens in place. */
export function InfoNotices({ infos }: { infos: InfoNotice[] }) {
  if (!infos.length) return null
  return (
    <div className="nt-infos">
      {infos.map((notice) => (
        <details key={notice.text} className="nt-info">
          <summary>
            <Info weight="bold" aria-hidden="true" />
            <span>{notice.text}</span>
            <CaretDown weight="bold" aria-hidden="true" />
          </summary>
          <p>{notice.text}</p>
        </details>
      ))}
    </div>
  )
}

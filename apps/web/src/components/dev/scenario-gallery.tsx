'use client'

/**
 * TEMPORARY — delete together with /dev/scenari and src/fixtures when the backend lands.
 *
 * One section per UI state, fed by typed fixtures with times relative to now: the
 * visual checklist of everything the board must render. Resize the viewport to check
 * the mobile layouts (the 600px switch lives in the tokens).
 */
import type { BoardMode } from '@tabellone/core'
import { useEffect, useState } from 'react'
import { BoardError, BoardLoading } from '@/components/board/board-states'
import { BoardView } from '@/components/board/board-view'
import { HomeEmpty } from '@/components/picker/home-empty'
import { StationPicker } from '@/components/picker/station-picker'
import { emptyBoard, fullBoard, noticesBoard, staleBoard } from '@/fixtures/boards'
import { fixtureStations } from '@/fixtures/stations'

export function ScenarioGallery() {
  // Client-only clock: fixtures depend on `now`, so rendering waits for mount to avoid
  // a server/client hydration mismatch on every formatted time.
  const [now, setNow] = useState<Date | null>(null)
  const [mode, setMode] = useState<BoardMode>('departures')
  useEffect(() => {
    setNow(new Date())
  }, [])
  if (!now) return null

  const noop = () => {}

  return (
    <main
      className="flex flex-col gap-16"
      style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 3vw, 40px) var(--sp-20)' }}
    >
      <header className="flex flex-col gap-2 border-b-2 border-line-strong pb-5">
        <span className="text-text-tertiary type-label">Scenari · solo sviluppo</span>
        <h1 className="m-0 type-primary-wide" style={{ fontWeight: 'var(--weight-max)' }}>
          Ogni stato della UI, con dati finti tipizzati
        </h1>
        <p className="m-0 max-w-[64ch] text-text-secondary type-reading">
          Le route API restano 501: queste fixture non attraversano mai il confine HTTP.
          Ridimensiona la finestra sotto i 600px per i layout mobile.
        </p>
      </header>

      <Scenario
        title="Board piena e varia"
        note="imminente col lampeggio, ritardo lieve e a tre cifre, cancellato, cancellazione parziale con binario variato, deviato, BUS con numero alfanumerico, operatore ignoto"
      >
        <BoardView
          board={fullBoard(now, mode)}
          now={now}
          onSwitchMode={setMode}
          favourite={{ active: true, onToggle: noop }}
        />
      </Scenario>

      <Scenario title="Board vuota di notte" note="stato normale, diverso da un errore di lettura">
        <BoardView board={emptyBoard(now)} now={now} onSwitchMode={noop} />
      </Scenario>

      <Scenario title="Dati stantii" note="isStale: la board si desatura e la freschezza lo dice">
        <BoardView board={staleBoard(now)} now={now} onSwitchMode={noop} />
      </Scenario>

      <Scenario title="Avvisi di stazione" note="notices sopra l'elenco">
        <BoardView board={noticesBoard(now)} now={now} onSwitchMode={noop} />
      </Scenario>

      <Scenario title="Lettura fallita" note="RFI irraggiungibile e nessuna cache: 503">
        <BoardError stationLabel="Milano Centrale" onRetry={noop} />
      </Scenario>

      <Scenario title="Caricamento" note="prima risposta non ancora arrivata">
        <BoardLoading stationLabel="Milano Centrale" />
      </Scenario>

      <Scenario title="Primo avvio" note="nessuna stazione seguita (mockup 12)">
        <HomeEmpty onSearch={noop} />
      </Scenario>

      <Scenario title="Scelta stazione" note="catalogo finto: suggerite, indice A–Z, ricerca">
        <StationPicker
          stations={fixtureStations}
          recents={[
            { slug: 'milano-centrale', name: 'Milano Centrale', visitedAt: now.toISOString() },
            { slug: 'roma-termini', name: 'Roma Termini', visitedAt: now.toISOString() },
          ]}
          favourites={[
            { slug: 'roma-termini', name: 'Roma Termini', visitedAt: now.toISOString() },
          ]}
        />
      </Scenario>

      <Scenario
        title="Catalogo non disponibile"
        note="/api/stations irraggiungibile, salvate ancora utilizzabili"
      >
        <StationPicker
          stations={null}
          recents={[
            { slug: 'napoli-centrale', name: 'Napoli Centrale', visitedAt: now.toISOString() },
          ]}
          favourites={[]}
        />
      </Scenario>
    </main>
  )
}

function Scenario({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-line pb-3">
        <h2 className="m-0 type-primary" style={{ fontWeight: 'var(--weight-max)' }}>
          {title}
        </h2>
        <p className="m-0 text-text-tertiary type-tertiary">{note}</p>
      </div>
      {children}
    </section>
  )
}

'use client'

/**
 * The service worker's navigation fallback: a document request that could not be served
 * from the precache and could not reach the network lands here. Same screen as the board's
 * own offline state (`BoardOffline` renders through `BoardMessage` too), because it is the
 * same fact — this one just has no station to name and no query to refetch, so retrying is
 * a plain reload.
 */
import { WifiSlash } from '@phosphor-icons/react'
import { BoardMessage } from '@/components/board/board-states'
import { AppHeader } from '@/components/shell/app-header'
import { strings } from '@/strings'

export default function OfflinePage() {
  return (
    <>
      <AppHeader />
      <main
        className="flex min-h-[calc(100dvh-4rem)] flex-col"
        style={{ padding: 'var(--sp-6) var(--screen-margin) var(--sp-20)' }}
      >
        <BoardMessage
          icon={WifiSlash}
          title={strings.offlineTitle}
          hint={strings.offlineHint}
          onRetry={() => window.location.reload()}
        />
      </main>
    </>
  )
}

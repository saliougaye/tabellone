'use client'

/**
 * The service worker's navigation fallback: a document request that could not be served
 * from the precache and could not reach the network lands here. Same screen as the board's
 * own offline state (`BoardOffline` renders through `BoardMessage` too), because it is the
 * same fact — this one just has no station to name and no query to refetch, so retrying is
 * a plain reload.
 */
import { BoardMessage, OfflineIcon } from '@/components/board/board-states'
import { strings } from '@/strings'

export default function OfflinePage() {
  return (
    <BoardMessage
      icon={<OfflineIcon />}
      title={strings.offlineTitle}
      hint={strings.offlineHint}
      onRetry={() => window.location.reload()}
    />
  )
}

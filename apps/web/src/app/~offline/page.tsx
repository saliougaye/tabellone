'use client'

/**
 * The service worker's navigation fallback: a document request that could not be served
 * from the precache and could not reach the network lands here. No station to name and no
 * query to refetch, so retrying is a plain reload.
 */
import { Message } from '@/components/board/parts'
import { strings } from '@/strings'

export default function OfflinePage() {
  return (
    <main className="sh">
      <div className="sh-col" style={{ paddingTop: 48 }}>
        <Message
          title={strings.offlineTitle}
          hint={strings.offlineHint}
          action={{ label: strings.retry, onClick: () => window.location.reload() }}
        />
      </div>
    </main>
  )
}

/**
 * Station selection — one of the two pages in the app (ARCHITECTURE 4.1). Will search the
 * static catalogue and list favourites from `localStorage`. Layout reference: design sheets
 * 11/13 (station picker, desktop and mobile).
 */
import { strings } from '@/strings'

export default function StationPickerPage() {
  return (
    <main>
      <h1>{strings.appName}</h1>
      <p>{strings.scaffold}</p>
    </main>
  )
}

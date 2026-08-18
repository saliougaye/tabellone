/**
 * Station selection — one of the two pages in the app (ARCHITECTURE 4.1). Searches the
 * static catalogue via `/api/stations` and lists saved stations from `localStorage`.
 * Layout reference: design sheets 12/13/14.
 */
import { PickerScreen } from '@/components/picker/picker-screen'

export default function StationPickerPage() {
  return <PickerScreen />
}

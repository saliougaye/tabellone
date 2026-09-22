/**
 * Station selection — one of the two pages in the app (ARCHITECTURE 4.1). Searches the
 * static catalogue via `/api/stations` and lists saved stations from `localStorage`.
 */
import { HomeScreen } from '@/components/home/home-screen'

export default function StationPickerPage() {
  return <HomeScreen />
}

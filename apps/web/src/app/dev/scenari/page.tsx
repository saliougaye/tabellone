/**
 * TEMPORARY — dev-only scenario gallery, deleted when the real backend lands.
 * Renders the presentational components against typed fixtures so every UI state is
 * reachable without a backend. Never part of a production build.
 */
import { notFound } from 'next/navigation'
import { ScenarioGallery } from '@/components/dev/scenario-gallery'

export default function ScenariPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <ScenarioGallery />
}

export { contentType, size } from './board-og-image'

import { boardOgImage } from './board-og-image'

type Props = {
  params: Promise<{ slug: string }>
}

// Bare route has no access to the `view` query param at this convention (ADR-010), so it
// defaults to departures — same default BoardPage's own resolveMode() falls back to.
export default async function Image({ params }: Props) {
  const { slug } = await params
  return boardOgImage(slug, 'departures')
}

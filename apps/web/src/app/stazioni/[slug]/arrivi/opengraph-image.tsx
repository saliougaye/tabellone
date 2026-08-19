export { contentType, size } from '../board-og-image'

import { boardOgImage } from '../board-og-image'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  return boardOgImage(slug, 'arrivals')
}

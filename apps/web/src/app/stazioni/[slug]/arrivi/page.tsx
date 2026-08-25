/**
 * Canonical arrivals URL (ADR-011). Same `BoardScreen` as the bare `/stazioni/[slug]`
 * route and `/stazioni/[slug]/partenze`, mode fixed by the path segment instead of a
 * query param — this is the page search engines should index for arrivals.
 */
import { findStationBySlug, listStations } from '@tabellone/core'
import type { Metadata } from 'next'
import { BoardScreen } from '@/components/board/board-screen'
import { boardMetadata } from '../board-metadata'
import { StationJsonLd } from '../station-jsonld'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Prerendered at build time for the major stations only, then on demand for the rest
 * (`dynamicParams`, on by default). The catalogue has ~2400 entries and each has two board
 * routes: building all ~4900 shells up front costs minutes for pages whose content arrives
 * from the client anyway, while leaving the list empty means the biggest stations pay a
 * cold render on their first visit. The majors are the ones with traffic.
 */
export function generateStaticParams() {
  return listStations()
    .filter((station) => station.isMajor)
    .map((station) => ({ slug: station.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return boardMetadata(slug, 'arrivals')
}

export default async function ArrivalsPage({ params }: Props) {
  const { slug } = await params
  const station = findStationBySlug(slug)
  return (
    <>
      {station && <StationJsonLd station={station} mode="arrivals" />}
      <BoardScreen slug={slug} initialMode="arrivals" catalogName={station?.name} />
    </>
  )
}

/**
 * Canonical arrivals URL (ADR-011). Same `BoardScreen` as the bare `/stazioni/[slug]`
 * route and `/stazioni/[slug]/partenze`, mode fixed by the path segment instead of a
 * query param — this is the page search engines should index for arrivals.
 */
import { findStationBySlug } from '@tabellone/core'
import type { Metadata } from 'next'
import { BoardScreen } from '@/components/board/board-screen'
import { boardMetadata } from '../board-metadata'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return boardMetadata(slug, 'arrivals')
}

export default async function ArrivalsPage({ params }: Props) {
  const { slug } = await params
  return (
    <BoardScreen slug={slug} initialMode="arrivals" catalogName={findStationBySlug(slug)?.name} />
  )
}

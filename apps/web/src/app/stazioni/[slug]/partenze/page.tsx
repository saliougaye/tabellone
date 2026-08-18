/**
 * Canonical departures URL (ADR-011). Same `BoardScreen` as the bare `/stazioni/[slug]`
 * route and `/stazioni/[slug]/arrivi`, mode fixed by the path segment instead of a query
 * param — this is the page search engines should index for departures.
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
  return boardMetadata(slug, 'departures')
}

export default async function DeparturesPage({ params }: Props) {
  const { slug } = await params
  return (
    <BoardScreen slug={slug} initialMode="departures" catalogName={findStationBySlug(slug)?.name} />
  )
}

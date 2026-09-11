/**
 * One departing train, from the departures board it is on (ADR-012). Nested under the
 * canonical board route on purpose: the page reads that board's cache and makes no request
 * of its own.
 *
 * No `generateStaticParams`: a train number is only a valid path for as long as the train is
 * on the board, so there is nothing to prerender.
 */
import { findStationBySlug } from '@tabellone/core'
import type { Metadata } from 'next'
import { TrainScreen } from '@/components/train/train-screen'
import { trainMetadata } from '../../train-metadata'

type Props = {
  params: Promise<{ slug: string; train: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, train } = await params
  return trainMetadata(slug, 'departures', train)
}

export default async function DepartingTrainPage({ params }: Props) {
  const { slug, train } = await params
  const station = findStationBySlug(slug)
  return (
    <TrainScreen slug={slug} mode="departures" trainNumber={train} catalogName={station?.name} />
  )
}

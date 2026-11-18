'use client'

/**
 * Which train's sheet is open on this board: the train number in the URL (ADR-012). The tapped
 * row is remembered only to tell apart two rows with the same number (a board spanning
 * midnight) — a cold visit resolves the number to the first, soonest match.
 */
import type { BoardMode, BoardRow } from '@tabellone/core'
import { useState } from 'react'
import { findRowByTrainNumber } from '@/lib/train-routes'
import { closeTrain, openTrain, useTrainParam } from '@/lib/train-url'
import { rowKey } from './parts'

export type TrainSheet = {
  /** The row whose sheet is open. */
  row: BoardRow | null
  /** A train number in the URL that is not on the board: only once a board has loaded. */
  missing: string | null
  open: (row: BoardRow) => void
  close: () => Promise<void>
}

export function useTrainSheet(
  slug: string,
  mode: BoardMode,
  rows: BoardRow[],
  boardLoaded: boolean,
): TrainSheet {
  const train = useTrainParam()
  const [picked, setPicked] = useState<string | null>(null)
  const wanted = train?.toUpperCase()
  const row = wanted
    ? (rows.find((r) => rowKey(r) === picked && r.trainNumber.toUpperCase() === wanted) ??
      findRowByTrainNumber(rows, wanted))
    : null
  return {
    row,
    missing: train && !row && boardLoaded ? train : null,
    open: (next) => {
      setPicked(rowKey(next))
      openTrain(slug, mode, next.trainNumber)
    },
    close: () => closeTrain(slug, mode),
  }
}

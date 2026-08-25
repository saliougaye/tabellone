/**
 * A render smoke test for the picker: the catalogue is 2400 stations and the list is
 * deliberately bounded, so the two things worth pinning down are that the bound holds and
 * that the honest failure state is reachable.
 */
import type { Station } from '@tabellone/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StationPicker } from './station-picker'

afterEach(cleanup)

const station = (name: string, isMajor = false): Station => ({
  slug: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  aliases: [],
  rfiPlaceId: '1',
  lat: 0,
  lon: 0,
  city: name.split(' ')[0] ?? '',
  isMajor,
  checkedAt: '2026-08-18',
})

describe('StationPicker', () => {
  it('bounds the A–Z list and says so', () => {
    const stations = Array.from({ length: 200 }, (_, i) => station(`Stazione ${i}`))
    render(<StationPicker stations={stations} recents={[]} favourites={[]} />)
    expect(screen.getAllByRole('link').length).toBeLessThanOrEqual(61)
    expect(screen.getByText(/Mostrate 60 stazioni su 200/)).toBeTruthy()
  })

  it('says the catalogue is unreachable rather than showing an empty list', () => {
    render(<StationPicker stations={null} recents={[]} favourites={[]} />)
    expect(screen.getByText('Catalogo non disponibile')).toBeTruthy()
  })
})

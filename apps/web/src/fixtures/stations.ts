/**
 * TEMPORARY — delete together with /dev/scenari when the real backend lands.
 * Display-only station fixtures for the picker gallery. Slugs here are throwaway:
 * the published, immutable ones live in packages/core/src/catalog/stations.json.
 */
import type { Station } from '@tabellone/core'

function station(
  slug: string,
  name: string,
  city: string,
  isMajor: boolean,
  aliases: string[] = [],
): Station {
  return {
    slug,
    name,
    aliases,
    rfiPlaceId: 'PLACEHOLDER',
    lat: 0,
    lon: 0,
    city,
    isMajor,
    checkedAt: '2026-08-18',
  }
}

export const fixtureStations: Station[] = [
  station('ancona', 'Ancona', 'Ancona', false),
  station('bari-centrale', 'Bari Centrale', 'Bari', false),
  station('bologna-centrale', 'Bologna Centrale', 'Bologna', false),
  station('firenze-santa-maria-novella', 'Firenze S.M.N.', 'Firenze', false, ['firenze']),
  station('genova-piazza-principe', 'Genova P. Principe', 'Genova', false),
  station('milano-centrale', 'Milano Centrale', 'Milano', true, ['milano']),
  station('monza', 'Monza', 'Monza', false),
  station('napoli-centrale', 'Napoli Centrale', 'Napoli', true, ['napoli']),
  station('roma-termini', 'Roma Termini', 'Roma', true, ['termini', 'roma']),
  station('torino-porta-nuova', 'Torino P. Nuova', 'Torino', true, ['torino']),
  station('venezia-santa-lucia', 'Venezia S. Lucia', 'Venezia', false, ['venezia']),
  station('verona-porta-nuova', 'Verona P. Nuova', 'Verona', false),
]

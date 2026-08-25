/**
 * Structured data for a board page: the station itself, and the trail that leads to it.
 *
 * The board's rows are deliberately *not* described here. They are true for twenty seconds
 * and they are not in the server-rendered HTML, so a `Schedule` or `TrainTrip` graph would
 * be a claim about data the page does not contain — which is exactly what structured-data
 * penalties are for. What is stable is the station: its name, its identity as a
 * `TrainStation`, and its place in the site.
 *
 * A Server Component: this is markup for crawlers, and shipping it to the client would be
 * bytes no reader ever benefits from.
 */
import type { BoardMode, Station } from '@tabellone/core'
import { canonicalBoardPath } from '@/lib/board-routes'
import { siteUrl } from '@/lib/site'
import { strings } from '@/strings'

export function StationJsonLd({ station, mode }: { station: Station; mode: BoardMode }) {
  const url = `${siteUrl}${canonicalBoardPath(station.slug, mode)}`
  const modeLabel = mode === 'arrivals' ? strings.arrivals : strings.departures
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TrainStation',
        '@id': `${siteUrl}/stazioni/${station.slug}#station`,
        name: station.name,
        url,
        ...(station.city
          ? { address: { '@type': 'PostalAddress', addressLocality: station.city } }
          : {}),
        // The catalogue carries 0/0 for stations whose coordinates have not been checked;
        // publishing those would put every Italian station in the Gulf of Guinea.
        ...(station.lat !== 0 || station.lon !== 0
          ? { geo: { '@type': 'GeoCoordinates', latitude: station.lat, longitude: station.lon } }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: strings.appName, item: siteUrl },
          { '@type': 'ListItem', position: 2, name: station.name, item: url },
          { '@type': 'ListItem', position: 3, name: modeLabel, item: url },
        ],
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is a script element by specification, and this payload is our own catalogue serialised here
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}

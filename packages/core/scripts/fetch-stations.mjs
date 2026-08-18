#!/usr/bin/env node
/**
 * One-off / occasional catalogue refresh: pulls the full station list (name + RFI place id)
 * from the public ArriviPartenze picker and merges it into `src/catalog/stations.json`.
 *
 * Run manually when needed:
 *   pnpm --filter @tabellone/core fetch:stations
 *
 * The RFI page has no lat/lon/city/isMajor — those fields are only known for stations
 * that already exist in the catalogue (curated by hand). New stations get placeholder
 * lat:0, lon:0, city:"", isMajor:false; ADR-007 already expects the generated slugs and
 * placeholders to be hand-reviewed before publication, this script does not publish on
 * its own.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse } from 'node-html-parser'

const SOURCE_URL = 'https://iechub.rfi.it/ArriviPartenze/'
const CATALOG_PATH = fileURLToPath(new URL('../src/catalog/stations.json', import.meta.url))

function stripDiacritics(value) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function slugify(name) {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCase(name) {
  return name
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => (/^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('')
}

async function fetchStationOptions() {
  const res = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; tabellone-catalog-fetch/1.0)' },
  })
  if (!res.ok) {
    throw new Error(`GET ${SOURCE_URL} -> ${res.status}`)
  }
  const html = await res.text()
  const root = parse(html)
  const options = root.querySelectorAll('#ElencoLocalita option')
  if (options.length === 0) {
    throw new Error('No <option> found under #ElencoLocalita — RFI markup likely changed')
  }
  return options
    .map((option) => ({
      rfiPlaceId: option.getAttribute('value')?.trim() ?? '',
      rawName: option.text.trim(),
    }))
    .filter((entry) => entry.rfiPlaceId && entry.rawName)
}

async function main() {
  const existing = JSON.parse(await readFile(CATALOG_PATH, 'utf8'))
  const existingByPlaceId = new Map(existing.map((station) => [station.rfiPlaceId, station]))
  const usedSlugs = new Set(existing.map((station) => station.slug))

  const fetched = await fetchStationOptions()
  const today = new Date().toISOString().slice(0, 10)

  let added = 0
  let kept = 0
  const collisions = []
  const merged = [...existing]

  for (const { rfiPlaceId, rawName } of fetched) {
    if (existingByPlaceId.has(rfiPlaceId)) {
      kept += 1
      continue
    }

    const name = titleCase(rawName)
    let slug = slugify(name)
    if (usedSlugs.has(slug)) {
      collisions.push({ slug, name, rfiPlaceId })
      slug = `${slug}-${rfiPlaceId}`
    }
    usedSlugs.add(slug)

    merged.push({
      slug,
      name,
      aliases: [],
      rfiPlaceId,
      lat: 0,
      lon: 0,
      city: '',
      isMajor: false,
      checkedAt: today,
    })
    added += 1
  }

  merged.sort((a, b) => a.slug.localeCompare(b.slug))

  await writeFile(CATALOG_PATH, `${JSON.stringify(merged, null, 2)}\n`)

  console.log(`fetched ${fetched.length} stations from RFI`)
  console.log(`kept ${kept} existing curated entries untouched`)
  console.log(`added ${added} new entries (lat/lon/city placeholder, isMajor:false)`)
  if (collisions.length > 0) {
    console.log(`${collisions.length} slug collisions resolved with -{rfiPlaceId} suffix:`)
    for (const c of collisions) console.log(`  ${c.slug} <- "${c.name}" (${c.rfiPlaceId})`)
  }
  console.log(`wrote ${merged.length} total stations to ${CATALOG_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

import { catalogData } from './catalog-data'
import type { CatalogItem } from './catalog-schema'

export type CatalogFilters = {
  search: string
  kind: CatalogItem['kind'] | 'all'
  genreId: string
}
export const defaultCatalogFilters: CatalogFilters = {
  search: '',
  kind: 'all',
  genreId: 'all',
}
export const catalogPageSize = 6
export function normalizeFilters(filters: CatalogFilters): CatalogFilters {
  return { ...filters, search: filters.search.trim().toLowerCase() }
}
export function sameFilters(a: CatalogFilters, b: CatalogFilters) {
  const left = normalizeFilters(a)
  const right = normalizeFilters(b)
  return (
    left.search === right.search &&
    left.kind === right.kind &&
    left.genreId === right.genreId
  )
}
export function selectCatalog(
  filters: CatalogFilters,
  items: ReadonlyArray<CatalogItem> = catalogData.items,
) {
  const { search, kind, genreId } = normalizeFilters(filters)
  return items
    .filter(
      (item) =>
        (kind === 'all' || item.kind === kind) &&
        (genreId === 'all' || item.genreIds.includes(genreId)) &&
        (!search ||
          item.title.toLowerCase().includes(search) ||
          item.synopsis.toLowerCase().includes(search)),
    )
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
    )
}
export function getCatalogPage(
  filters: CatalogFilters,
  offset: number,
  items: ReadonlyArray<CatalogItem> = catalogData.items,
) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new RangeError('Invalid catalog offset')
  const matches = selectCatalog(filters, items)
  const page = matches.slice(offset, offset + catalogPageSize)
  const next = offset + page.length
  return {
    items: page,
    total: matches.length,
    nextOffset: page.length && next < matches.length ? next : undefined,
  }
}
export type CatalogPage = ReturnType<typeof getCatalogPage>
export const kindLabels = {
  movie: 'Film',
  series: 'Series',
  standalone: 'Standalone',
} as const
export function itemLength(item: CatalogItem) {
  return item.kind === 'series'
    ? `${item.episodeCount} episodes`
    : `${Math.ceil(item.durationMs / 60_000)} min`
}
export function genreLabels(item: CatalogItem) {
  return item.genreIds
    .map((id) => catalogData.genres.find((genre) => genre.id === id)!.label)
    .join(' · ')
}

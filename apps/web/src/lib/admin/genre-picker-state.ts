import type { Genre } from './genres-client'
import { validateGenreName } from './genres-form'

export const genreLimit = 100

export function toggleGenre(
  value: string[],
  id: string,
  selected: boolean,
  limit = genreLimit,
): string[] {
  if (!selected) return value.filter((current) => current !== id)
  if (value.includes(id) || value.length >= limit) return value
  return [...value, id]
}
export const atGenreLimit = (count: number, limit = genreLimit) =>
  count >= limit
export function selectionSummary(count: number, limit = genreLimit) {
  return count === 0
    ? `No genres selected · up to ${limit}`
    : `${count} selected · up to ${limit}`
}
// Offer inline creation only for a valid name that no loaded genre already has.
export function offeredGenreName(
  search: string,
  items: Pick<Genre, 'name'>[],
  count: number,
  limit = genreLimit,
): string | undefined {
  const name = search.trim()
  if (!name || validateGenreName(name) || atGenreLimit(count, limit))
    return undefined
  const lower = name.toLowerCase()
  return items.some((item) => item.name.toLowerCase() === lower)
    ? undefined
    : name
}
export function mergeKnown(
  previous: Record<string, string>,
  genres: Array<Pick<Genre, 'id' | 'name'>>,
) {
  const next = { ...previous }
  for (const genre of genres) next[genre.id] = genre.name
  return next
}

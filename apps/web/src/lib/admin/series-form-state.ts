import type { Season, SeasonCreate, SeasonPatch } from './series-client'
import { emptyContentValues, validateContentValues } from './content-form-state'

export type SeasonValues = {
  seasonNumber: string
  title: string
  description: string
  releaseYear: string
  releaseDate: string
}
export function seasonValues(
  season?: Season,
  seasons: Season[] = [],
): SeasonValues {
  const next = Math.max(0, ...seasons.map((row) => row.seasonNumber)) + 1
  return {
    seasonNumber: season
      ? String(season.seasonNumber)
      : next <= 2147483647
        ? String(next)
        : '',
    title: season?.title ?? '',
    description: season?.description ?? '',
    releaseYear: season?.releaseYear?.toString() ?? '',
    releaseDate: season?.releaseDate ?? '',
  }
}
export function validSequence(value: string) {
  return (
    /^[1-9]\d*$/.test(value.trim()) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) <= 2147483647
  )
}
export function validateSeason(v: SeasonValues) {
  const shared = validateContentValues({
    ...emptyContentValues(),
    title: 'Season',
    releaseYear: v.releaseYear,
    releaseDate: v.releaseDate,
  })
  const errors: Partial<Record<keyof SeasonValues, string>> = {}
  if (!validSequence(v.seasonNumber))
    errors.seasonNumber = 'Enter a whole season number from 1 to 2147483647.'
  if (v.title.trim().length > 200) errors.title = 'Use at most 200 characters.'
  if (v.description.trim().length > 10000)
    errors.description = 'Use at most 10000 characters.'
  if (shared.releaseYear) errors.releaseYear = shared.releaseYear
  if (shared.releaseDate) errors.releaseDate = shared.releaseDate
  return errors
}
export function seasonInput(v: SeasonValues): SeasonCreate {
  return {
    seasonNumber: Number(v.seasonNumber),
    title: v.title.trim() || null,
    description: v.description.trim() || null,
    releaseYear: v.releaseYear.trim() ? Number(v.releaseYear) : null,
    releaseDate: v.releaseDate.trim() || null,
  }
}
export function patchSeasonInput(
  v: SeasonValues,
  baseline: Season,
): SeasonPatch | undefined {
  const current = seasonInput(v),
    original = seasonInput(seasonValues(baseline))
  const changed = Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) => value !== original[key as keyof SeasonCreate],
    ),
  )
  return Object.keys(changed).length
    ? { ...changed, expectedVersion: baseline.rowVersion }
    : undefined
}
export const seriesHref = (id: string) => `/admin/content/series/${id}`
export const seasonsHref = (id: string) => `/admin/series/${id}/seasons`
export const seasonHref = (seriesId: string, seasonId: string) =>
  `${seasonsHref(seriesId)}/${seasonId}`
export const episodeHref = (seriesId: string, episodeId: string) =>
  `/admin/series/${seriesId}/episodes/${episodeId}`

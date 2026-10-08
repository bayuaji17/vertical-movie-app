import type { EditorialValues } from './content-form-state'
import type {
  Episode,
  EpisodeCreate,
  EpisodePatch,
  Season,
  SeasonCreate,
  SeasonPatch,
} from './series-client'
import {
  emptyContentValues,
  validateContentValues,
  editorialFields,
} from './content-form-state'

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

export type EpisodeValues = EditorialValues & {
  seasonId: string
  episodeNumber: string
  rightsConfirmed: boolean
}
export function episodeValues(
  seasonId: string,
  episode?: Episode,
): EpisodeValues {
  const {
    type: _type,
    completionStatus: _completion,
    ...empty
  } = emptyContentValues()
  return {
    ...empty,
    seasonId,
    episodeNumber: '1',
    ...(episode
      ? {
          title: episode.title,
          slug: episode.slug,
          originalTitle: episode.originalTitle ?? '',
          synopsis: episode.synopsis ?? '',
          description: episode.description ?? '',
          originalLanguage: episode.originalLanguage ?? '',
          releaseYear: episode.releaseYear?.toString() ?? '',
          releaseDate: episode.releaseDate ?? '',
          genreIds: [...episode.genreIds],
          rightsConfirmed: !!episode.rightsConfirmedAt,
          seasonId: episode.seasonId,
          episodeNumber: String(episode.episodeNumber),
        }
      : {}),
  }
}
export function validateEpisode(
  v: EpisodeValues,
  seasons: Season[],
  editing = false,
) {
  const errors: Partial<Record<keyof EpisodeValues, string>> = {
    ...validateContentValues(v, editing),
  }
  if (!validSequence(v.episodeNumber))
    errors.episodeNumber = 'Enter a whole episode number from 1 to 2147483647.'
  if (!seasons.some((row) => row.id === v.seasonId && !row.archivedAt))
    errors.seasonId = 'Choose an active season in this series.'
  return errors
}
export function episodeInput(v: EpisodeValues): EpisodeCreate {
  return {
    ...editorialFields(v),
    kind: 'episode',
    seasonId: v.seasonId,
    episodeNumber: Number(v.episodeNumber),
    rightsConfirmed: v.rightsConfirmed,
  }
}
export function patchEpisodeInput(
  v: EpisodeValues,
  baseline: Episode,
): EpisodePatch | undefined {
  const { kind: _kind, ...current } = episodeInput(v),
    { kind: _oldKind, ...original } = episodeInput(
      episodeValues(baseline.seasonId, baseline),
    )
  const changed = Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(original[key as keyof typeof original]),
    ),
  )
  return Object.keys(changed).length
    ? { ...changed, expectedVersion: baseline.rowVersion }
    : undefined
}
export type EpisodeListSearch = { q: string; archived: boolean }
export function episodeListSearch(
  value: Record<string, unknown>,
): EpisodeListSearch {
  return {
    q: typeof value.q === 'string' ? value.q.trim().slice(0, 200) : '',
    archived: value.archived === true || value.archived === 'true',
  }
}

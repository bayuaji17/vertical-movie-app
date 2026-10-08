import { isUuid } from './content-identifiers'
import type { ContentDetail, ContentType } from './content-client'
import type { CreateContent, PatchContent } from './content-queries'

export type ContentValues = {
  type: ContentType
  title: string
  slug: string
  originalTitle: string
  synopsis: string
  description: string
  originalLanguage: string
  releaseYear: string
  releaseDate: string
  genreIds: string[]
  rightsConfirmed: boolean
  completionStatus: 'ongoing' | 'completed'
}
export const contentTextFields = [
  { name: 'title', label: 'Title', max: 200, required: true },
  { name: 'slug', label: 'Slug', max: 180 },
  { name: 'originalTitle', label: 'Original title', max: 200 },
  { name: 'originalLanguage', label: 'Original language', max: 35 },
  { name: 'synopsis', label: 'Synopsis', max: 500, multiline: true },
  { name: 'description', label: 'Description', max: 10000, multiline: true },
  { name: 'releaseYear', label: 'Release year', max: 4 },
  { name: 'releaseDate', label: 'Release date', max: 10 },
] as const
export function emptyContentValues(type: ContentType = 'film'): ContentValues {
  return {
    type,
    title: '',
    slug: '',
    originalTitle: '',
    synopsis: '',
    description: '',
    originalLanguage: '',
    releaseYear: '',
    releaseDate: '',
    genreIds: [],
    rightsConfirmed: false,
    completionStatus: 'ongoing',
  }
}
export function valuesFromDetail(detail: ContentDetail): ContentValues {
  const d = detail.data
  return {
    ...emptyContentValues(detail.type),
    title: d.title,
    slug: d.slug,
    originalTitle: d.originalTitle ?? '',
    synopsis: d.synopsis ?? '',
    description: d.description ?? '',
    originalLanguage: d.originalLanguage ?? '',
    releaseYear: d.releaseYear?.toString() ?? '',
    releaseDate: d.releaseDate ?? '',
    genreIds: [...d.genreIds],
    ...(detail.type === 'series'
      ? { completionStatus: detail.data.completionStatus }
      : { rightsConfirmed: !!detail.data.rightsConfirmedAt }),
  }
}
export function isEditableContent(detail: ContentDetail) {
  return (
    !detail.data.archivedAt &&
    detail.data.publicationStatus === 'draft' &&
    (detail.type === 'series' || detail.data.kind !== 'episode')
  )
}
export type EditorialValues = Omit<
  ContentValues,
  'type' | 'completionStatus' | 'rightsConfirmed'
>
export function validateContentValues(v: EditorialValues, editing = false) {
  const errors: Partial<Record<keyof ContentValues, string>> = {}
  if (!v.title.trim()) errors.title = 'Enter a title.'
  for (const field of contentTextFields)
    if (v[field.name].trim().length > field.max)
      errors[field.name] = `Use at most ${field.max} characters.`
  if (editing && !v.slug.trim()) errors.slug = 'Enter a slug.'
  if (v.slug.trim() && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug.trim()))
    errors.slug = 'Use lowercase letters, numbers and single hyphens.'
  if (v.originalLanguage.trim())
    try {
      Intl.getCanonicalLocales(v.originalLanguage.trim())
    } catch {
      errors.originalLanguage =
        'Enter a valid language tag, such as en or id-ID.'
    }
  const year = v.releaseYear.trim()
  if (
    year &&
    (!/^\d{4}$/.test(year) || Number(year) < 1800 || Number(year) > 9999)
  )
    errors.releaseYear = 'Enter a whole year from 1800 to 9999.'
  const date = v.releaseDate.trim()
  if (date) {
    const parsed = new Date(date + 'T00:00:00Z')
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    )
      errors.releaseDate = 'Enter a valid calendar date.'
    else if (year && Number(year) !== Number(date.slice(0, 4)))
      errors.releaseDate = 'The release date must match the release year.'
  }
  if (v.genreIds.length > 100 || new Set(v.genreIds).size !== v.genreIds.length)
    errors.genreIds = 'Choose at most 100 distinct genres.'
  if (v.genreIds.some((id) => !isUuid(id)))
    errors.genreIds = 'One or more genre IDs are invalid.'
  return errors
}
const nullable = (v: string) => v.trim() || null
export function editorialFields(v: EditorialValues) {
  return {
    title: v.title.trim(),
    ...(v.slug.trim() ? { slug: v.slug.trim() } : {}),
    originalTitle: nullable(v.originalTitle),
    synopsis: nullable(v.synopsis),
    description: nullable(v.description),
    originalLanguage: v.originalLanguage.trim()
      ? Intl.getCanonicalLocales(v.originalLanguage.trim())[0]
      : null,
    releaseYear: v.releaseYear.trim() ? Number(v.releaseYear) : null,
    releaseDate: nullable(v.releaseDate),
    genreIds: [...v.genreIds].sort(),
  }
}
export function createContentCommand(v: ContentValues): CreateContent {
  const common = editorialFields(v)
  return v.type === 'series'
    ? {
        type: v.type,
        input: { ...common, completionStatus: v.completionStatus },
      }
    : {
        type: v.type,
        input: {
          ...common,
          kind: v.type === 'film' ? 'movie' : 'standalone',
          rightsConfirmed: v.rightsConfirmed,
        },
      }
}

function changedFields<T extends object>(current: T, original: T): Partial<T> {
  const result: Partial<T> = {}
  for (const key of Object.keys(current) as Array<keyof T>) {
    if (JSON.stringify(current[key]) !== JSON.stringify(original[key]))
      result[key] = current[key]
  }
  return result
}
export function patchContentCommand(
  v: ContentValues,
  baseline: ContentDetail,
): PatchContent | undefined {
  const old = valuesFromDetail(baseline)
  const common = changedFields(editorialFields(v), editorialFields(old))
  if (baseline.type === 'series') {
    const input = {
      ...common,
      ...(v.completionStatus !== old.completionStatus
        ? { completionStatus: v.completionStatus }
        : {}),
      expectedVersion: baseline.data.rowVersion,
    }
    return Object.keys(input).length === 1
      ? undefined
      : { type: 'series', id: baseline.data.id, input }
  }
  const input = {
    ...common,
    ...(v.rightsConfirmed !== old.rightsConfirmed
      ? { rightsConfirmed: v.rightsConfirmed }
      : {}),
    expectedVersion: baseline.data.rowVersion,
  }
  return Object.keys(input).length === 1
    ? undefined
    : { type: baseline.type, id: baseline.data.id, input }
}
export function contentValuesChanged(
  current: ContentValues,
  original: ContentValues,
) {
  return JSON.stringify(current) !== JSON.stringify(original)
}

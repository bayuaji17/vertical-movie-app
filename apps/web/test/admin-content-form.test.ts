import { expect, test } from 'bun:test'
import type { ContentDetail } from '../src/lib/admin/content-client'
import {
  emptyContentValues,
  createContentCommand,
  patchContentCommand,
  validateContentValues,
  valuesFromDetail,
  isEditableContent,
} from '../src/lib/admin/content-form-state'

const genre = '00000000-0000-4000-8000-000000000002'
const video: ContentDetail = {
  type: 'film',
  data: {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Original',
    slug: 'original',
    originalTitle: 'Source',
    synopsis: 'Summary',
    description: null,
    originalLanguage: 'en',
    releaseYear: 2024,
    releaseDate: '2024-02-29',
    genreIds: [genre],
    publicationStatus: 'draft',
    sourceAvailability: 'not_uploaded',
    kind: 'movie',
    seasonId: null,
    episodeNumber: null,
    rightsConfirmedAt: '2026-10-05T00:00:00Z',
    rowVersion: 7,
    createdAt: '2026-10-05T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
    archivedAt: null,
    firstPublishedAt: null,
    publishedAt: null,
    series: null,
    season: null,
    effectiveGenres: [{ id: genre, name: 'Drama', slug: 'drama' }],
  },
}
test('minimal draft title and blank slug normalize per resource without video fields in Series', () => {
  const values = { ...emptyContentValues(), title: '  New draft  ' }
  expect(validateContentValues(values)).toEqual({})
  const film = createContentCommand(values)
  expect(film.input.title).toBe('New draft')
  expect(film.input).not.toHaveProperty('slug')
  expect(film.input).toHaveProperty('rightsConfirmed', false)
  const series = createContentCommand({ ...values, type: 'series' })
  expect(series.input).toHaveProperty('completionStatus', 'ongoing')
  expect(series.input).not.toHaveProperty('kind')
  expect(series.input).not.toHaveProperty('rightsConfirmed')
  expect(
    createContentCommand({ ...values, type: 'standalone' }).input,
  ).toHaveProperty('kind', 'standalone')
})
test('validation catches bounds, real calendar days, year mismatch, BCP47 and duplicate genres', () => {
  const values = {
    ...emptyContentValues(),
    title: ' ',
    slug: 'Bad--Slug',
    releaseYear: '1799',
    releaseDate: '2023-02-29',
    originalLanguage: 'not_a_language',
    genreIds: [genre, genre],
  }
  const errors = validateContentValues(values)
  for (const field of [
    'title',
    'slug',
    'releaseYear',
    'releaseDate',
    'originalLanguage',
    'genreIds',
  ])
    expect(errors).toHaveProperty(field)
  expect(
    validateContentValues({
      ...emptyContentValues(),
      title: 'Valid',
      releaseYear: '2024',
      releaseDate: '2024-02-29',
    }),
  ).toEqual({})
  expect(
    validateContentValues({
      ...emptyContentValues(),
      title: 'Valid',
      releaseYear: '2025',
      releaseDate: '2024-02-29',
    }),
  ).toHaveProperty('releaseDate')
  expect(
    validateContentValues({ ...emptyContentValues(), title: 'x'.repeat(201) }),
  ).toHaveProperty('title')
  expect(
    validateContentValues({ ...emptyContentValues(), title: 'Valid' }, true),
  ).toHaveProperty('slug')
})
test('PATCH distinguishes clearing from unchanged and retains the actual loaded version', () => {
  const values = valuesFromDetail(video)
  expect(patchContentCommand(values, video)).toBeUndefined()
  const command = patchContentCommand(
    {
      ...values,
      originalTitle: '',
      synopsis: '',
      releaseYear: '',
      releaseDate: '',
      genreIds: [],
      rightsConfirmed: false,
    },
    video,
  )
  expect(command?.input).toEqual({
    originalTitle: null,
    synopsis: null,
    releaseYear: null,
    releaseDate: null,
    genreIds: [],
    rightsConfirmed: false,
    expectedVersion: 7,
  })
  expect(
    patchContentCommand(
      { ...values, title: ' Changed ', type: 'series' },
      video,
    )?.input,
  ).toEqual({ title: 'Changed', expectedVersion: 7 })
})
test('canonical language/genre order normalization and whitespace do not introduce spurious changes', () => {
  const values = valuesFromDetail(video)
  expect(
    patchContentCommand(
      { ...values, title: ' Original ', originalLanguage: 'EN' },
      video,
    ),
  ).toBeUndefined()
})
test('archived, published, episode and non-draft metadata are readonly', () => {
  expect(isEditableContent(video)).toBe(true)
  for (const data of [
    { ...video.data, publicationStatus: 'published' as const },
    { ...video.data, archivedAt: '2026-10-05T00:00:00Z' },
    { ...video.data, kind: 'episode' as const },
  ])
    expect(isEditableContent({ type: 'film', data })).toBe(false)
})

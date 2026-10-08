import { expect, test } from 'bun:test'
import {
  seasonValues,
  seasonInput,
  validateSeason,
  patchSeasonInput,
  episodeValues,
  validateEpisode,
  episodeInput,
  patchEpisodeInput,
  episodeListSearch,
} from '../src/lib/admin/series-form-state'
import type { Season, Episode } from '../src/lib/admin/series-client'
import { SeriesEditorScope } from '../src/lib/admin/series-editor-scope'
import { registerPrivateEffect } from '../src/lib/auth/private-effects'
import { clearAdminPrivateQueries } from '../src/lib/auth/session-cache'
import { QueryClient } from '@tanstack/react-query'

const season: Season = {
  id: '00000000-0000-4000-8000-000000000002',
  seriesId: '00000000-0000-4000-8000-000000000001',
  seasonNumber: 1,
  title: null,
  description: null,
  releaseYear: null,
  releaseDate: null,
  rowVersion: 7,
  archivedAt: null,
  createdAt: '2026-10-08T00:00:00Z',
  updatedAt: '2026-10-08T00:00:00Z',
}
test('season suggestions preserve reserved archived numbers and integer bounds', () => {
  expect(
    seasonValues(undefined, [
      season,
      { ...season, seasonNumber: 9, archivedAt: season.createdAt },
    ]).seasonNumber,
  ).toBe('10')
  expect(
    seasonValues(undefined, [{ ...season, seasonNumber: 2147483647 }])
      .seasonNumber,
  ).toBe('')
  for (const number of ['0', '-1', '1.2', '1e2', '2147483648', ''])
    expect(
      validateSeason({ ...seasonValues(), seasonNumber: number }),
    ).toHaveProperty('seasonNumber')
})
test('season release validation checks real calendar dates and matching year', () => {
  for (const date of ['2026-02-30', '2025-02-29', '2026-13-01'])
    expect(
      validateSeason({ ...seasonValues(), releaseDate: date }),
    ).toHaveProperty('releaseDate')
  expect(
    validateSeason({
      ...seasonValues(),
      releaseYear: '2026',
      releaseDate: '2025-01-01',
    }),
  ).toHaveProperty('releaseDate')
  expect(
    validateSeason({
      ...seasonValues(),
      releaseYear: '2024',
      releaseDate: '2024-02-29',
    }),
  ).toEqual({})
})
test('season patch uses its record version, preserves nullable clears and omits unchanged fields', () => {
  const initial = seasonValues(season)
  expect(patchSeasonInput(initial, season)).toBeUndefined()
  expect(patchSeasonInput({ ...initial, title: ' New ' }, season)).toEqual({
    expectedVersion: 7,
    title: 'New',
  })
  expect(patchSeasonInput(initial, { ...season, title: 'Before' })).toEqual({
    expectedVersion: 7,
    title: null,
  })
  expect(seasonInput(initial)).toEqual({
    seasonNumber: 1,
    title: null,
    description: null,
    releaseYear: null,
    releaseDate: null,
  })
})
test('auth cleanup stops owner writes and a reactivated scope rejects the old generation', async () => {
  const cache = new QueryClient(),
    scope = new SeriesEditorScope()
  scope.activate()
  const first = scope.signal
  const release = registerPrivateEffect(cache, () => scope.stop())
  expect(scope.accepts(first)).toBe(true)
  await clearAdminPrivateQueries(cache)
  expect(first.aborted).toBe(true)
  expect(scope.accepts(first)).toBe(false)
  scope.activate()
  expect(scope.accepts(first)).toBe(false)
  expect(scope.accepts(scope.signal)).toBe(true)
  scope.stop()
  expect(scope.accepts(scope.signal)).toBe(false)
  release()
  cache.clear()
})

test('episode forms enforce active same-series grouping and preserve number/title errors', () => {
  const values = {
    ...episodeValues(season.id),
    title: 'Pilot',
    episodeNumber: '2',
  }
  expect(validateEpisode(values, [season])).toEqual({})
  expect(
    validateEpisode({ ...values, seasonId: 'outside' }, [season]),
  ).toHaveProperty('seasonId')
  expect(
    validateEpisode(values, [{ ...season, archivedAt: season.createdAt }]),
  ).toHaveProperty('seasonId')
  for (const number of ['0', '-1', '1.2', '2147483648'])
    expect(
      validateEpisode({ ...values, episodeNumber: number }, [season]),
    ).toHaveProperty('episodeNumber')
  expect(validateEpisode({ ...values, title: ' ' }, [season])).toHaveProperty(
    'title',
  )
  expect(episodeInput(values)).toMatchObject({
    kind: 'episode',
    seasonId: season.id,
    episodeNumber: 2,
    genreIds: [],
    rightsConfirmed: false,
  })
})
test('episode patch clears explicit genres for inheritance without losing nullable clears or its record version', () => {
  const episode = {
    id: '00000000-0000-4000-8000-000000000003',
    seasonId: season.id,
    episodeNumber: 3,
    title: 'Pilot',
    slug: 'pilot',
    originalTitle: null,
    synopsis: 'Before',
    description: null,
    originalLanguage: null,
    releaseYear: null,
    releaseDate: null,
    genreIds: [season.id],
    rightsConfirmedAt: null,
    rowVersion: 9,
  } as Episode
  const values = episodeValues(season.id, episode)
  expect(patchEpisodeInput(values, episode)).toBeUndefined()
  expect(
    patchEpisodeInput({ ...values, genreIds: [], synopsis: '' }, episode),
  ).toEqual({ genreIds: [], synopsis: null, expectedVersion: 9 })
  expect(
    patchEpisodeInput(
      { ...values, seasonId: season.seriesId, episodeNumber: '7' },
      episode,
    ),
  ).toEqual({ seasonId: season.seriesId, episodeNumber: 7, expectedVersion: 9 })
  expect(episodeListSearch({ q: ' 雨 ', archived: 'true' })).toEqual({
    q: '雨',
    archived: true,
  })
  expect(episodeListSearch({ q: 42, archived: 'false' })).toEqual({
    q: '',
    archived: false,
  })
})

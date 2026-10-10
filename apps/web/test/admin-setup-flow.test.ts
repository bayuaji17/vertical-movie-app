import { expect, test } from 'bun:test'
import type { ContentDetail } from '../src/lib/admin/content-client'
import {
  canOpenReview,
  canUseSetup,
  initialSetupStep,
  isSetupType,
  mediaReady,
  parseSetupStep,
  setupHref,
  setupSearch,
  setupSteps,
} from '../src/lib/admin/setup-flow'
import { inventoryFixture } from './admin-media-fixture'

const ready = () =>
  ({
    state: 'ready',
    verifiedReadyAt: '2026-10-10T00:00:00.000Z',
    processing: { jobState: 'succeeded' },
  }) as never
const processing = () =>
  ({ state: 'processing', processing: { jobState: 'running' } }) as never
function media(
  source: 'none' | 'ready' | 'processing',
  poster: 'none' | 'ready',
) {
  const value = inventoryFixture()
  if (source === 'ready') value.source!.current = ready()
  if (source === 'processing') value.source!.current = processing()
  if (poster === 'ready') value.poster.current = ready()
  return value
}
const detail = (over: Record<string, unknown> = {}) =>
  ({
    type: 'film',
    data: {
      kind: 'movie',
      publicationStatus: 'draft',
      archivedAt: null,
      ...over,
    },
  }) as unknown as ContentDetail

test('only Film and Standalone drafts use the stepper', () => {
  expect(canUseSetup(detail())).toBe(true)
  expect(canUseSetup(detail({ kind: 'standalone' }))).toBe(true)
  expect(canUseSetup(detail({ kind: 'episode' }))).toBe(false)
  expect(canUseSetup(detail({ publicationStatus: 'published' }))).toBe(false)
  expect(canUseSetup(detail({ archivedAt: '2026-10-10T00:00:00.000Z' }))).toBe(
    false,
  )
  expect(
    canUseSetup({
      type: 'series',
      data: { publicationStatus: 'draft' },
    } as never),
  ).toBe(false)
  expect(isSetupType('film') && isSetupType('standalone')).toBe(true)
  expect(isSetupType('series')).toBe(false)
})

test('the step resumes at Review only when both video and cover are ready', () => {
  expect(initialSetupStep(undefined)).toBe('media')
  expect(initialSetupStep(media('none', 'none'))).toBe('media')
  expect(initialSetupStep(media('processing', 'ready'))).toBe('media')
  expect(initialSetupStep(media('ready', 'none'))).toBe('media')
  expect(initialSetupStep(media('ready', 'ready'))).toBe('review')
  expect(mediaReady(media('ready', 'ready'))).toBe(true)
  expect(canOpenReview(media('ready', 'none'))).toBe(false)
})

test('step states mark Details done and keep Review closed until ready', () => {
  const onMedia = setupSteps('media', media('processing', 'none'))
  expect(onMedia.map((s) => [s.id, s.state, s.enabled])).toEqual([
    ['details', 'done', true],
    ['media', 'current', true],
    ['review', 'todo', false],
  ])
  const openReview = setupSteps('media', media('ready', 'ready'))
  expect(openReview[2]).toMatchObject({ state: 'todo', enabled: true })
  const onReview = setupSteps('review', media('ready', 'ready'))
  expect(onReview.map((s) => s.state)).toEqual(['done', 'done', 'current'])
})

test('search parsing accepts only known steps; hrefs are stable', () => {
  expect(parseSetupStep('media')).toBe('media')
  expect(parseSetupStep('review')).toBe('review')
  expect(parseSetupStep('details')).toBeUndefined()
  expect(parseSetupStep(['review'])).toBeUndefined()
  expect(setupSearch({ step: 'nope', other: 1 })).toEqual({ step: undefined })
  expect(setupSearch({ step: 'review' })).toEqual({ step: 'review' })
  expect(setupHref('film', 'abc')).toBe('/admin/content/film/abc/setup')
  expect(setupHref('standalone', 'abc', 'media')).toBe(
    '/admin/content/standalone/abc/setup?step=media',
  )
})

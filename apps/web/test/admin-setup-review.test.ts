import { expect, test } from 'bun:test'
import type { ContentDetail } from '../src/lib/admin/content-client'
import { ContentApiError } from '../src/lib/admin/content-client'
import { reviewReady } from '../src/lib/admin/setup-flow'
import { ensureRights } from '../src/lib/admin/setup-rights'

const detail = (rightsConfirmedAt: string | null, rowVersion = 3) =>
  ({
    type: 'film',
    data: { id: 'v1', kind: 'movie', rowVersion, rightsConfirmedAt },
  }) as unknown as ContentDetail
const checks = (over: Record<string, string> = {}) =>
  [
    'ACTIVE_DRAFT',
    'TITLE',
    'SYNOPSIS',
    'RIGHTS',
    'VERIFIED_MEDIA',
    'NO_ACTIVE_UPLOAD',
    'ACTIVE_PARENTS',
  ].map((code) => ({
    code,
    status:
      code === 'ACTIVE_PARENTS' ? 'not-applicable' : (over[code] ?? 'passed'),
  }))

test('rights alone never block Publish, but every other check still does', () => {
  expect(reviewReady(undefined, false)).toBe(false)
  expect(reviewReady({ canPublish: true, checks: checks() }, true)).toBe(true)
  expect(
    reviewReady(
      { canPublish: false, checks: checks({ RIGHTS: 'blocked' }) },
      false,
    ),
  ).toBe(true)
  for (const code of [
    'TITLE',
    'SYNOPSIS',
    'VERIFIED_MEDIA',
    'NO_ACTIVE_UPLOAD',
  ])
    expect(
      reviewReady(
        {
          canPublish: false,
          checks: checks({ RIGHTS: 'blocked', [code]: 'blocked' }),
        },
        false,
      ),
    ).toBe(false)
  // Rights already confirmed yet the API still says no: trust the API.
  expect(
    reviewReady(
      { canPublish: false, checks: checks({ VERIFIED_MEDIA: 'blocked' }) },
      true,
    ),
  ).toBe(false)
})

test('rights already confirmed send nothing', async () => {
  let calls = 0
  const outcome = await ensureRights({
    detail: detail('2026-10-10T00:00:00.000Z'),
    patch: () => {
      calls++
      return Promise.resolve()
    },
    reload: () => {
      calls++
      return Promise.resolve(detail(null))
    },
  })
  expect(outcome).toEqual({ status: 'confirmed' })
  expect(calls).toBe(0)
})

test('confirming rights sends one PATCH with the version that was read', async () => {
  const seen: unknown[] = []
  const outcome = await ensureRights({
    detail: detail(null, 7),
    patch: (input) => {
      seen.push(input)
      return Promise.resolve()
    },
    reload: () => Promise.reject(new Error('not needed')),
  })
  expect(outcome).toEqual({ status: 'confirmed' })
  expect(seen).toEqual([{ rightsConfirmed: true, expectedVersion: 7 }])
})

test('a lost or conflicting response is settled by re-reading, without resending', async () => {
  let patches = 0
  const lost = await ensureRights({
    detail: detail(null),
    patch: () => {
      patches++
      return Promise.reject(new ContentApiError(0, 'NETWORK', 'raw'))
    },
    reload: () => Promise.resolve(detail('2026-10-10T00:00:00.000Z', 4)),
  })
  expect(lost).toEqual({ status: 'confirmed' })
  expect(patches).toBe(1)
})

test('an unresolved failure reports a safe message and does not claim success', async () => {
  const conflict = await ensureRights({
    detail: detail(null),
    patch: () =>
      Promise.reject(
        new ContentApiError(409, 'CONTENT_VERSION_CONFLICT', 'raw server text'),
      ),
    reload: () => Promise.resolve(detail(null, 9)),
  })
  expect(conflict.status).toBe('failed')
  expect(conflict.status === 'failed' && conflict.message).toContain(
    'changed in another session',
  )
  expect(conflict.status === 'failed' && conflict.message).not.toContain(
    'raw server',
  )

  const unreachable = await ensureRights({
    detail: detail(null),
    patch: () => Promise.reject(new ContentApiError(0, 'NETWORK', 'raw')),
    reload: () => Promise.reject(new Error('offline')),
  })
  expect(unreachable.status).toBe('failed')
  expect(unreachable.status === 'failed' && unreachable.message).toContain(
    'could not be confirmed',
  )
})

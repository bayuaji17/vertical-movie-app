import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { SettingsEditorScope } from '../src/lib/admin/settings-editor-scope'
import {
  acceptConfirmedSettings,
  saveSettingsMutation,
  adminSettingsKey,
  adminSettingsOptions,
} from '../src/lib/admin/settings-queries'
import { createSettingsClient } from '../src/lib/admin/settings-client'
import type {
  SettingsClient,
  PrivateSettingsData,
} from '../src/lib/admin/settings-client'
import { defaultSiteSettings, settingsTtlMs } from '../src/lib/settings/model'
import { publicSettingsKey } from '../src/lib/settings/queries'
import { PrivateApiError } from '../src/lib/api/private-result'
import {
  registerPrivateEffect,
  stopAdminPrivateEffects,
} from '../src/lib/auth/private-effects'

const data = (rowVersion = 1, siteName = 'Saved'): PrivateSettingsData => ({
  item: {
    ...defaultSiteSettings,
    siteName,
    rowVersion,
    updatedAt: new Date(0).toISOString(),
  },
  expiresAt: Date.now() + settingsTtlMs,
})
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
function setup() {
  const scope = new SettingsEditorScope()
  scope.activate()
  scope.observe(data())
  scope.edit('siteName', 'Draft')
  return scope
}
test('identity-private no-store client validates response, uses full Eden body and exact fresh=1', async () => {
  const cache = new QueryClient(),
    seen: Request[] = []
  const client = createSettingsClient(
    'http://api.example',
    cache,
    async (input, init) => {
      seen.push(new Request(input, init))
      return Response.json({ item: data().item, freshForMs: 10000 })
    },
    () => 0,
  )
  expect((await client.read(undefined, true)).expiresAt).toBe(10000)
  expect(seen[0].url).toBe('http://api.example/admin/settings?fresh=1')
  await client.save({ ...defaultSiteSettings, expectedVersion: 1 })
  expect(seen[1].method).toBe('PATCH')
  expect((await seen[1].json()).expectedVersion).toBe(1)
  expect(seen[1].cache).toBe('no-store')
  cache.clear()
})
test('confirmed Save deduplicates, primes only settings keys, rejects older completion and leaves dirty refetch alone', async () => {
  const cache = new QueryClient(),
    scope = setup(),
    hold = deferred<PrivateSettingsData>()
  let writes = 0
  const client: SettingsClient = {
    read: async () => data(),
    save: async () => {
      writes++
      return hold.promise
    },
  }
  cache.setQueryData(['catalog', 'keep'], 'content')
  const accept = (value: PrivateSettingsData, signal: AbortSignal) =>
    acceptConfirmedSettings(cache, 'admin', value, signal)
  const save = scope.save(client, accept)
  await scope.save(client, accept)
  expect(writes).toBe(1)
  hold.resolve(data(2, 'Draft'))
  await save
  expect(scope.dirty).toBe(false)
  scope.observe(data(2, 'Draft'))
  expect(scope.snapshot().phase).toBe('saved')
  expect(
    cache.getQueryData<{ version: number }>(publicSettingsKey)?.version,
  ).toBe(2)
  await accept(data(1, 'Old'), scope.signal)
  expect(
    cache.getQueryData<PrivateSettingsData>(adminSettingsKey('admin'))?.item
      .siteName,
  ).toBe('Draft')
  expect(cache.getQueryData<string>(['catalog', 'keep'])).toBe('content')
  expect(cache.getQueryData(adminSettingsKey('other'))).toBeUndefined()
  scope.edit('siteName', 'Keep input')
  scope.observe(data(3, 'Remote'))
  expect(scope.snapshot().draft?.siteName).toBe('Keep input')
  expect(scope.snapshot().remoteVersion).toBe(3)
  scope.stop()
  cache.clear()
})
test('409 and unknown results preserve draft, never prime attempted text and never replay; fresh read compares observed state', async () => {
  for (const status of [409, 503, 0]) {
    const scope = setup()
    let writes = 0,
      fresh = false,
      accepted = 0
    const client: SettingsClient = {
      save: async () => {
        writes++
        throw new PrivateApiError(status, 'FAILED', 'safe')
      },
      read: async (_signal, force) => {
        fresh = !!force
        return data(2, 'Draft')
      },
    }
    const accept = async (d: PrivateSettingsData) => {
      accepted++
      return d
    }
    await scope.save(client, accept)
    expect(writes).toBe(1)
    expect(accepted).toBe(0)
    expect(scope.snapshot().draft?.siteName).toBe('Draft')
    expect(scope.snapshot().phase).toBe(status === 409 ? 'conflict' : 'unknown')
    await scope.save(client, accept)
    expect(writes).toBe(1)
    await scope.reload(client, accept, status !== 409)
    expect(fresh).toBe(true)
    expect(scope.dirty).toBe(false)
    expect(scope.snapshot().message).toContain(
      status === 409 ? 'reloaded' : 'match',
    )
    scope.stop()
  }
})
test('different recovery retains attempted draft and expected base; auth loss aborts/removes draft and ignores late results', async () => {
  const cache = new QueryClient(),
    scope = setup(),
    hold = deferred<PrivateSettingsData>()
  let accepted = 0
  const remove = registerPrivateEffect(cache, () => scope.stop()),
    client: SettingsClient = {
      read: async () => data(3, 'Other'),
      save: async () => hold.promise,
    }
  const pending = scope.save(client, async (d) => {
    accepted++
    return d
  })
  stopAdminPrivateEffects(cache)
  expect(scope.signal.aborted).toBe(true)
  expect(scope.snapshot().draft).toBeUndefined()
  hold.resolve(data(2, 'Draft'))
  await pending
  expect(accepted).toBe(0)
  remove()
  cache.clear()
  const other = setup()
  await other.save(
    {
      save: async () => {
        throw new PrivateApiError(0, 'NETWORK', 'Unknown')
      },
      read: async () => data(),
    },
    async (d) => d,
  )
  await other.reload(client, async (d) => d, true)
  expect(other.snapshot().draft?.siteName).toBe('Draft')
  expect(other.snapshot().phase).toBe('conflict')
  other.stop()
})
test('private late GET cannot replace higher Save; validation/offline disables mutation', async () => {
  const cache = new QueryClient(),
    held = deferred<PrivateSettingsData>(),
    client: SettingsClient = {
      read: async () => held.promise,
      save: async () => data(2),
    }
  const pending = cache
    .query(adminSettingsOptions(cache, client, 'admin'))
    .catch(() => undefined)
  await acceptConfirmedSettings(
    cache,
    'admin',
    data(2),
    new AbortController().signal,
  )
  held.resolve(data(1))
  await pending
  expect(
    cache.getQueryData<PrivateSettingsData>(adminSettingsKey('admin'))?.item
      .rowVersion,
  ).toBe(2)
  const scope = setup()
  scope.edit('tagline', 'two\nlines')
  let writes = 0
  const noSave: SettingsClient = {
    ...client,
    save: async () => {
      writes++
      return data(2)
    },
  }
  await scope.save(noSave, async (d) => d)
  expect(scope.errors.tagline).toBeDefined()
  scope.edit('tagline', '')
  await scope.save(noSave, async (d) => d, false)
  expect(writes).toBe(0)
  scope.stop()
  cache.clear()
})

test('an ambiguous mutation expires only the private settings key without replay or public draft priming', async () => {
  const cache = new QueryClient(),
    controller = new AbortController()
  cache.setQueryData(adminSettingsKey('admin'), data())
  cache.setQueryData(['admin', 'admin', 'content'], 'keep')
  cache.setQueryData(publicSettingsKey, {
    item: defaultSiteSettings,
    version: 1,
    expiresAt: Date.now() + settingsTtlMs,
  })
  let writes = 0
  const client: SettingsClient = {
    read: async () => data(),
    save: async () => {
      writes++
      throw new PrivateApiError(0, 'NETWORK', 'Uncertain')
    },
  }
  await expect(
    saveSettingsMutation(
      cache,
      'admin',
      client,
      { ...defaultSiteSettings, siteName: 'Attempt', expectedVersion: 1 },
      controller.signal,
    ),
  ).rejects.toThrow()
  expect(writes).toBe(1)
  expect(cache.getQueryState(adminSettingsKey('admin'))?.isInvalidated).toBe(
    true,
  )
  expect(
    cache.getQueryState(['admin', 'admin', 'content'])?.isInvalidated,
  ).toBe(false)
  expect(
    cache.getQueryData<{ version: number }>(publicSettingsKey)?.version,
  ).toBe(1)
  cache.clear()
})

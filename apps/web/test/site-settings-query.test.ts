import { expect, test } from 'bun:test'
import {
  QueryClient,
  QueryObserver,
  dehydrate,
  hydrate,
} from '@tanstack/react-query'
import {
  bootstrapPublicSettings,
  publicSettingsOptions,
  publicSettingsKey,
  updatePublicSettings,
} from '../src/lib/settings/queries'
import { defaultSiteSettings, settingsTtlMs } from '../src/lib/settings/model'

const data = (version = 1, expiresAt = Date.now() + 10000) => ({
  item: { ...defaultSiteSettings, siteName: `Site ${version}` },
  version,
  expiresAt,
})
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
test('request-scoped clients, SSR hydration and fresh navigation preserve original ten-second deadline', async () => {
  let calls = 0
  const server = new QueryClient(),
    read = async () => {
      calls++
      return data()
    }
  await bootstrapPublicSettings(server, read)
  const browser = new QueryClient()
  hydrate(browser, dehydrate(server))
  await browser.query(publicSettingsOptions(browser, read))
  expect(calls).toBe(1)
  const cached =
    browser.getQueryData<ReturnType<typeof data>>(publicSettingsKey)!
  expect(cached.expiresAt).toBe(
    server.getQueryData<ReturnType<typeof data>>(publicSettingsKey)!.expiresAt,
  )
  const isolated = new QueryClient()
  expect(isolated.getQueryData(publicSettingsKey)).toBeUndefined()
  const options = publicSettingsOptions(browser, read),
    observer = new QueryObserver(browser, options),
    remove = observer.subscribe(() => {})
  expect(observer.getCurrentResult().isStale).toBe(false)
  expect(options.gcTime).toBe(settingsTtlMs)
  remove()
  browser.clear()
  server.clear()
  isolated.clear()
})
test('already-expired slow hydration refetches once; observers share read and failed bootstrap never dehydrates defaults', async () => {
  const client = new QueryClient()
  client.setQueryData(publicSettingsKey, data(1, Date.now() - 1))
  const state = dehydrate(client),
    browser = new QueryClient()
  hydrate(browser, state)
  let calls = 0
  const read = async () => {
    calls++
    return data(2)
  }
  await Promise.all(
    Array.from({ length: 20 }, () =>
      browser.query(publicSettingsOptions(browser, read)),
    ),
  )
  expect(calls).toBe(1)
  expect(
    browser.getQueryData<ReturnType<typeof data>>(publicSettingsKey)?.version,
  ).toBe(2)
  const failed = new QueryClient()
  expect(
    await bootstrapPublicSettings(failed, async () => {
      throw Error('outage')
    }),
  ).toBeUndefined()
  expect(dehydrate(failed).queries).toHaveLength(0)
  client.clear()
  browser.clear()
  failed.clear()
})
test('confirmed update cancels old read and monotonic versions fence late results without touching content', async () => {
  const client = new QueryClient(),
    held = deferred<ReturnType<typeof data>>()
  client.setQueryData(['public-catalog', 'keep'], 'unchanged')
  const pending = client
    .query(publicSettingsOptions(client, async () => held.promise))
    .catch(() => undefined)
  await updatePublicSettings(client, data(3))
  held.resolve(data(1))
  await pending
  await updatePublicSettings(client, data(2))
  expect(
    client.getQueryData<ReturnType<typeof data>>(publicSettingsKey)?.version,
  ).toBe(3)
  expect(client.getQueryData<string>(['public-catalog', 'keep'])).toBe(
    'unchanged',
  )
  client.clear()
})
test('failed refresh retains last good public snapshot and does not retry or poll', async () => {
  const cache = new QueryClient()
  cache.setQueryData(publicSettingsKey, data(1, Date.now() - 1))
  let reads = 0
  const options = publicSettingsOptions(cache, async () => {
    reads++
    throw Error('offline')
  })
  await expect(cache.query(options)).rejects.toThrow()
  expect(reads).toBe(1)
  expect(
    cache.getQueryData<ReturnType<typeof data>>(publicSettingsKey)?.version,
  ).toBe(1)
  expect(options.retry).toBe(false)
  expect(options.refetchOnMount).toBe(true)
  expect(options.retryOnMount).toBe(false)
  cache.clear()
})

import { expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import {
  contentDetailOptions,
  contentEpisodesOptions,
  loadEpisodeContext,
} from '../src/lib/catalog/content-queries'
import { CatalogRequestError } from '../src/lib/catalog/catalog-client'

const api = (calls: string[], fail = false) =>
  ({
    detail: async (kind: string, slug: string) => {
      calls.push('detail:' + kind + ':' + slug)
      if (fail) throw new CatalogRequestError(503)
      return {
        item: { id: 'x', kind: 'series' },
        expiresAt: Date.now() + 60_000,
      }
    },
    episodes: async (slug: string, cursor: string | null) => {
      calls.push('episodes:' + slug + ':' + cursor)
      if (fail) throw new CatalogRequestError(503)
      return {
        items: [],
        total: 0,
        nextCursor: null,
        freshForMs: 60_000,
        expiresAt: Date.now() + 60_000,
      }
    },
  }) as never

test('episode context caches the series detail and first episode page for the watch page', async () => {
  const client = new QueryClient(),
    calls: string[] = []
  await loadEpisodeContext(client, 'a-series', api(calls))
  expect(calls.sort()).toEqual([
    'detail:series:a-series',
    'episodes:a-series:null',
  ])
  expect(
    client.getQueryData(contentDetailOptions('series', 'a-series').queryKey),
  ).toBeDefined()
  expect(
    client.getQueryData(contentEpisodesOptions('a-series').queryKey),
  ).toBeDefined()
  client.clear()
})
test('episode context failures are ignored and cache nothing', async () => {
  const client = new QueryClient(),
    calls: string[] = []
  await expect(
    loadEpisodeContext(client, 'a-series', api(calls, true)),
  ).resolves.toBeUndefined()
  expect(calls).toHaveLength(2)
  expect(
    client.getQueryData(contentEpisodesOptions('a-series').queryKey),
  ).toBeUndefined()
  client.clear()
})

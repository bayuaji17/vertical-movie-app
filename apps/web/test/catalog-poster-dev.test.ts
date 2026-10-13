import { expect, test } from 'bun:test'
import { routeCatalogPosterToNitro } from '../tooling/catalog-poster-dev'

const path = '/api/catalog/movie/10000000-0000-4000-8000-000000000001/poster'
test('only valid public poster GET image destinations enter Nitro dev routing', () => {
  const valid = {
    method: 'GET',
    url: path,
    headers: { 'sec-fetch-dest': 'image' },
  }
  routeCatalogPosterToNitro(valid)
  expect(valid.headers['sec-fetch-dest']).toBe('empty')
  for (const url of [
    '/api/catalog',
    path + '/extra',
    path.replace('10000000', 'invalid'),
    '/api/admin/videos',
    path.replace('/movie/', '/episode/'),
    '/src/routes/api/$.ts',
  ]) {
    const r = { method: 'GET', url, headers: { 'sec-fetch-dest': 'image' } }
    routeCatalogPosterToNitro(r)
    expect(r.headers['sec-fetch-dest']).toBe('image')
  }
  const post = {
    method: 'POST',
    url: path,
    headers: { 'sec-fetch-dest': 'image' },
  }
  routeCatalogPosterToNitro(post)
  expect(post.headers['sec-fetch-dest']).toBe('image')
  const script = {
    method: 'GET',
    url: path,
    headers: { 'sec-fetch-dest': 'script' },
  }
  routeCatalogPosterToNitro(script)
  expect(script.headers['sec-fetch-dest']).toBe('script')
})

const cover =
  '/api/admin/content/film/10000000-0000-4000-8000-000000000001/cover'
test('the admin cover thumbnail is routed the same way, but nothing else under /api/admin', () => {
  for (const url of [
    cover,
    cover + '?v=abc123',
    cover.replace('/film/', '/series/'),
  ]) {
    const r = { method: 'GET', url, headers: { 'sec-fetch-dest': 'image' } }
    routeCatalogPosterToNitro(r)
    expect(r.headers['sec-fetch-dest']).toBe('empty')
  }
  for (const url of [
    cover + '/extra',
    cover.replace('/film/', '/episode/'),
    cover.replace('10000000', 'invalid'),
    '/api/admin/content?type=film',
    '/api/admin/dashboard/summary',
    cover.replace('/cover', '/poster'),
  ]) {
    const r = { method: 'GET', url, headers: { 'sec-fetch-dest': 'image' } }
    routeCatalogPosterToNitro(r)
    expect(r.headers['sec-fetch-dest']).toBe('image')
  }
  const post = {
    method: 'POST',
    url: cover,
    headers: { 'sec-fetch-dest': 'image' },
  }
  routeCatalogPosterToNitro(post)
  expect(post.headers['sec-fetch-dest']).toBe('image')
})

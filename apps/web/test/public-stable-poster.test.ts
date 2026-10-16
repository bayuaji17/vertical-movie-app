import { expect, test } from 'bun:test'
import { nextStablePoster } from '../src/lib/public/stable-poster'

const loader = () => Promise.resolve()
test('the poster of a source is taken once and kept across playback renewals', () => {
  let poster = nextStablePoster(undefined, loader, undefined)
  expect(poster).toBeUndefined()
  poster = nextStablePoster(poster, loader, 'https://s.test/poster.webp?sig=1')
  expect(poster?.url).toBe('https://s.test/poster.webp?sig=1')
  const first = poster
  // Renewals bring new signed URLs (and sometimes none); the poster does not change.
  for (const next of ['https://s.test/poster.webp?sig=2', undefined, '']) {
    poster = nextStablePoster(poster, loader, next)
    expect(poster).toBe(first)
  }
})
test('a different source gets its own poster and no poster until it has one', () => {
  const a = nextStablePoster(undefined, loader, 'https://s.test/a.webp?sig=1')
  const other = () => Promise.resolve()
  expect(nextStablePoster(a, other, undefined)).toBeUndefined()
  expect(nextStablePoster(a, other, 'https://s.test/b.webp?sig=1')?.url).toBe(
    'https://s.test/b.webp?sig=1',
  )
})

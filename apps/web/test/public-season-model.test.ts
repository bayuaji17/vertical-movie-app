import { expect, test } from 'bun:test'
import {
  activeSeason,
  episodeNeighbors,
  episodeLabel,
  seasonNumbers,
  seriesSummary,
  sortedEpisodes,
} from '../src/lib/catalog/season-model'
import type { PublicEpisode } from '../src/lib/catalog/content-model'

const episode = (season: number, number: number): PublicEpisode => ({
  id: `00000000-0000-4000-8000-${(season * 100 + number).toString(16).padStart(12, '0')}`,
  slug: `s${season}-e${number}`,
  title: `S${season}E${number}`,
  synopsis: 'Story',
  durationMs: 60_000,
  seasonNumber: season,
  episodeNumber: number,
})

test('episodes are deduplicated across pages and ordered by season then episode', () => {
  const merged = sortedEpisodes([
    { items: [episode(2, 1), episode(1, 2)] },
    { items: [episode(1, 1), episode(1, 2)] },
  ])
  expect(merged.map((e) => e.slug)).toEqual(['s1-e1', 's1-e2', 's2-e1'])
  expect(sortedEpisodes(undefined)).toEqual([])
  expect(episodeLabel(merged.at(0)!)).toBe('S1 E1')
})
test('seasons come from loaded episodes and the choice survives only while it exists', () => {
  const merged = sortedEpisodes([
    { items: [episode(3, 1), episode(1, 1), episode(3, 2)] },
  ])
  expect(seasonNumbers(merged)).toEqual([1, 3])
  expect(activeSeason([1, 3], undefined)).toBe(1)
  expect(activeSeason([1, 3], 3)).toBe(3)
  expect(activeSeason([1, 3], 2)).toBe(1)
  expect(activeSeason([], 1)).toBeUndefined()
})
test('season count is only claimed once every episode page is loaded', () => {
  expect(seriesSummary(6, 2, true)).toBe('2 seasons · 6 episodes')
  expect(seriesSummary(1, 1, true)).toBe('1 season · 1 episode')
  expect(seriesSummary(150, 1, false)).toBe('150 episodes')
  expect(seriesSummary(3, 0, true)).toBe('3 episodes')
})
test('neighbors cross season boundaries and ask for more pages at the edge of the loaded list', () => {
  const list = sortedEpisodes([
    { items: [episode(1, 1), episode(1, 2), episode(2, 1)] },
  ])
  const middle = episodeNeighbors(list, list[1].id)
  expect(middle.previous?.slug).toBe('s1-e1')
  expect(middle.next?.slug).toBe('s2-e1')
  expect(middle.needsMore).toBe(false)
  const first = episodeNeighbors(list, list[0].id)
  expect(first.previous).toBeUndefined()
  expect(first.next?.slug).toBe('s1-e2')
  const last = episodeNeighbors(list, list[2].id)
  expect(last.previous?.slug).toBe('s1-e2')
  expect(last.next).toBeUndefined()
  expect(last.needsMore).toBe(true)
  const missing = episodeNeighbors(list, 'not-loaded')
  expect(missing).toEqual({
    index: -1,
    previous: undefined,
    next: undefined,
    needsMore: true,
  })
  expect(episodeNeighbors([], 'x').needsMore).toBe(true)
})

import type { PublicEpisode } from './content-model'

export const episodePageSize = 100
const order = (a: PublicEpisode, b: PublicEpisode) =>
  a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber

/** Loaded episodes, deduplicated by id and ordered by season then episode. */
export function sortedEpisodes(pages: Array<{ items: PublicEpisode[] }> = []) {
  return [
    ...new Map(pages.flatMap((p) => p.items).map((e) => [e.id, e])).values(),
  ].sort(order)
}
export function seasonNumbers(episodes: PublicEpisode[]) {
  return [...new Set(episodes.map((e) => e.seasonNumber))].sort((a, b) => a - b)
}
/** The chosen season while it still exists, otherwise the first one. */
export function activeSeason(
  numbers: number[],
  chosen: number | undefined,
): number | undefined {
  return chosen !== undefined && numbers.includes(chosen) ? chosen : numbers[0]
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
/** Season count is only known once every page is loaded. */
export function seriesSummary(
  total: number,
  seasons: number,
  complete: boolean,
) {
  return complete && seasons > 0
    ? `${plural(seasons, 'season')} · ${plural(total, 'episode')}`
    : plural(total, 'episode')
}
export const episodeLabel = (e: PublicEpisode) =>
  `S${e.seasonNumber} E${e.episodeNumber}`

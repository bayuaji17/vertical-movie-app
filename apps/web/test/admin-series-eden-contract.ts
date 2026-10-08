import type {
  createSeriesClient,
  EpisodeCreate,
  EpisodePatch,
  SeasonCreate,
} from '../src/lib/admin/series-client'

// Compile-only proof; no runtime API/auth-server import or network execution.
export async function verifySeriesEditorContract(
  client: ReturnType<typeof createSeriesClient>,
) {
  const seriesId = '00000000-0000-4000-8000-000000000001',
    seasonId = '00000000-0000-4000-8000-000000000002'
  const input: SeasonCreate = { seasonNumber: 2, title: 'Second' }
  const season = await client.createSeason(seriesId, input)
  const version: number = season.rowVersion
  await client.patchSeason(seriesId, seasonId, {
    expectedVersion: version,
    title: null,
  })
  const episode: EpisodeCreate = {
    kind: 'episode',
    title: 'Pilot',
    seasonId,
    episodeNumber: 1,
  }
  const created = await client.createEpisode(episode)
  await client.patchEpisode(created.id, {
    expectedVersion: created.rowVersion,
    rightsConfirmed: true,
  })
  const detail = await client.episode(seriesId, created.id)
  const kind: 'episode' = detail.kind
  const page = await client.episodes({
    seriesId,
    seasonId,
    search: kind,
    includeArchived: false,
  })
  const cursor: string | null = page.nextCursor
  await client.episodes(
    { seriesId, seasonId, search: '', includeArchived: false },
    cursor ?? undefined,
  )
  // @ts-expect-error Episode create requires grouping.
  const missing: EpisodeCreate = { kind: 'episode', title: 'Missing' }
  const movie: EpisodeCreate = {
    // @ts-expect-error Movie is not an Episode creation command.
    kind: 'movie',
    title: 'Movie',
    seasonId,
    episodeNumber: 1,
  }
  const publish: EpisodePatch = {
    expectedVersion: 1,
    // @ts-expect-error Metadata patch cannot publish an Episode.
    publicationStatus: 'published',
  }
  void [missing, movie, publish]
}

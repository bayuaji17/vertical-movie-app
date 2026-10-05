import type { createApiClient } from '../src/lib/api/client'

/** Compile-only contract proof: no network calls or runtime import of API. */
export async function verifyContentContract(
  client: ReturnType<typeof createApiClient>,
) {
  await client.admin.content.get({
    query: { type: 'film', page: '2', pageSize: '25' },
  })
  // @ts-expect-error Episode is not a top-level content type.
  await client.admin.content.get({ query: { type: 'episode' } })
  const movie = await client.admin.videos.post({
    kind: 'movie',
    title: 'Movie',
  })
  if (movie.data) {
    const id: string = movie.data.id
    const kind: 'movie' | 'standalone' | 'episode' = movie.data.kind
    await client.admin.videos({ id }).patch({ expectedVersion: 1, title: kind })
    await client.admin.videos({ id }).archive.post({ expectedVersion: 2 })
  }
  const series = await client.admin.series.post({ title: 'Series' })
  if (series.data)
    await client.admin
      .series({ id: series.data.series.id })
      .seasons.post({ seasonNumber: 2 })
  // @ts-expect-error Episodes require a season and episode number.
  await client.admin.videos.post({ kind: 'episode', title: 'Missing grouping' })
  await client.admin.videos.post({
    kind: 'movie',
    title: 'Movie',
    // @ts-expect-error Movies cannot carry episode grouping.
    seasonId: '01900000-0000-7000-8000-000000000000',
  })
  await client.admin
    .videos({ id: '01900000-0000-7000-8000-000000000000' })
    .patch({
      expectedVersion: 1,
      // @ts-expect-error Publication is not an editable metadata field.
      publicationStatus: 'published',
    })
}

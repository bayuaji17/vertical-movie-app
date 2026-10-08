import type { createApiClient } from '../src/lib/api/client'

export async function publicCatalogContract(
  client: ReturnType<typeof createApiClient>,
  id: string,
) {
  const page = await client.catalog.get({
    query: { limit: '6', kind: 'series', genreId: id },
  })
  if (page.data)
    for (const item of page.data.items) {
      const title: string = item.title
      void title
      if (item.kind === 'series') {
        const count: number = item.episodeCount
        void count
      } else {
        const duration: number = item.durationMs
        void duration
      }
    }
  await client.catalog.genres.get({ query: { limit: '100' } })
  const featured = await client.catalog.featured.get()
  if (featured.data?.item) {
    const kind: 'movie' = featured.data.item.kind
    void kind
  }
  await client.catalog({ kind: 'movie' })({ id }).poster.get()
  await client.videos.get({ query: { kinds: 'movie,standalone', limit: '20' } })
  const poster = await client.videos({ slug: 'a-film' }).poster.get()
  if (poster.data) {
    const url: string = poster.data.posterUrl
    void url
  }
  // @ts-expect-error Episode is not a finite public catalog kinds filter.
  await client.videos.get({ query: { kinds: 'episode' } })
  // @ts-expect-error Individual episodes are excluded from the public home feed.
  await client.catalog.get({ query: { kind: 'episode' } })
  // @ts-expect-error Limit is an HTTP query string, not a number.
  await client.catalog.get({ query: { limit: 6 } })
}

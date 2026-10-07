import type { createApiClient } from '../src/lib/api/client'

// Compiled by check-types; never requests a running API.
export async function publicContentContract(
  api: ReturnType<typeof createApiClient>,
) {
  const detail = await api.catalog
    .details({ kind: 'series' })({ slug: 'a-series' })
    .get()
  if (detail.data) {
    const ttl: number = detail.data.freshForMs
    void ttl
    // @ts-expect-error Public detail never contains a playback capability.
    void detail.data.item.masterUrl
  }
  const episodes = await api.catalog
    .series({ slug: 'a-series' })
    .episodes.get({ query: { limit: '20', cursor: 'opaque' } })
  if (episodes.data) {
    const season: number | undefined = episodes.data.items[0]?.seasonNumber
    void season
    // @ts-expect-error Public episode DTO has no private storage pointer.
    void episodes.data.items[0]?.outputPrefix
  }
  const watch = await api.catalog.watch({ slug: 'episode-one' }).get()
  if (watch.data) {
    const ttl: number = watch.data.freshForMs
    void ttl
    // @ts-expect-error Unsigned watch metadata never contains a signed poster URL.
    void watch.data.item.posterUrl
  }
}

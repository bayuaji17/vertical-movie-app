// Fixture API for public-watch-flow-browser-worker.mjs (WFLOW-008).
// Serves catalog, series, episode, film and watch data from memory and proxies
// every other path (site settings, health) to the real dev API, so no database
// is touched. Playback is answered 503 on purpose: the proof covers layout and
// navigation, not HLS.
//
//   FIXTURE_PORT=3101 REAL_API=http://localhost:3001 bun apps/web/test/public-watch-flow-fixture-api.ts
//   PORT=3200 API_INTERNAL_URL=http://localhost:3101 bun apps/web/.output/server/index.mjs
const REAL = process.env.REAL_API ?? 'http://localhost:3001'
const PORT = Number(process.env.FIXTURE_PORT ?? 3101)
const fresh = 60_000
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const stamp = (n: number) =>
  `2026-10-${String(30 - (n % 28)).padStart(2, '0')}T00:00:00.${String(n).padStart(6, '0')}Z`
const genre = (n: number, name: string) => ({
  id: uuid(9000 + n),
  slug: name.toLowerCase(),
  name,
})
const noir = genre(1, 'Noir'),
  mystery = genre(2, 'Mystery')

type Item = {
  id: string
  kind: 'movie' | 'standalone' | 'series'
  slug: string
  title: string
  synopsis: string
  publishedAt: string
  genres: ReturnType<typeof genre>[]
  posterPath: string
  durationMs?: number
  episodeCount?: number
}
function make(
  n: number,
  kind: Item['kind'],
  slug: string,
  title: string,
  synopsis: string,
  extra: Partial<Item> = {},
): Item {
  const id = uuid(n)
  return {
    id,
    kind,
    slug,
    title,
    synopsis,
    publishedAt: stamp(n),
    genres: [],
    posterPath: `/catalog/${kind}/${id}/poster`,
    ...(kind === 'series' ? { episodeCount: 5 } : { durationMs: 12 * 60_000 }),
    ...extra,
  }
}
const long =
  'A courier races the clock across a sleeping city with a package she was told never to open. By dawn she must decide who to trust and what to deliver. '.repeat(
    3,
  )
const items: Item[] = [
  make(1, 'movie', 'midnight-run', 'Midnight Run', long, {
    genres: [noir, mystery],
  }),
  make(
    2,
    'series',
    'neon-garden',
    'Neon Garden',
    'A rooftop garden hides a city-wide mystery. ' + long,
    {
      genres: [mystery],
      episodeCount: 5,
    },
  ),
  make(
    3,
    'standalone',
    'last-train-home',
    'Last Train Home',
    'The final train carries more than passengers.',
  ),
  make(
    4,
    'series',
    'room-9',
    'Room 9',
    'Every guest checks in with a different story.',
    { episodeCount: 2 },
  ),
  make(
    5,
    'movie',
    'paper-lanterns',
    'Paper Lanterns',
    'Two strangers share a festival night and one secret.',
  ),
  ...Array.from({ length: 24 }, (_, i) =>
    make(
      10 + i,
      i % 5 === 0 ? 'standalone' : 'movie',
      `filler-${i + 1}`,
      `Filler Story ${i + 1}`,
      `Filler synopsis number ${i + 1} about night and light.`,
    ),
  ),
]
const bySlug = (slug: string) => items.find((i) => i.slug === slug)

const ep = (
  n: number,
  series: string,
  season: number,
  number: number,
  title: string,
  synopsis: string,
) => ({
  id: uuid(200 + n),
  slug: `${series}-s${season}e${number}`,
  title,
  synopsis,
  durationMs: (10 + number) * 60_000,
  seasonNumber: season,
  episodeNumber: number,
})
const episodes: Record<string, ReturnType<typeof ep>[] | undefined> = {
  'neon-garden': [
    ep(
      1,
      'neon-garden',
      1,
      1,
      'Pilot',
      'The garden is found and the first clue appears.',
    ),
    ep(2, 'neon-garden', 1, 2, 'Roots', 'A neighbor remembers who planted it.'),
    ep(
      3,
      'neon-garden',
      1,
      3,
      'Night Watering',
      'Someone is visiting after dark, and it is not the gardener.',
    ),
    ep(
      4,
      'neon-garden',
      2,
      1,
      'Second Bloom',
      'A new season opens with an old face.',
    ),
    ep(
      5,
      'neon-garden',
      2,
      2,
      'Overgrown',
      'The roof is closed to everyone but one person.',
    ),
  ],
  'room-9': [
    ep(6, 'room-9', 1, 1, 'Check In', 'The first guest arrives.'),
    ep(7, 'room-9', 1, 2, 'Check Out', 'The last guest leaves.'),
  ],
}
const watchOf = (slug: string) => {
  for (const [series, list] of Object.entries(episodes)) {
    const e = list?.find((x) => x.slug === slug)
    if (e)
      return {
        id: e.id,
        slug: e.slug,
        title: e.title,
        synopsis: e.synopsis,
        kind: 'episode',
        durationMs: e.durationMs,
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
        seriesSlug: series,
      }
  }
  const item = bySlug(slug)
  if (item && item.kind !== 'series')
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      synopsis: item.synopsis,
      kind: item.kind,
      durationMs: item.durationMs,
      seasonNumber: null,
      episodeNumber: null,
      seriesSlug: null,
    }
  return null
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, max-age=60',
    },
  })
const notFound = () => json({ error: 'not found' }, 404)
const svg = (label: string) =>
  new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a8f3c"/><stop offset="1" stop-color="#1e2a33"/></linearGradient></defs><rect width="900" height="1600" fill="url(#g)"/><text x="60" y="1500" font-size="96" fill="#fff" font-family="sans-serif">${label.replace(/[<&]/g, '')}</text></svg>`,
    {
      headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
    },
  )

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)
    const p = url.pathname
    const q = url.searchParams
    if (request.method === 'GET') {
      if (p === '/catalog') {
        const search = (q.get('search') ?? '').trim().toLowerCase()
        const kind = q.get('kind')
        const limit = Number(q.get('limit') ?? 6)
        const start = Number(q.get('cursor') ?? 0)
        const all = items.filter(
          (i) =>
            (!kind || i.kind === kind) &&
            (!search ||
              (i.title + ' ' + i.synopsis).toLowerCase().includes(search)),
        )
        const page = all.slice(start, start + limit)
        const next =
          start + page.length < all.length ? String(start + page.length) : null
        return json({
          items: page,
          total: all.length,
          nextCursor: next,
          freshForMs: fresh,
        })
      }
      if (p === '/catalog/genres')
        return json({ items: [], nextCursor: null, freshForMs: fresh })
      if (p === '/catalog/featured')
        return json({ item: null, freshForMs: fresh })
      let m = p.match(
        /^\/catalog\/details\/(movie|standalone|series)\/([a-z0-9-]+)$/,
      )
      if (m) {
        const item = bySlug(m[2])
        return item && item.kind === m[1]
          ? json({ item, freshForMs: fresh })
          : notFound()
      }
      m = p.match(/^\/catalog\/series\/([a-z0-9-]+)\/episodes$/)
      if (m) {
        const list = episodes[m[1]]
        if (!list) return notFound()
        const limit = Number(q.get('limit') ?? 20)
        const start = Number(q.get('cursor') ?? 0)
        const page = list.slice(start, start + limit)
        const next =
          start + page.length < list.length ? String(start + page.length) : null
        return json({
          items: page,
          total: list.length,
          nextCursor: next,
          freshForMs: fresh,
        })
      }
      m = p.match(/^\/catalog\/watch\/([a-z0-9-]+)$/)
      if (m) {
        const item = watchOf(m[1])
        return item ? json({ item, freshForMs: fresh }) : notFound()
      }
      m = p.match(
        /^\/catalog\/(movie|standalone|series)\/[0-9a-f-]{36}\/poster$/,
      )
      if (m) return svg(m[1])
      m = p.match(/^\/videos\/([a-z0-9-]+)$/)
      if (m) {
        const item = bySlug(m[1])
        if (item && item.kind !== 'series') {
          const w = watchOf(item.slug)
          return json(w)
        }
        return notFound()
      }
      m = p.match(/^\/videos\/([a-z0-9-]+)\/poster$/)
      if (m) {
        const w = watchOf(m[1])
        if (!w) return notFound()
        return json({
          videoId: w.id,
          posterUrl: `http://localhost:${PORT}/files/poster.webp`,
          expiresAt: new Date(Date.now() + 200_000).toISOString(),
        })
      }
      if (p === '/files/poster.webp') return svg('poster')
      if (/^\/videos\/[a-z0-9-]+\/playback$/.test(p))
        return json({ error: 'playback disabled in proof' }, 503)
    }
    // Everything else (settings, health, ...) goes to the real dev API.
    const target = new URL(p + url.search, REAL)
    return fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    })
  },
})
console.log('mock api on', PORT)

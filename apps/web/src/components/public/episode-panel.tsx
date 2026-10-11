import { useEffect, useRef, useState } from 'react'
import { EpisodeRow } from './episode-row'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { activeSeason } from '#/lib/catalog/season-model'
import type { EpisodeNav } from '#/hooks/use-episode-nav'
import type { WatchVideo } from '#/lib/catalog/content-model'

/** Season picker and episode list for the watched series; the current row is marked. */
export function EpisodePanel({
  nav,
  video,
}: {
  nav: EpisodeNav
  video: WatchVideo
}) {
  const [chosen, setChosen] = useState<number>()
  const season = activeSeason(
    nav.seasons,
    chosen ?? video.seasonNumber ?? undefined,
  )
  const list = useRef<HTMLUListElement>(null)
  // Keep the playing episode visible inside the scrolling list without moving the page.
  useEffect(() => {
    const box = list.current,
      row = box?.querySelector<HTMLElement>('[aria-current="page"]')
    if (box && row)
      box.scrollTop =
        row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2
  }, [nav.episodes.length, season])
  const visible = nav.episodes.filter((e) => e.seasonNumber === season)
  return (
    <section
      aria-label="Episodes"
      className="flex w-full flex-col gap-3 rounded-2xl border bg-card p-3 text-card-foreground sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold">Episodes</h2>
        {nav.seasons.length > 1 && season !== undefined && (
          <NativeSelect
            aria-label="Season"
            value={String(season)}
            onChange={(event) => setChosen(Number(event.target.value))}
            className="w-fit [&_select]:h-11"
          >
            {nav.seasons.map((n) => (
              <NativeSelectOption key={n} value={String(n)}>
                Season {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </div>
      {nav.failed ? (
        <div role="status" className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Episodes are temporarily unavailable.
          </p>
          <Button variant="outline" className="min-h-11" onClick={nav.retry}>
            Retry episodes
          </Button>
        </div>
      ) : nav.loading ? (
        <div
          role="status"
          aria-label="Loading episodes"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul
          ref={list}
          aria-label={
            season === undefined ? 'Episodes' : `Season ${season} episodes`
          }
          className="relative flex flex-col gap-2 lg:max-h-[340px] lg:overflow-y-auto"
        >
          {visible.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              current={episode.id === video.id}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import type { PublicEpisode } from '#/lib/catalog/content-model'

export function EpisodeRow({
  episode,
  current = false,
}: {
  episode: PublicEpisode
  current?: boolean
}) {
  return (
    <li>
      <Link
        to="/watch/$slug"
        params={{ slug: episode.slug }}
        preload={false}
        aria-current={current ? 'true' : undefined}
        className={cn(
          'grid min-h-11 grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
          current && 'border-primary bg-primary/10',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-10 place-items-center rounded-xl bg-muted font-heading text-sm font-semibold',
            current && 'bg-primary text-primary-foreground',
          )}
        >
          E{episode.episodeNumber}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold [overflow-wrap:anywhere]">
            <span className="sr-only">
              Season {episode.seasonNumber}, episode {episode.episodeNumber}
              :{' '}
            </span>
            {episode.title}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {episode.synopsis}
          </span>
        </span>
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {Math.ceil(episode.durationMs / 60000)} min
        </span>
      </Link>
    </li>
  )
}

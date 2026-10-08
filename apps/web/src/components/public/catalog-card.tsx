import type { ReactNode } from 'react'
import { Badge } from '#/components/ui/badge'
import { PublicPoster } from './public-poster'
import { durationLabel } from '#/lib/public/catalog-model'
import type { PublicVideo } from '#/lib/public/catalog-model'

export function CatalogCard({
  video,
  renderLink,
}: {
  video: PublicVideo
  renderLink: (children: ReactNode, className: string) => ReactNode
}) {
  return (
    <article
      data-public-card
      data-video-id={video.id}
      className="relative min-w-0"
    >
      <PublicPoster key={video.id} video={video} />
      {renderLink(
        <>
          <h2 className="min-w-0 font-heading text-base leading-snug font-semibold break-words">
            {video.title}
          </h2>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {video.kind === 'movie' ? 'Film' : 'Standalone'}
            </Badge>
            <span>{durationLabel(video.durationMs)}</span>
          </span>
        </>,
        "mt-3 flex min-h-11 min-w-0 flex-col gap-1 rounded-xl outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
      )}
    </article>
  )
}

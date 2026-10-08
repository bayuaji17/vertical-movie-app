import { RiImageLine } from '@remixicon/react'
import { usePublicPoster } from '#/hooks/use-public-poster'
import { usePublicOnline } from '#/hooks/use-public-online'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { PublicVideo } from '#/lib/public/catalog-model'

export function PublicPoster({ video }: { video: PublicVideo }) {
  const cover = usePublicPoster(video),
    online = usePublicOnline()
  return (
    <div
      ref={cover.ref}
      data-public-poster
      className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-muted"
    >
      {cover.source ? (
        <img
          key={cover.source}
          src={cover.source}
          alt={`Poster for ${video.title}`}
          width={900}
          height={1600}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={cover.onError}
        />
      ) : cover.failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3 text-center text-muted-foreground">
          <RiImageLine className="size-8" aria-hidden="true" />
          <p className="text-sm">Cover unavailable</p>
          <Button
            variant="outline"
            className="relative z-10 min-h-11"
            disabled={!online || cover.busy}
            onClick={cover.retry}
          >
            Retry cover
          </Button>
        </div>
      ) : (
        <Skeleton className="absolute inset-0 size-full" />
      )}
    </div>
  )
}

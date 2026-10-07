import { useEffect, useRef, useState } from 'react'
import { cn } from 'cn'
import type { CatalogItem } from '#/lib/catalog/catalog-schema'

const fallback = '/images/catalog/poster-fallback.svg'
export function Poster({
  item,
  eager = false,
  className,
}: {
  item: CatalogItem
  eager?: boolean
  className?: string
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  // A server-rendered image can fail before React installs its error handler.
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth === 0)
      setFailedSource(item.poster)
  }, [item.poster])
  const failed = failedSource === item.poster
  return (
    <div
      data-poster-frame
      className={cn(
        'relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-muted',
        className,
      )}
    >
      <img
        ref={imageRef}
        src={failed ? fallback : item.poster}
        alt={`Poster for ${item.title}`}
        width={900}
        height={1600}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
        onError={() => {
          if (!failed) setFailedSource(item.poster)
        }}
      />
    </div>
  )
}

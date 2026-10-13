import { useState } from 'react'
import { RiImageLine } from '@remixicon/react'
import type { ContentItem } from '#/lib/admin/content-client'
import { coverThumbUrl } from '#/lib/admin/content-readiness'

const box = 'h-14 w-8 shrink-0 rounded-md bg-muted'

/**
 * Small cover next to the title. It is only requested when the API says a
 * verified cover exists, loads lazily, and falls back to a placeholder.
 */
export function ContentThumb({ item }: { item: ContentItem }) {
  const [failed, setFailed] = useState(false)
  const url = coverThumbUrl(item)
  if (!url || failed)
    return (
      <span
        className={`${box} grid place-items-center text-muted-foreground`}
        aria-hidden="true"
      >
        <RiImageLine className="size-4" />
      </span>
    )
  return (
    <img
      src={url}
      alt={`Cover of ${item.title}`}
      width={32}
      height={56}
      loading="lazy"
      decoding="async"
      className={`${box} object-cover`}
      onError={() => setFailed(true)}
    />
  )
}

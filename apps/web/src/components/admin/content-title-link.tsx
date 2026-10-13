import { Link } from '@tanstack/react-router'
import type { ContentItem } from '#/lib/admin/content-client'

/** The title opens the item; the slug sits underneath for quick recognition. */
export function ContentTitleLink({
  item,
  slug = true,
}: {
  item: ContentItem
  slug?: boolean
}) {
  return (
    <div className="min-w-0">
      <Link
        to="/admin/content/$type/$id"
        params={{ type: item.type, id: item.id }}
        className="break-words font-medium underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {item.title}
      </Link>
      {slug && (
        <p className="break-all text-xs text-muted-foreground">{item.slug}</p>
      )}
    </div>
  )
}

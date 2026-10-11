import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Poster } from '#/components/catalog/poster'
import { itemLength, kindLabels } from '#/lib/catalog/public-catalog-model'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import { browseEntryState } from '#/lib/public/catalog-navigation'

const link =
  "mt-3 flex min-h-11 min-w-0 flex-col gap-1 rounded-xl outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
const body = (item: CatalogItem) => (
  <>
    <h2 className="min-w-0 font-heading text-base leading-snug font-semibold break-words">
      {item.title}
    </h2>
    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant="secondary">{kindLabels[item.kind]}</Badge>
      <span>{itemLength(item)}</span>
    </span>
  </>
)

export function BrowseCard({ item }: { item: CatalogItem }) {
  return (
    <article
      data-public-card
      data-catalog-id={`${item.kind}:${item.id}`}
      className="relative min-w-0"
    >
      <Poster item={item} />
      {item.kind === 'series' ? (
        <Link
          to="/series/$slug"
          params={{ slug: item.slug }}
          state={browseEntryState}
          preload={false}
          className={link}
        >
          {body(item)}
        </Link>
      ) : (
        <Link
          to="/videos/$slug"
          params={{ slug: item.slug }}
          state={browseEntryState}
          preload={false}
          className={link}
        >
          {body(item)}
        </Link>
      )}
    </article>
  )
}

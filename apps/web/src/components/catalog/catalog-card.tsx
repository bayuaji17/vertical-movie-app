import { Badge } from '#/components/ui/badge'
import {
  genreLabels,
  itemLength,
  kindLabels,
} from '#/lib/catalog/public-catalog-model'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import { Poster } from './poster'

export function CatalogCard({
  item,
  onDetails,
}: {
  item: CatalogItem
  onDetails: (item: CatalogItem, trigger: HTMLElement) => void
}) {
  return (
    <article
      data-catalog-card
      data-catalog-id={`${item.kind}:${item.id}`}
      className="min-w-0"
    >
      <button
        type="button"
        aria-label={`View details for ${item.title}`}
        className="group flex w-full min-w-0 flex-col gap-2 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        onClick={(event) => onDetails(item, event.currentTarget)}
      >
        <div className="relative w-full">
          <Poster item={item} />
          <span className="absolute right-2 bottom-2 rounded-lg bg-black/75 px-2 py-1 text-xs font-medium text-white">
            {itemLength(item)}
          </span>
        </div>
        <h3 className="font-heading text-base leading-snug font-semibold break-words group-hover:underline group-hover:underline-offset-4">
          {item.title}
        </h3>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Badge variant="secondary">{kindLabels[item.kind]}</Badge>
          <span className="text-muted-foreground">{genreLabels(item)}</span>
        </span>
      </button>
    </article>
  )
}

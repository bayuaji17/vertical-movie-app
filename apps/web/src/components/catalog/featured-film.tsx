import { RiPlayFill } from '@remixicon/react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  genreLabels,
  itemLength,
  kindLabels,
} from '#/lib/catalog/public-catalog-model'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import { Poster } from './poster'

export function FeaturedFilm({
  item,
  onDetails,
}: {
  item: CatalogItem
  onDetails: (item: CatalogItem, trigger: HTMLElement) => void
}) {
  return (
    <section
      aria-label="Featured film"
      className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-4 rounded-3xl bg-muted/60 p-4 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-7 sm:p-7 lg:grid-cols-[minmax(0,1fr)_210px] lg:px-12 lg:py-6"
    >
      <div className="flex min-w-0 flex-col items-start gap-3 lg:gap-5">
        <Badge variant="outline">Featured film</Badge>
        <h2 className="max-w-full font-heading text-2xl leading-tight font-bold tracking-tight break-words sm:text-4xl lg:text-5xl">
          {item.title}
        </h2>
        <p className="hidden max-w-xl text-base text-muted-foreground sm:block lg:text-lg">
          {item.synopsis}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
          <Badge variant="secondary">{kindLabels[item.kind]}</Badge>
          <span className="text-muted-foreground">{genreLabels(item)}</span>
          <span>{itemLength(item)}</span>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            className="min-h-11"
            onClick={(event) => onDetails(item, event.currentTarget)}
          >
            <RiPlayFill data-icon="inline-start" aria-hidden="true" />
            View film
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={(event) => onDetails(item, event.currentTarget)}
          >
            View details
          </Button>
        </div>
      </div>
      <Poster item={item} eager />
    </section>
  )
}

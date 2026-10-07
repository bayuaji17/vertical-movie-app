import { RiArrowDownLine, RiLoader4Line, RiSearchLine } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '#/components/ui/empty'
import type { CatalogItem } from '#/lib/catalog/catalog-schema'
import { CatalogCard } from './catalog-card'

export function CatalogGrid({
  items,
  total,
  hasNextPage,
  busy,
  onLoadMore,
  onReset,
  onDetails,
}: {
  items: Array<CatalogItem>
  total: number
  hasNextPage: boolean
  busy: boolean
  onLoadMore: () => void
  onReset: () => void
  onDetails: (item: CatalogItem, trigger: HTMLElement) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="sr-only" role="status" aria-live="polite">
        {items.length} of {total} titles shown
      </p>
      {items.length ? (
        <div
          data-catalog-grid
          className="grid grid-cols-2 items-start gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {items.map((item) => (
            <CatalogCard key={item.id} item={item} onDetails={onDetails} />
          ))}
        </div>
      ) : (
        <Empty className="border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiSearchLine aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No titles found</EmptyTitle>
            <EmptyDescription>
              Try a different search or reset your filters.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className="min-h-11" onClick={onReset}>
              Reset filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="min-h-11 px-6"
            disabled={busy}
            aria-busy={busy}
            onClick={onLoadMore}
          >
            {busy ? (
              <RiLoader4Line
                className="animate-spin"
                data-icon="inline-start"
                aria-hidden="true"
              />
            ) : (
              <RiArrowDownLine data-icon="inline-start" aria-hidden="true" />
            )}
            {busy ? 'Loading more' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}

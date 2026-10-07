import { RiArrowDownLine, RiLoader4Line, RiSearchLine } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '#/components/ui/empty'
import type { CatalogItem } from '#/lib/catalog/public-catalog-model'
import {
  catalogPageSize,
  itemIdentity,
} from '#/lib/catalog/public-catalog-model'
import { CatalogCard } from './catalog-card'

export function CatalogGrid({
  items,
  total,
  hasNextPage,
  busy,
  blocked,
  initialPending,
  initialError,
  nextPageError,
  refreshError,
  refreshing,
  paused,
  cursorInvalid,
  onLoadMore,
  onRetry,
  onRefresh,
  onReset,
  onDetails,
}: {
  items: Array<CatalogItem>
  total: number
  hasNextPage: boolean
  busy: boolean
  blocked: boolean
  initialPending: boolean
  initialError: boolean
  nextPageError: boolean
  refreshError: boolean
  refreshing: boolean
  paused: boolean
  cursorInvalid: boolean
  onLoadMore: () => void
  onRetry: () => void
  onRefresh: () => void
  onReset: () => void
  onDetails: (item: CatalogItem, trigger: HTMLElement) => void
}) {
  const skeletonCount = initialPending
    ? catalogPageSize
    : busy && hasNextPage
      ? Math.min(catalogPageSize, Math.max(0, total - items.length))
      : 0
  const label =
    items.length > total
      ? `${items.length} titles shown`
      : `${items.length} of ${total} titles shown`
  return (
    <div className="flex flex-col gap-6">
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {paused
          ? 'Waiting for a connection. '
          : initialPending
            ? 'Loading titles. '
            : busy
              ? 'Loading more titles. '
              : refreshing
                ? 'Refreshing titles. '
                : ''}
        {!initialError && !initialPending && label}
      </p>
      {initialError ? (
        <Empty className="border py-12">
          <EmptyHeader>
            <EmptyTitle>Catalog is temporarily unavailable</EmptyTitle>
            <EmptyDescription>
              Try again to load the latest titles.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="min-h-11"
              variant="outline"
              onClick={onRetry}
              disabled={blocked}
            >
              Retry catalog
            </Button>
          </EmptyContent>
        </Empty>
      ) : items.length || initialPending ? (
        <div
          data-catalog-grid
          aria-busy={busy || initialPending || refreshing}
          className="grid grid-cols-2 items-start gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {items.map((item) => (
            <CatalogCard
              key={itemIdentity(item)}
              item={item}
              onDetails={onDetails}
            />
          ))}
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div
              key={index}
              data-catalog-skeleton
              aria-hidden="true"
              className="flex min-w-0 flex-col gap-2"
            >
              <Skeleton className="aspect-[9/16] w-full motion-reduce:animate-none" />
              <Skeleton className="h-5 w-4/5 motion-reduce:animate-none" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 motion-reduce:animate-none" />
                <Skeleton className="h-5 w-12 motion-reduce:animate-none" />
              </div>
            </div>
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
      {nextPageError && (
        <p role="status" className="text-sm text-muted-foreground">
          {cursorInvalid
            ? 'Catalog changed. Refresh to continue.'
            : 'More titles could not be loaded. Your current titles are still available.'}
        </p>
      )}
      {refreshError && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <p className="text-sm text-muted-foreground">
            Refresh failed. Your current titles are still available.
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={blocked}
            onClick={onRefresh}
          >
            Retry refresh
          </Button>
        </div>
      )}
      {hasNextPage && !cursorInvalid && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="min-h-11 px-6"
            disabled={blocked}
            aria-busy={busy}
            onClick={onLoadMore}
          >
            {busy ? (
              <RiLoader4Line
                className="animate-spin motion-reduce:animate-none"
                data-icon="inline-start"
                aria-hidden="true"
              />
            ) : (
              <RiArrowDownLine data-icon="inline-start" aria-hidden="true" />
            )}
            {busy
              ? 'Loading more'
              : nextPageError
                ? 'Retry load more'
                : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}

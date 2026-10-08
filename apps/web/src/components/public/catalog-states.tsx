import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '#/components/ui/empty'

export function CatalogSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div role="status">
      <p className="sr-only">Loading videos…</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-3">
            <Skeleton className="aspect-[9/16] w-full rounded-2xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
export function PublicFailure({
  title,
  description,
  action,
  busy,
  onRetry,
}: {
  title: string
  description: string
  action: string
  busy: boolean
  onRetry: () => void
}) {
  return (
    <Empty role="status">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button className="min-h-11" disabled={busy} onClick={onRetry}>
          {action}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

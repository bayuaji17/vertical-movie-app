import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'

export function ContentFailure({
  status,
  onRetry,
  busy,
}: {
  status: number
  onRetry: () => void
  busy: boolean
}) {
  const missing = status === 404 || status === 422
  return (
    <div role="status" className="rounded-2xl border p-6">
      <h1 className="font-heading text-2xl font-bold">
        {missing ? 'Title unavailable' : 'Unable to load this title'}
      </h1>
      <p className="my-4 text-muted-foreground">
        {missing
          ? 'This title is no longer available in the public catalog.'
          : 'Please try again in a moment.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" disabled={busy} onClick={onRetry}>
          Retry title
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          nativeButton={false}
          role="link"
          render={<Link to="/" />}
        >
          Back to catalog
        </Button>
      </div>
    </div>
  )
}
export function ContentLoading() {
  return (
    <div
      role="status"
      aria-label="Loading title"
      className="grid gap-6 sm:grid-cols-[180px_1fr]"
    >
      <Skeleton className="aspect-[9/16] w-40" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

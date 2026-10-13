import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

// Rows are capped so a 100-row page does not paint a wall of placeholders.
export const skeletonRows = (pageSize: number) =>
  Math.max(3, Math.min(pageSize, 10))

/** Same structure as the loaded list: table on desktop, cards below it. */
export function ContentListSkeleton({ pageSize }: { pageSize: number }) {
  const rows = Array.from({ length: skeletonRows(pageSize) }, (_, i) => i)
  return (
    <div role="status" aria-label="Loading content">
      <div className="hidden rounded-3xl border bg-card p-4 lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              {['Title', 'Status', 'Readiness', 'Updated', 'Actions'].map(
                (label) => (
                  <TableHead key={label}>{label}</TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row}>
                {[45, 18, 24, 20, 36].map((width, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-6" style={{ width: `${width}%` }} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <Card key={row}>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-11 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  )
}

export type EmptyReason = 'page' | 'filtered' | 'none'
export const emptyReason = (total: number, filtered: boolean): EmptyReason =>
  total > 0 ? 'page' : filtered ? 'filtered' : 'none'

/** An empty list always offers a next step matching why it is empty. */
export function ContentEmpty({
  reason,
  onClear,
  onFirstPage,
}: {
  reason: EmptyReason
  onClear: () => void
  onFirstPage: () => void
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>
          {reason === 'page'
            ? 'No content on this page'
            : reason === 'filtered'
              ? 'No matching content'
              : 'No content yet'}
        </EmptyTitle>
        <EmptyDescription>
          {reason === 'page'
            ? 'This page is past the end of the results.'
            : reason === 'filtered'
              ? 'Try another title or change your filters.'
              : 'Create your first draft to get started.'}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {reason === 'none' ? (
          <Button
            nativeButton={false}
            className="min-h-11"
            render={<Link to="/admin/content/new" />}
          >
            Add a video
          </Button>
        ) : (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={reason === 'page' ? onFirstPage : onClear}
          >
            {reason === 'page' ? 'Go to the first page' : 'Clear filters'}
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )
}

/** Says how many results the current search/filters found, with a way out. */
export function ContentResultSummary({
  total,
  search,
  statusLabel,
  filtered,
  onClear,
}: {
  total: number
  search: string
  statusLabel: string
  filtered: boolean
  onClear: () => void
}) {
  // Without a search or filter there is nothing to report; keep the live
  // region so the first announcement is not lost, but take no space.
  if (!filtered) return <p role="status" className="sr-only" />
  return (
    <div className="mb-3 flex min-h-11 flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
      <p role="status">
        {`${total} ${total === 1 ? 'result' : 'results'}${
          search ? ` for “${search}”` : ''
        } · ${statusLabel}`}
      </p>
      <Button variant="ghost" className="min-h-11" onClick={onClear}>
        Clear all
      </Button>
    </div>
  )
}

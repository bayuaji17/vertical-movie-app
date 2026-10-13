import { ContentRowActions } from './content-row-actions'
import { ContentTitleLink } from './content-title-link'
import { ContentMeta } from './content-meta'
import { ContentReadiness } from './content-readiness'
import { ContentStatus } from './content-status'
import { ContentUpdated } from './content-updated'
import {
  ContentEmpty,
  ContentListSkeleton,
  ContentResultSummary,
  emptyReason,
} from './content-list-states'
import { ContentSortHead } from './content-sort-head'
import { ContentFiltersPanel } from './content-filters'
import { ContentPagination } from './content-pagination'
import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ContentFilters } from '#/lib/admin/content-client'
import { contentStatusLabels } from '#/lib/admin/content-client'
import { clearedFilters, isFiltered } from '#/lib/admin/content-list-state'
import { contentListOptions } from '#/lib/admin/content-queries'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { useContentApi } from '#/hooks/use-content-api'
import { useDashboardSummary } from '#/hooks/use-dashboard-summary'
import { AdminPageHeading } from './page-heading'
import { Button } from '#/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Card, CardContent, CardFooter } from '#/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from '#/components/ui/table'

export function ContentList({
  filters,
  onChange,
}: {
  filters: ContentFilters
  onChange: (patch: Partial<ContentFilters>) => void
}) {
  const { client, identity } = useContentApi()
  const query = useQuery(contentListOptions(client, identity, filters))
  const data = query.data
  // Counts for the tabs and status chips; a failure only hides the numbers.
  const counts = useDashboardSummary().query.data?.content
  useEffect(() => {
    if (!data || query.isFetching || query.isError) return
    const lastPage = Math.max(1, data.totalPages)
    if (filters.page > lastPage) onChange({ page: lastPage })
  }, [data, filters.page, onChange, query.isFetching, query.isError])

  return (
    <>
      <AdminPageHeading
        title="Content"
        description="Find and manage films, standalone videos, and series."
        actions={
          <Button
            nativeButton={false}
            className="min-h-11"
            render={<Link to="/admin/content/new" />}
          >
            Add a video
          </Button>
        }
      />
      <ContentFiltersPanel
        filters={filters}
        onChange={onChange}
        counts={counts}
      />
      <ContentResultSummary
        total={data?.total ?? 0}
        search={filters.search}
        statusLabel={contentStatusLabels[filters.status]}
        filtered={!!data && isFiltered(filters)}
        onClear={() => onChange(clearedFilters)}
      />
      {query.isError && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertTitle>
            {data ? 'Could not refresh content' : 'Content unavailable'}
          </AlertTitle>
          <AlertDescription>
            {contentErrorMessage(query.error)}
            {data && (
              <p>Showing previously loaded results for these filters.</p>
            )}
            <Button
              variant="outline"
              className="mt-2 min-h-11"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {query.isPending ? (
        <ContentListSkeleton pageSize={filters.pageSize} />
      ) : null}
      {data?.items.length === 0 ? (
        <ContentEmpty
          reason={emptyReason(data.total, isFiltered(filters))}
          onClear={() => onChange(clearedFilters)}
          onFirstPage={() => onChange({ page: 1 })}
        />
      ) : null}
      {data && data.items.length > 0 ? (
        <div
          aria-busy={query.isFetching}
          className={
            query.isFetching
              ? 'opacity-60 transition-opacity'
              : 'transition-opacity'
          }
        >
          <div className="hidden rounded-3xl border bg-card p-4 lg:block">
            <Table>
              <TableCaption className="sr-only">
                Content metadata for the selected filters
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <ContentSortHead
                    label="Title"
                    column="title"
                    filters={filters}
                    onChange={onChange}
                  />
                  <ContentSortHead
                    label="Status"
                    column="status"
                    filters={filters}
                    onChange={onChange}
                  />
                  <TableHead>Readiness</TableHead>
                  <ContentSortHead
                    label="Updated"
                    column="updated"
                    filters={filters}
                    onChange={onChange}
                  />
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-xs whitespace-normal">
                      <ContentTitleLink item={item} />
                      <ContentMeta item={item} />
                    </TableCell>
                    <TableCell>
                      <ContentStatus item={item} />
                    </TableCell>
                    <TableCell>
                      <ContentReadiness item={item} />
                    </TableCell>
                    <TableCell>
                      <ContentUpdated value={item.updatedAt} />
                    </TableCell>
                    <TableCell>
                      <ContentRowActions item={item} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 lg:hidden">
            {data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <ContentTitleLink item={item} slug={false} />
                      <ContentStatus item={item} />
                    </div>
                    <ContentMeta item={item} />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                      <ContentReadiness item={item} />
                      <ContentUpdated value={item.updatedAt} />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <ContentRowActions item={item} />
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ContentPagination
        filters={filters}
        onChange={onChange}
        data={data}
        pending={query.isFetching}
      />
      <p role="status" className="sr-only">
        {query.isFetching && !query.isPending ? 'Refreshing content...' : ''}
      </p>
    </>
  )
}

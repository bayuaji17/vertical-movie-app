import { ContentRowActions } from './content-row-actions'
import { ContentTitleLink } from './content-title-link'
import { ContentStatus } from './content-status'
import { ContentUpdated } from './content-updated'
import {
  ContentEmpty,
  ContentListSkeleton,
  emptyReason,
} from './content-list-states'
import { ContentFiltersPanel } from './content-filters'
import { ContentPagination } from './content-pagination'
import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ContentFilters } from '#/lib/admin/content-client'
import { contentLabels } from '#/lib/admin/content-client'
import { contentListOptions } from '#/lib/admin/content-queries'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { useContentApi } from '#/hooks/use-content-api'
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
      <ContentFiltersPanel filters={filters} onChange={onChange} />
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
          reason={emptyReason(
            data.total,
            filters.search !== '' || filters.includeArchived,
          )}
          onClear={() =>
            onChange({ search: '', includeArchived: false, page: 1 })
          }
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
                  {['Title', 'Type', 'Status', 'Updated', 'Actions'].map(
                    (label) => (
                      <TableHead key={label}>{label}</TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-xs whitespace-normal">
                      <ContentTitleLink item={item} />
                    </TableCell>
                    <TableCell>{contentLabels[item.type]}</TableCell>
                    <TableCell>
                      <ContentStatus item={item} />
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
                    <p className="text-sm text-muted-foreground">
                      {contentLabels[item.type]} ·{' '}
                      <ContentUpdated value={item.updatedAt} />
                    </p>
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

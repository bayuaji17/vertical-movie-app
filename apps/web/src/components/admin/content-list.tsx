import { ContentStatus } from './content-status'
import { ContentFiltersPanel } from './content-filters'
import { ContentPagination } from './content-pagination'
import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ContentFilters, ContentItem } from '#/lib/admin/content-client'
import { contentLabels } from '#/lib/admin/content-client'
import { contentListOptions } from '#/lib/admin/content-queries'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { useContentApi } from '#/hooks/use-content-api'
import { AdminPageHeading } from './page-heading'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '#/components/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from '#/components/ui/table'

function ContentActions({ item }: { item: ContentItem }) {
  const path = '/admin/content/' + item.type + '/' + item.id
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="min-h-11"
        nativeButton={false}
        render={<Link to={path} />}
      >
        View<span className="sr-only"> {item.title}</span>
      </Button>
      {!item.archivedAt && item.publicationStatus === 'draft' && (
        <Button
          variant="ghost"
          className="min-h-11"
          nativeButton={false}
          render={<Link to={path + '/edit'} />}
        >
          Edit<span className="sr-only"> {item.title}</span>
        </Button>
      )}
    </div>
  )
}
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
            Create draft
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
        <div role="status" aria-label="Loading content" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-32" key={i} />
          ))}
          <span className="sr-only">Loading content...</span>
        </div>
      ) : null}
      {data?.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              {data.total > 0
                ? 'No content on this page'
                : filters.search
                  ? 'No matching content'
                  : 'No content yet'}
            </EmptyTitle>
            <EmptyDescription>
              {data.total > 0
                ? 'Select an available page below.'
                : filters.search
                  ? 'Try another title or change your filters.'
                  : 'Create your first draft to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {data && data.items.length > 0 ? (
        <>
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
                      <span className="break-words font-medium">
                        {item.title}
                      </span>
                    </TableCell>
                    <TableCell>{contentLabels[item.type]}</TableCell>
                    <TableCell>
                      <ContentStatus item={item} />
                    </TableCell>
                    <TableCell>
                      <time dateTime={item.updatedAt}>
                        {item.updatedAt.slice(0, 10)}
                      </time>
                    </TableCell>
                    <TableCell>
                      <ContentActions item={item} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {data.items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="break-words">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">
                      {contentLabels[item.type]}
                    </Badge>
                    <ContentStatus item={item} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Updated{' '}
                    <time dateTime={item.updatedAt}>
                      {item.updatedAt.slice(0, 10)}
                    </time>
                  </p>
                </CardContent>
                <CardFooter>
                  <ContentActions item={item} />
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      ) : null}
      <ContentPagination
        filters={filters}
        onChange={onChange}
        data={data}
        pending={query.isFetching}
      />
      {query.isFetching && !query.isPending && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Refreshing content...
        </p>
      )}
    </>
  )
}

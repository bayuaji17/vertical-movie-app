import { ContentNextStep } from './content-next-step'
import { DeleteContent } from './delete-content'
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
import type { ContentFilters, ContentItem } from '#/lib/admin/content-client'
import { contentLabels } from '#/lib/admin/content-client'
import { deleteBlock } from '#/lib/admin/delete-state'
import type { DeleteTarget } from '#/lib/admin/delete-state'
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from '#/components/ui/table'

const deleteTarget = (item: ContentItem): DeleteTarget => ({
  kind: item.type === 'film' ? 'movie' : item.type,
  id: item.id,
  title: item.title,
  version: item.rowVersion,
  publicationStatus: item.publicationStatus,
  archivedAt: item.archivedAt,
})
const deletable = (item: ContentItem) => !deleteBlock(deleteTarget(item))
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
                      <span className="break-words font-medium">
                        {item.title}
                      </span>
                    </TableCell>
                    <TableCell>{contentLabels[item.type]}</TableCell>
                    <TableCell>
                      <ContentStatus item={item} />
                    </TableCell>
                    <TableCell>
                      <ContentUpdated value={item.updatedAt} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <ContentNextStep item={item} />
                        {deletable(item) && (
                          <DeleteContent compact target={deleteTarget(item)} />
                        )}
                      </div>
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
                    Updated <ContentUpdated value={item.updatedAt} />
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center gap-2">
                  <ContentNextStep item={item} />
                  {deletable(item) && (
                    <DeleteContent compact target={deleteTarget(item)} />
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
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

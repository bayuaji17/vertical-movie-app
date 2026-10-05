import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ContentDetail, ContentType } from '#/lib/admin/content-client'
import { isContentType } from '#/lib/admin/content-client'
import { contentDetailOptions } from '#/lib/admin/content-queries'
import { contentErrorMessage } from '#/lib/admin/content-errors'
import { contentSearch } from '#/lib/admin/content-list-state'
import { useContentApi } from '#/lib/admin/use-content-api'
import { Button } from '#/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { AdminPageHeading } from './page-heading'

export function BackToContent() {
  return (
    <Button
      nativeButton={false}
      variant="outline"
      className="min-h-11"
      render={<Link to="/admin/content" search={contentSearch({})} />}
    >
      Back to content
    </Button>
  )
}
export const contentHref = (type: ContentType, id: string) =>
  `/admin/content/${type}/${id}`
export function ContentResource({
  type,
  id,
  children,
}: {
  type: string
  id: string
  children: (detail: ContentDetail) => ReactNode
}) {
  if (
    !isContentType(type) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return (
      <>
        <AdminPageHeading
          title="Content not found"
          description="Check the content link and try again."
        />
        <BackToContent />
      </>
    )
  return (
    <ResourceQuery type={type} id={id}>
      {children}
    </ResourceQuery>
  )
}
function ResourceQuery({
  type,
  id,
  children,
}: {
  type: ContentType
  id: string
  children: (detail: ContentDetail) => ReactNode
}) {
  const { client, identity } = useContentApi()
  const query = useQuery(contentDetailOptions(client, identity, type, id))
  return (
    <>
      {query.isPending && (
        <div
          role="status"
          aria-label="Loading content details"
          className="space-y-4"
        >
          <Skeleton className="h-16" />
          <Skeleton className="h-80" />
          <span className="sr-only">Loading content details...</span>
        </div>
      )}
      {query.isError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Content unavailable</AlertTitle>
          <AlertDescription>
            <p>{contentErrorMessage(query.error)}</p>
            {query.data && <p>Previously loaded metadata is shown below.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Try again
              </Button>
              <BackToContent />
            </div>
          </AlertDescription>
        </Alert>
      )}
      {query.data && children(query.data)}
    </>
  )
}

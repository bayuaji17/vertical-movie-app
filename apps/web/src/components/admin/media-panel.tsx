import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from '#/lib/auth/session-context'
import { browserMediaClient } from '#/lib/admin/media-client'
import type { MediaOwner } from '#/lib/admin/media-client'
import type { ContentType } from '#/lib/admin/content-client'
import { ownerMediaOptions } from '#/lib/admin/media-queries'
import { useUploadManager } from '#/lib/admin/use-upload-manager'
import { mediaFailure } from '#/lib/admin/media-errors'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { MediaUploadCard } from './media-upload-card'

export function OwnerMediaPanel({
  owner,
  type,
}: {
  owner: MediaOwner
  type: ContentType
}) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    client = useMemo(() => browserMediaClient(cache), [cache])
  const query = useQuery(ownerMediaOptions(client, user.id, owner)),
    { manager } = useUploadManager(owner, type, query.data)
  return (
    <section aria-label="Upload media" className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Upload media</h2>
          <p className="text-sm text-muted-foreground">
            Upload the files for this draft. Upload completion, processing and
            publication are separate steps.
          </p>
        </div>
        {query.data?.canPreview && owner.ownerType === 'video' && (
          <Button
            nativeButton={false}
            variant="outline"
            className="min-h-11"
            render={
              <Link
                to="/admin/videos/$id/preview"
                params={{ id: owner.ownerId }}
              />
            }
          >
            Preview video
          </Button>
        )}
        <Button
          variant="outline"
          className="min-h-11"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh media
        </Button>
      </div>
      {query.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Loading media" />
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Media inventory unavailable</AlertTitle>
          <AlertDescription>
            {mediaFailure(query.error).message}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {query.data.source && (
            <MediaUploadCard
              kind="source"
              role={query.data.source}
              inventory={query.data}
              manager={manager}
            />
          )}
          <MediaUploadCard
            kind="poster"
            role={query.data.poster}
            inventory={query.data}
            manager={manager}
          />
        </div>
      )}
    </section>
  )
}

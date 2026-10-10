import { useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { MediaUploadCard } from '../media-upload-card'
import { VideoCard } from './video-card'
import { mediaFailure } from '#/lib/admin/media-errors'
import type { OwnerMedia } from '#/lib/admin/media-client'
import type { UploadManager } from '#/lib/admin/upload-manager'

// Step 2: the single video card plus the existing cover card (UFLOW-005 adds
// frame picking). Status refreshes by polling, so there are no manual refresh
// buttons here.
export function MediaStep({
  query,
  manager,
}: {
  query: UseQueryResult<OwnerMedia>
  manager?: UploadManager
}) {
  // Held in memory only: lets the cover offer frames from this video.
  const [videoFile, setVideoFile] = useState<File>()
  return (
    <section
      id="upload-media"
      aria-label="Media"
      className="flex min-w-0 flex-col gap-5"
    >
      {query.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Loading media" />
      ) : query.isError && !query.data ? (
        <Alert variant="destructive">
          <AlertTitle>Media is unavailable</AlertTitle>
          <AlertDescription>
            <p>{mediaFailure(query.error).message}</p>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <VideoCard
            inventory={query.data}
            manager={manager}
            onFilePicked={setVideoFile}
          />
          <MediaUploadCard
            kind="poster"
            role={query.data.poster}
            inventory={query.data}
            manager={manager}
            frameSource={videoFile}
          />
        </div>
      )}
    </section>
  )
}

import { useRef, useCallback, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  hasWorkingUploads,
  subscribeUploads,
  uploadRevision,
} from '#/lib/admin/upload-session-registry'
import { Link } from '@tanstack/react-router'
import { RiCheckLine, RiErrorWarningLine } from '@remixicon/react'
import type { ContentDetail, ContentType } from '#/lib/admin/content-client'
import { usePublication } from '#/lib/admin/use-publication'
import { useUploadManager } from '#/lib/admin/use-upload-manager'
import { snapshotMatches } from '#/lib/admin/publication-state'
import { publicationFailure } from '#/lib/admin/publication-errors'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '#/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { MediaPanelView } from './media-panel'
import { contentHref } from './content-resource'
import { PublishVideoDialog, ArchiveVideoDialog } from './publication-dialogs'

type SupportedType = Exclude<ContentType, 'series'>
type Publication = ReturnType<typeof usePublication>
const labels = {
  ACTIVE_DRAFT: ['Active draft', 'An active draft is required.'],
  TITLE: ['Title provided', 'Add a title before publishing.'],
  SYNOPSIS: ['Synopsis provided', 'Add a synopsis before publishing.'],
  RIGHTS: ['Content rights confirmed', 'Confirm content rights in metadata.'],
  VERIFIED_MEDIA: [
    'Verified video and cover ready',
    'Finish processing the video and cover before publishing.',
  ],
  NO_ACTIVE_UPLOAD: [
    'No active uploads',
    'Finish or cancel the active upload before publishing.',
  ],
  ACTIVE_PARENTS: [
    'Parent content available',
    'Parent content must be available.',
  ],
} as const
export function VideoPublicationMedia({
  detail,
  type,
  metadataStale,
}: {
  detail: ContentDetail
  type: SupportedType
  metadataStale: boolean
}) {
  const id = detail.data.id,
    cache = useQueryClient()
  useSyncExternalStore(
    (notify) => subscribeUploads(cache, notify),
    () => uploadRevision(cache),
    () => 0,
  )
  const uploadBusy = useCallback(
    () => hasWorkingUploads(cache, { ownerType: 'video', ownerId: id }),
    [cache, id],
  )
  const publication = usePublication(type, id, uploadBusy)
  const owner = { ownerType: 'video' as const, ownerId: id }
  const { manager } = useUploadManager(owner, type, publication.media.data)
  return (
    <>
      <PublicationPanel
        detail={detail}
        type={type}
        metadataStale={metadataStale}
        publication={publication}
        localBusy={uploadBusy()}
      />
      <MediaPanelView
        owner={owner}
        query={publication.media}
        manager={manager}
        showPreview={false}
      />
    </>
  )
}
export function publicationViewState(
  detail: ContentDetail,
  metadataStale: boolean,
  p: Publication,
  localBusy = false,
) {
  const { readiness, media, state } = p,
    r = readiness.data
  const busy = ['loading', 'pending'].includes(state.phase)
  const stale =
    metadataStale ||
    !p.online ||
    readiness.isFetching ||
    media.isFetching ||
    readiness.isError ||
    media.isError ||
    !!state.refreshUnavailable ||
    (!!r &&
      !!media.data &&
      !snapshotMatches(
        { detail, readiness: r, media: media.data },
        detail.data.id,
      ))
  return {
    r,
    busy,
    stale,
    canAct:
      !localBusy &&
      !stale &&
      !busy &&
      !['unknown', 'retryable', 'conflict', 'error'].includes(state.phase) &&
      !!r &&
      !!media.data,
  }
}
function PublicationPanel({
  detail,
  type,
  metadataStale,
  publication,
  localBusy,
}: {
  detail: ContentDetail
  type: SupportedType
  metadataStale: boolean
  publication: Publication
  localBusy: boolean
}) {
  const { controller, state, readiness, media } = publication
  const { r, busy, stale, canAct } = publicationViewState(
    detail,
    metadataStale,
    publication,
    localBusy,
  )
  const refreshFocus = useRef<HTMLButtonElement>(null)
  const publishTrigger = useRef<HTMLButtonElement>(null)
  const archiveTrigger = useRef<HTMLButtonElement>(null)
  const archiveOpen =
    state.action === 'archive' &&
    !!state.snapshot &&
    ['review', 'loading', 'pending'].includes(state.phase)
  const publishOpen =
    state.action === 'publish' &&
    !!state.snapshot &&
    ['review', 'loading', 'pending'].includes(state.phase)
  const status = r?.publicationStatus ?? detail.data.publicationStatus
  return (
    <>
      <Card aria-label="Publication" aria-busy={busy}>
        <CardHeader>
          <CardTitle>Publication</CardTitle>
          <CardDescription>
            {status === 'archived'
              ? 'This video is archived and read only.'
              : status === 'published'
                ? 'This video is published.'
                : 'Review readiness before making this video public.'}
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {status === 'archived'
                ? 'Archived'
                : status === 'published'
                  ? 'Published'
                  : r?.canPublish && !stale
                    ? 'Ready to publish'
                    : 'Not ready to publish'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {localBusy && (
            <Alert>
              <AlertTitle>Upload in progress</AlertTitle>
              <AlertDescription>
                Finish or pause the current upload before continuing.
              </AlertDescription>
            </Alert>
          )}
          {!publication.online && (
            <Alert>
              <AlertTitle>You are offline</AlertTitle>
              <AlertDescription>
                Reconnect, then check status before continuing.
              </AlertDescription>
            </Alert>
          )}
          {(readiness.isPending || media.isPending) && (
            <div role="status">
              <Skeleton className="h-32" />
              <span className="sr-only">Loading publication status…</span>
            </div>
          )}
          {(readiness.isError || media.isError) && (
            <Alert variant="destructive">
              <AlertTitle>Publication status unavailable.</AlertTitle>
              <AlertDescription>
                {publicationFailure(readiness.error ?? media.error).message}
              </AlertDescription>
            </Alert>
          )}
          {stale && (
            <Alert>
              <AlertTitle>Refresh before continuing</AlertTitle>
              <AlertDescription>
                Showing previously loaded status. Refresh before continuing.
              </AlertDescription>
            </Alert>
          )}
          {r && status === 'draft' && (
            <ul
              className="grid gap-5 md:grid-cols-2"
              aria-label="Publication checklist"
            >
              {r.checks
                .filter((c) => c.status !== 'not-applicable')
                .map((check) => {
                  const [label, reason] = labels[check.code],
                    passed = check.status === 'passed',
                    metadata = ['TITLE', 'SYNOPSIS', 'RIGHTS'].includes(
                      check.code,
                    )
                  return (
                    <li
                      key={check.code}
                      className="flex min-w-0 items-start gap-3"
                    >
                      {passed ? (
                        <RiCheckLine
                          aria-hidden="true"
                          className="mt-0.5 size-5 shrink-0"
                        />
                      ) : (
                        <RiErrorWarningLine
                          aria-hidden="true"
                          className="mt-0.5 size-5 shrink-0"
                        />
                      )}
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-sm font-medium">
                          {label}
                          <span className="sr-only">
                            : {passed ? 'Passed' : 'Blocked'}
                          </span>
                        </p>
                        {!passed && (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {reason}
                            </p>
                            {metadata ? (
                              <Button
                                nativeButton={false}
                                variant="link"
                                className="min-h-11 justify-start p-0"
                                render={
                                  <Link
                                    to={
                                      contentHref(type, detail.data.id) +
                                      '/edit'
                                    }
                                  />
                                }
                              >
                                Edit metadata
                              </Button>
                            ) : check.code !== 'ACTIVE_DRAFT' ? (
                              <Button
                                nativeButton={false}
                                variant="link"
                                className="min-h-11 justify-start p-0"
                                render={<a href="#upload-media" />}
                              >
                                Upload media
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}
          {status === 'draft' && (
            <Alert>
              <AlertTitle>Preview the video before publishing.</AlertTitle>
              <AlertDescription>
                This draft is not publicly available.
              </AlertDescription>
            </Alert>
          )}
          {status === 'archived' && (
            <p className="text-sm text-muted-foreground">
              New playback access is unavailable. Previously issued signed URLs
              may remain usable until they expire. Files still retained are
              preserved; a deleted original is not restored. Restore and
              republish are unavailable.
            </p>
          )}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm"
          >
            {busy
              ? state.phase === 'pending'
                ? 'Saving publication status…'
                : 'Checking current status…'
              : state.message}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {media.data?.canPreview && status !== 'archived' && (
            <Button
              nativeButton={false}
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              disabled={stale || busy}
              render={
                <Link
                  to="/admin/videos/$id/preview"
                  params={{ id: detail.data.id }}
                  search={{ type }}
                />
              }
            >
              Preview video
            </Button>
          )}
          {status === 'draft' && (
            <Button
              ref={publishTrigger}
              className="min-h-11 w-full sm:order-last sm:w-auto"
              disabled={!canAct || !r?.canPublish || !media.data?.canPreview}
              onClick={() => void controller.prepare('publish')}
            >
              Publish video
            </Button>
          )}
          {status === 'published' && (
            <Button
              ref={archiveTrigger}
              variant="destructive"
              className="min-h-11 w-full sm:order-last sm:w-auto"
              disabled={!canAct}
              onClick={() => void controller.prepare('archive')}
            >
              Archive video
            </Button>
          )}
          {state.phase === 'retryable' && state.action === 'archive' && (
            <Button
              variant="destructive"
              className="min-h-11 w-full sm:w-auto"
              disabled={busy}
              onClick={() => void controller.retry()}
            >
              Retry archive
            </Button>
          )}
          {status === 'published' &&
            !stale &&
            r?.publicationStatus === detail.data.publicationStatus && (
              <Button
                nativeButton={false}
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                render={
                  <Link to="/watch/$slug" params={{ slug: detail.data.slug }} />
                }
              >
                Open public video
              </Button>
            )}
          {state.phase === 'retryable' && state.action === 'publish' && (
            <Button
              className="min-h-11 w-full sm:w-auto"
              disabled={busy}
              onClick={() => void controller.retry()}
            >
              Retry publish
            </Button>
          )}
          <Button
            ref={refreshFocus}
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy || !publication.online}
            onClick={() => void controller.check()}
          >
            {['unknown', 'retryable'].includes(state.phase)
              ? 'Check status'
              : 'Refresh status'}
          </Button>
        </CardFooter>
      </Card>
      {archiveOpen && (
        <ArchiveVideoDialog
          controller={controller}
          state={state}
          returnFocus={archiveTrigger}
          fallbackFocus={refreshFocus}
          canConfirm={!localBusy && publication.online && !stale}
        />
      )}
      {publishOpen && (
        <PublishVideoDialog
          controller={controller}
          state={state}
          returnFocus={publishTrigger}
          fallbackFocus={refreshFocus}
          canConfirm={!localBusy && publication.online && !stale}
        />
      )}
    </>
  )
}

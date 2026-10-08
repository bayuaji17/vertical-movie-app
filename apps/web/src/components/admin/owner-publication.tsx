import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { PublicationDetail } from '#/lib/admin/publication-state'
import { snapshotMatches } from '#/lib/admin/publication-state'
import type { PublicationTarget } from '#/lib/admin/owner-publication-queries'
import { useOwnerPublication } from '#/hooks/use-owner-publication'
import { useUploadManager } from '#/hooks/use-upload-manager'
import {
  hasWorkingUploads,
  subscribeUploads,
  uploadRevision,
} from '#/lib/admin/upload-session-registry'
import { publicationFailure } from '#/lib/admin/publication-errors'
import {
  episodeHref,
  seriesHref,
  seasonsHref,
} from '#/lib/admin/series-form-state'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { MediaPanelView } from './media-panel'
import { PublishVideoDialog, ArchiveVideoDialog } from './publication-dialogs'

const labels = {
  ACTIVE_DRAFT: ['Active draft', 'An active draft is required.'],
  TITLE: ['Title provided', 'Add a title before publishing.'],
  SYNOPSIS: ['Synopsis provided', 'Add a synopsis before publishing.'],
  RIGHTS: ['Content rights confirmed', 'Confirm rights in episode metadata.'],
  VERIFIED_MEDIA: [
    'Verified video and cover ready',
    'Finish processing the video and cover.',
  ],
  NO_ACTIVE_UPLOAD: [
    'No active uploads',
    'Finish or cancel the current upload.',
  ],
  ACTIVE_PARENTS: [
    'Parent content available',
    'The series and season must be active.',
  ],
  VERIFIED_POSTER: [
    'Series cover ready',
    'Upload and prepare the series cover.',
  ],
  PUBLISHED_EPISODE: [
    'Published playable episode',
    'Publish at least one ready episode in an active season.',
  ],
} as const
export function OwnerPublicationMedia({
  target,
  detail,
  metadataStale,
  parentPublished = true,
  parentActive = true,
}: {
  target: PublicationTarget
  detail: PublicationDetail
  metadataStale: boolean
  parentPublished?: boolean
  parentActive?: boolean
}) {
  const cache = useQueryClient(),
    ownerType =
      target.type === 'series' ? ('series' as const) : ('video' as const),
    id = target.id
  useSyncExternalStore(
    (notify) => subscribeUploads(cache, notify),
    () => uploadRevision(cache),
    () => 0,
  )
  const uploadBusy = useCallback(
      () => hasWorkingUploads(cache, { ownerType, ownerId: id }),
      [cache, ownerType, id],
    ),
    p = useOwnerPublication(target, uploadBusy),
    localBusy = uploadBusy()
  const { manager } = useUploadManager(
    { ownerType, ownerId: id },
    target.type === 'series'
      ? 'series'
      : { type: 'episode', seriesId: target.seriesId },
    p.media.data,
  )
  const { controller, state, readiness, media } = p,
    r = readiness.data,
    busy = ['loading', 'pending'].includes(state.phase),
    stale =
      metadataStale ||
      !p.online ||
      readiness.isFetching ||
      media.isFetching ||
      readiness.isError ||
      media.isError ||
      !!state.refreshUnavailable ||
      (!!r &&
        !!media.data &&
        !snapshotMatches({ detail, readiness: r, media: media.data }, id))
  const archived = !!r?.archivedAt || !!detail.data.archivedAt,
    status = r?.publicationStatus ?? detail.data.publicationStatus,
    canAct =
      !stale &&
      !busy &&
      !localBusy &&
      parentActive &&
      !archived &&
      !!r &&
      !!media.data &&
      !['unknown', 'retryable', 'conflict', 'error'].includes(state.phase)
  const publishRef = useRef<HTMLButtonElement>(null),
    archiveRef = useRef<HTMLButtonElement>(null),
    refreshRef = useRef<HTMLButtonElement>(null)
  const href =
      target.type === 'series'
        ? seriesHref(id)
        : episodeHref(target.seriesId, id),
    subject = target.type
  const showDialog =
    !!state.snapshot && ['review', 'loading', 'pending'].includes(state.phase)
  return (
    <>
      <Card aria-label="Publication" aria-busy={busy}>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            Publication
          </CardTitle>
          <CardDescription>
            {archived
              ? 'This content is archived and read only.'
              : status === 'published'
                ? subject === 'episode' && !parentPublished
                  ? 'Published · Hidden until series is published'
                  : 'Published'
                : `Review readiness before publishing this ${subject}.`}
          </CardDescription>
          <Badge variant="secondary">
            {archived
              ? 'Archived'
              : status === 'published'
                ? 'Published'
                : r?.canPublish && !stale
                  ? 'Ready to publish'
                  : 'Not ready to publish'}
          </Badge>
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
          {!p.online && (
            <Alert>
              <AlertTitle>You are offline</AlertTitle>
              <AlertDescription>
                Reconnect, then check status before continuing.
              </AlertDescription>
            </Alert>
          )}
          {(readiness.isPending || media.isPending) && (
            <Skeleton
              className="h-32"
              aria-label="Loading publication status"
            />
          )}
          {(readiness.isError || media.isError) && (
            <Alert variant="destructive">
              <AlertTitle>Publication status unavailable</AlertTitle>
              <AlertDescription>
                {publicationFailure(readiness.error ?? media.error).message}
              </AlertDescription>
            </Alert>
          )}
          {stale && (
            <Alert>
              <AlertTitle>Refresh before continuing</AlertTitle>
              <AlertDescription>
                Previously loaded status is shown. Confirm the latest metadata
                and media.
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
                      className="flex min-w-0 flex-col gap-1"
                    >
                      <p className="text-sm font-medium">
                        {label} · {passed ? 'Passed' : 'Blocked'}
                      </p>
                      {!passed && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {reason}
                          </p>
                          {metadata ? (
                            <Button
                              variant="link"
                              nativeButton={false}
                              className="min-h-11 self-start"
                              render={<Link to={href + '/edit'} />}
                            >
                              Edit metadata
                            </Button>
                          ) : check.code === 'PUBLISHED_EPISODE' &&
                            target.type === 'series' ? (
                            <Button
                              variant="link"
                              nativeButton={false}
                              className="min-h-11 self-start"
                              render={<Link to={seasonsHref(id)} />}
                            >
                              Manage seasons & episodes
                            </Button>
                          ) : [
                              'VERIFIED_MEDIA',
                              'VERIFIED_POSTER',
                              'NO_ACTIVE_UPLOAD',
                            ].includes(check.code) ? (
                            <Button
                              variant="link"
                              nativeButton={false}
                              className="min-h-11 self-start"
                              render={<a href="#upload-media" />}
                            >
                              Upload media
                            </Button>
                          ) : null}
                        </>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
          {subject === 'episode' && status === 'draft' && (
            <p className="text-sm">
              Preview this episode before publishing. It remains private while
              its series is a draft.
            </p>
          )}
          {archived && (
            <p className="text-sm text-muted-foreground">
              New playback access is unavailable. Existing signed URLs may
              remain usable until they expire. Retained files are preserved;
              restore and republish are unavailable.
            </p>
          )}
          <p
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
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          {target.type === 'episode' && media.data?.canPreview && !archived && (
            <Button
              variant="outline"
              nativeButton={false}
              className="min-h-11"
              disabled={stale || busy}
              render={
                <Link
                  to="/admin/videos/$id/preview"
                  params={{ id }}
                  search={{ type: 'episode', seriesId: target.seriesId }}
                />
              }
            >
              Preview video
            </Button>
          )}
          {status === 'draft' && !archived && (
            <Button
              ref={publishRef}
              className="min-h-11"
              disabled={
                !canAct ||
                !r.canPublish ||
                (subject === 'episode' && !media.data.canPreview)
              }
              onClick={() => void controller.prepare('publish')}
            >
              Publish {subject}
            </Button>
          )}
          {target.type === 'episode' &&
            !archived &&
            ['draft', 'published'].includes(status) && (
              <Button
                ref={archiveRef}
                variant="destructive"
                className="min-h-11"
                disabled={
                  !canAct ||
                  !r.checks.some(
                    (c) => c.code === 'ACTIVE_PARENTS' && c.status === 'passed',
                  )
                }
                onClick={() => void controller.prepare('archive')}
              >
                Archive episode
              </Button>
            )}
          {state.phase === 'retryable' && (
            <Button
              className="min-h-11"
              disabled={busy || !p.online || localBusy}
              onClick={() => void controller.retry()}
            >
              Retry {state.action}
            </Button>
          )}
          {status === 'published' &&
            !archived &&
            !stale &&
            parentPublished &&
            parentActive &&
            (subject !== 'episode' ||
              (media.data?.canPreview &&
                r?.checks.some(
                  (c) => c.code === 'VERIFIED_MEDIA' && c.status === 'passed',
                ) &&
                r.checks.some(
                  (c) => c.code === 'ACTIVE_PARENTS' && c.status === 'passed',
                ))) &&
            (subject !== 'series' ||
              r?.checks.some(
                (c) => c.code === 'PUBLISHED_EPISODE' && c.status === 'passed',
              )) && (
              <Button
                variant="outline"
                nativeButton={false}
                className="min-h-11"
                render={
                  <Link
                    to={subject === 'series' ? '/series/$slug' : '/watch/$slug'}
                    params={{ slug: detail.data.slug }}
                  />
                }
              >
                Open public {subject}
              </Button>
            )}
          <Button
            ref={refreshRef}
            variant="outline"
            className="min-h-11"
            disabled={busy || !p.online}
            onClick={() => void controller.check()}
          >
            {['unknown', 'retryable'].includes(state.phase)
              ? 'Check status'
              : 'Refresh status'}
          </Button>
        </CardFooter>
      </Card>
      <MediaPanelView
        owner={{ ownerType, ownerId: id }}
        query={media}
        manager={manager}
        showPreview={false}
      />
      {showDialog && state.action === 'publish' && (
        <PublishVideoDialog
          controller={controller}
          state={state}
          subject={subject}
          hiddenUntilSeriesPublished={subject === 'episode' && !parentPublished}
          returnFocus={publishRef}
          fallbackFocus={refreshRef}
          canConfirm={!localBusy && p.online && !stale && parentActive}
        />
      )}
      {showDialog &&
        state.action === 'archive' &&
        target.type === 'episode' && (
          <ArchiveVideoDialog
            controller={controller}
            state={state}
            subject="episode"
            returnFocus={archiveRef}
            fallbackFocus={refreshRef}
            canConfirm={!localBusy && p.online && !stale && parentActive}
          />
        )}
    </>
  )
}

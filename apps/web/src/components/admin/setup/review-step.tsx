import { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { RiCheckLine, RiErrorWarningLine, RiLockLine } from '@remixicon/react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldLabel } from '#/components/ui/field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { toast } from '#/components/ui/toast'
import { VerticalVideoPlayer } from '#/components/vertical-video-player'
import { PublishVideoDialog } from '../publication-dialogs'
import {
  publicationCheckLabels,
  publicationViewState,
} from '../publication-panel'
import { useContentApi } from '#/hooks/use-content-api'
import { usePreviewLoader } from '#/hooks/use-preview-loader'
import type { usePublication } from '#/hooks/use-publication'
import type { ContentDetail } from '#/lib/admin/content-client'
import {
  contentDetailOptions,
  invalidateContent,
  patchContentOptions,
} from '#/lib/admin/content-queries'
import { contentSearch } from '#/lib/admin/content-list-state'
import { ensureRights } from '#/lib/admin/setup-rights'
import { reviewReady } from '#/lib/admin/setup-flow'
import type { SetupType } from '#/lib/admin/setup-flow'

type Publication = ReturnType<typeof usePublication>

// Step 3: watch the processed video, see what is still missing, then publish.
// Rights and the preview acknowledgement are one checkbox; the existing
// controller still owns readiness, versioning, idempotency and recovery.
export function ReviewStep({
  detail,
  type,
  metadataStale,
  publication,
  localBusy,
}: {
  detail: ContentDetail
  type: SetupType
  metadataStale: boolean
  publication: Publication
  localBusy: boolean
}) {
  const id = detail.data.id
  const { controller, state, readiness, media } = publication
  const { client, identity, queryClient } = useContentApi()
  const patch = useMutation(patchContentOptions(client, identity))
  const loadPlayback = usePreviewLoader(id)
  const agreeId = useId()
  const publishTrigger = useRef<HTMLButtonElement>(null)
  const refreshFocus = useRef<HTMLButtonElement>(null)
  const [agreed, setAgreed] = useState(false)
  const [rightsBusy, setRightsBusy] = useState(false)
  const [rightsError, setRightsError] = useState<string>()
  const { r, busy, stale, canAct } = publicationViewState(
    detail,
    metadataStale,
    publication,
    localBusy,
  )
  const rightsConfirmed =
    detail.type !== 'series' && !!detail.data.rightsConfirmedAt
  const checks = (r?.checks ?? []).filter((c) => c.status !== 'not-applicable')
  // Rights are confirmed by this step itself, so they must not block it.
  const ready = reviewReady(r, rightsConfirmed)
  const canPreview = !!media.data?.canPreview
  const publishOpen =
    state.action === 'publish' &&
    !!state.snapshot &&
    ['review', 'loading', 'pending'].includes(state.phase)

  useEffect(() => {
    if (state.phase === 'confirmed' && state.action === 'publish')
      toast.add({
        title: 'Video published',
        description: 'It is now available in the public catalog.',
        type: 'success',
      })
  }, [state.phase, state.action])

  async function publish() {
    if (rightsBusy) return
    setRightsError(undefined)
    setRightsBusy(true)
    try {
      const outcome = await ensureRights({
        detail,
        patch: (input) => patch.mutateAsync({ type, id, input }),
        reload: () =>
          queryClient.fetchQuery({
            ...contentDetailOptions(client, identity, type, id),
            staleTime: 0,
          }),
      })
      if (outcome.status === 'failed') {
        setRightsError(outcome.message)
        return
      }
      await invalidateContent(queryClient, identity, type, id)
      await controller.prepare('publish')
    } finally {
      setRightsBusy(false)
    }
  }
  const working = busy || rightsBusy
  return (
    <div className="grid gap-8 lg:grid-cols-[22.5rem_minmax(0,1fr)]">
      <section aria-label="Preview" className="flex flex-col gap-3">
        {canPreview ? (
          <div className="w-full max-w-[22.5rem]">
            <VerticalVideoPlayer loadPlayback={loadPlayback} />
          </div>
        ) : (
          <Alert>
            <AlertTitle>Preview isn&apos;t ready</AlertTitle>
            <AlertDescription>
              Go back to Media and wait until the video and cover are ready.
            </AlertDescription>
          </Alert>
        )}
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <RiLockLine className="size-4" aria-hidden="true" />
          Preview is visible only to you.
        </p>
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <Card aria-label="Publication checklist" aria-busy={working}>
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Before you publish
            </CardTitle>
            <CardDescription>
              Anything that isn&apos;t ready links to the step that fixes it.
            </CardDescription>
            <div>
              <Badge variant={ready && !stale ? 'default' : 'secondary'}>
                {ready && !stale ? 'All set' : 'Not ready'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(readiness.isPending || media.isPending) && (
              <p role="status" className="text-sm text-muted-foreground">
                Loading publication status…
              </p>
            )}
            {(readiness.isError || media.isError) && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Publication status unavailable.</AlertTitle>
                <AlertDescription>
                  Check the status again to continue.
                </AlertDescription>
              </Alert>
            )}
            {stale && !readiness.isPending && (
              <Alert>
                <AlertTitle>Refresh before continuing</AlertTitle>
                <AlertDescription>
                  Showing previously loaded status. Refresh before continuing.
                </AlertDescription>
              </Alert>
            )}
            <ul className="flex flex-col gap-3" aria-label="Checklist">
              {checks.map((check) => {
                const [label, reason] = publicationCheckLabels[check.code]
                const passed =
                  check.status === 'passed' ||
                  (check.code === 'RIGHTS' && agreed)
                const metadata = ['TITLE', 'SYNOPSIS'].includes(check.code)
                return (
                  <li key={check.code} className="flex items-start gap-3">
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
                      {!passed && check.code === 'RIGHTS' && (
                        <p className="text-sm text-muted-foreground">
                          Confirm below when you publish.
                        </p>
                      )}
                      {!passed && check.code !== 'RIGHTS' && (
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
                                  to="/admin/content/$type/$id/edit"
                                  params={{ type, id }}
                                />
                              }
                            >
                              Edit details
                            </Button>
                          ) : check.code !== 'ACTIVE_DRAFT' ? (
                            <Button
                              nativeButton={false}
                              variant="link"
                              className="min-h-11 justify-start p-0"
                              render={
                                <Link
                                  to="/admin/content/$type/$id/setup"
                                  params={{ type, id }}
                                  search={{ step: 'media' }}
                                />
                              }
                            >
                              Go to media
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <Card aria-label="Publish">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Publish
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Field orientation="horizontal">
              <Checkbox
                id={agreeId}
                checked={agreed}
                disabled={working}
                onCheckedChange={setAgreed}
              />
              <FieldLabel
                htmlFor={agreeId}
                className="min-h-11 cursor-pointer text-sm leading-relaxed"
              >
                {rightsConfirmed
                  ? "I've watched the preview and want to publish this video."
                  : "I have the rights to publish this video and I've watched the preview."}
              </FieldLabel>
            </Field>
            {rightsError && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Rights could not be saved</AlertTitle>
                <AlertDescription>{rightsError}</AlertDescription>
              </Alert>
            )}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-sm"
            >
              {working
                ? state.phase === 'pending'
                  ? 'Publishing…'
                  : rightsBusy
                    ? 'Saving rights…'
                    : 'Checking current status…'
                : state.message}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                ref={publishTrigger}
                className="min-h-11"
                disabled={
                  !agreed || !ready || !canPreview || !canAct || working
                }
                onClick={() => void publish()}
              >
                Publish video
              </Button>
              {state.phase === 'retryable' && state.action === 'publish' && (
                <Button
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => void controller.retry()}
                >
                  Retry publish
                </Button>
              )}
              <Button
                ref={refreshFocus}
                variant="outline"
                className="min-h-11"
                disabled={working || !publication.online}
                onClick={() => void controller.check()}
              >
                {['unknown', 'retryable'].includes(state.phase)
                  ? 'Check status'
                  : 'Refresh status'}
              </Button>
              <Button
                nativeButton={false}
                variant="ghost"
                className="min-h-11"
                render={<Link to="/admin/content" search={contentSearch({})} />}
              >
                Save as draft
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Publishing makes the video visible in the public catalog right
              away.
            </p>
          </CardContent>
        </Card>
      </div>
      {publishOpen && (
        <PublishVideoDialog
          controller={controller}
          state={state}
          returnFocus={publishTrigger}
          fallbackFocus={refreshFocus}
          canConfirm={!localBusy && publication.online && !stale}
          acknowledged
        />
      )}
    </div>
  )
}

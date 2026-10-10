import { useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { AdminPageHeading } from '../page-heading'
import {
  BackToContent,
  ContentResource,
  contentHref,
} from '../content-resource'
import { MediaStep } from './media-step'
import { ReviewStep } from './review-step'
import { SetupStepper } from './setup-stepper'
import { useSetupController } from '#/hooks/use-setup-controller'
import type { ContentDetail } from '#/lib/admin/content-client'
import {
  canOpenReview,
  canUseSetup,
  initialSetupStep,
  isSetupType,
  mediaReady,
} from '#/lib/admin/setup-flow'
import type { SetupStep, SetupType } from '#/lib/admin/setup-flow'

export function SetupPage({
  type,
  id,
  step,
}: {
  type: string
  id: string
  step?: SetupStep
}) {
  return (
    <ContentResource type={type} id={id}>
      {(detail, stale) => (
        <SetupGate detail={detail} step={step} metadataStale={stale} />
      )}
    </ContentResource>
  )
}

// Published, archived, Series and Episode content keep the detail page.
function SetupGate({
  detail,
  step,
  metadataStale,
}: {
  detail: ContentDetail
  step?: SetupStep
  metadataStale: boolean
}) {
  const router = useRouter()
  const usable = canUseSetup(detail) && isSetupType(detail.type)
  useEffect(() => {
    if (!usable)
      void router.navigate({
        to: contentHref(detail.type, detail.data.id),
        replace: true,
      })
  }, [usable, router, detail.type, detail.data.id])
  if (!usable || !isSetupType(detail.type))
    return (
      <div role="status" aria-label="Opening content">
        <Skeleton className="h-40" />
      </div>
    )
  return (
    <SetupFlow
      detail={detail}
      type={detail.type}
      step={step}
      metadataStale={metadataStale}
    />
  )
}

function SetupFlow({
  detail,
  type,
  step,
  metadataStale,
}: {
  detail: ContentDetail
  type: SetupType
  step?: SetupStep
  metadataStale: boolean
}) {
  const id = detail.data.id
  const router = useRouter()
  const { publication, manager, uploadBusy } = useSetupController(type, id)
  const media = publication.media.data
  const settled = !!media && !publication.media.isFetching
  const target = step ?? (media ? initialSetupStep(media) : undefined)
  const current: SetupStep = target ?? 'media'
  useEffect(() => {
    if (!media) return
    // Resolve a missing step, and keep Review closed until both files are ready.
    const wanted =
      !step || (step === 'review' && settled && !canOpenReview(media))
        ? step === 'review'
          ? 'media'
          : initialSetupStep(media)
        : undefined
    if (wanted)
      void router.navigate({
        to: '/admin/content/$type/$id/setup',
        params: { type, id },
        search: { step: wanted },
        replace: true,
      })
  }, [media, step, settled, router, type, id])
  const title = detail.data.title
  return (
    <>
      <AdminPageHeading
        title={title}
        description={
          current === 'media'
            ? 'Step 2 of 3 · Add your video and cover.'
            : 'Step 3 of 3 · Review and publish.'
        }
        actions={<BackToContent />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SetupStepper type={type} id={id} current={current} media={media} />
        <Badge variant="outline">Draft</Badge>
      </div>
      {!target ? (
        <div role="status" aria-label="Loading media" className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : current === 'media' ? (
        <div className="flex flex-col gap-6">
          <MediaStep query={publication.media} manager={manager} />
          <SetupFooter>
            <Button
              variant="outline"
              className="min-h-11"
              nativeButton={false}
              render={
                <Link
                  to="/admin/content/$type/$id/edit"
                  params={{ type, id }}
                />
              }
            >
              Back to details
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              {!mediaReady(media) && (
                <span className="text-sm text-muted-foreground">
                  Available when the video and cover are ready
                </span>
              )}
              <Button
                className="min-h-11"
                disabled={!mediaReady(media) || uploadBusy}
                nativeButton={false}
                render={
                  <Link
                    to="/admin/content/$type/$id/setup"
                    params={{ type, id }}
                    search={{ step: 'review' }}
                  />
                }
              >
                Continue to review
              </Button>
            </div>
          </SetupFooter>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <ReviewStep
            detail={detail}
            type={type}
            metadataStale={metadataStale}
            publication={publication}
            localBusy={uploadBusy}
          />
          <SetupFooter>
            <Button
              variant="outline"
              className="min-h-11"
              nativeButton={false}
              render={
                <Link
                  to="/admin/content/$type/$id/setup"
                  params={{ type, id }}
                  search={{ step: 'media' }}
                />
              }
            >
              Back to media
            </Button>
          </SetupFooter>
        </div>
      )}
    </>
  )
}

function SetupFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
      {children}
    </div>
  )
}

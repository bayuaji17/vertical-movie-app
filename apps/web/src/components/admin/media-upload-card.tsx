import { useEffect, useId, useRef, useState } from 'react'
import type {
  MediaKind,
  OwnerMedia,
  RoleInventory,
} from '#/lib/admin/media-client'
import type { UploadManager } from '#/lib/admin/upload-manager'
import { emptyUpload, isUploadWorking } from '#/lib/admin/upload-state'
import type { UploadPhase } from '#/lib/admin/upload-state'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '#/components/ui/field'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '#/components/ui/progress'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '#/components/ui/empty'
import { MediaConfirmDialog } from './media-confirm-dialog'
import { MediaProcessingStatus } from './media-processing-status'
import { CoverCropDialog } from './cover-crop-dialog'
import { describeCoverCropSource } from '#/lib/admin/media-file'
import { selectAndStart } from '#/lib/admin/auto-upload'
import { CoverFramePicker } from './setup/cover-frame-picker'

const phaseLabels: Record<UploadPhase, string> = {
  idle: 'No upload selected',
  selected: 'Ready to upload',
  queued: 'Waiting for the other file',
  checking: 'Checking file',
  starting: 'Starting upload',
  uploading: 'Uploading',
  paused: 'Paused',
  'needs-file': 'Select the same file to resume',
  'needs-prepare': 'Cover upload complete · Finish cover',
  preparing: 'Preparing cover',
  finalizing: 'Finalizing upload',
  completed: 'Upload completed',
  cancelling: 'Cancelling upload',
  unknown: 'Check upload status',
  failed: 'Upload stopped',
}
const bytes = (size: number) => {
  if (size < 1000) return `${size} B`
  const divisor = size < 1000000 ? 1000 : 1000000
  return `${(size / divisor).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${divisor === 1000 ? 'KB' : 'MB'}`
}
export function MediaUploadCard({
  kind,
  role,
  inventory,
  manager,
  frameSource,
}: {
  kind: MediaKind
  role: RoleInventory
  inventory: OwnerMedia
  manager?: UploadManager
  // The chosen video file: offers its frames as cover candidates.
  frameSource?: File
}) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    [dialog, setDialog] = useState<'replace' | 'cancel'>(),
    [pendingCover, setPendingCover] = useState<
      { ownerKey: string; file: File } | undefined
    >(),
    [selectionError, setSelectionError] = useState<string>()
  const ownerKey = `${inventory.ownerType}:${inventory.ownerId}`
  const cropSource =
    pendingCover?.ownerKey === ownerKey ? pendingCover.file : undefined

  useEffect(() => {
    setPendingCover(undefined)
    setSelectionError(undefined)
  }, [ownerKey])
  const view = manager?.snapshot(kind) ?? emptyUpload(),
    working = manager?.busy(kind) ?? isUploadWorking(view),
    title = kind === 'source' ? 'Source video' : 'Cover image'
  const unavailable = role.busy && !role.active
  const canChoose =
    inventory.canUpload &&
    !working &&
    !unavailable &&
    (!role.active || role.active.canResume)
  const canStart = manager?.canStart(kind) ?? false
  const canFinishCover =
    kind === 'poster' &&
    view.phase !== 'completed' &&
    view.phase !== 'failed' &&
    (role.canProcessPoster || view.phase === 'needs-prepare') &&
    !working
  const percent = view.progress.total
    ? Math.floor((view.progress.sent / view.progress.total) * 100)
    : 0
  const choose = () => {
    if (role.current && !role.active) setDialog('replace')
    else input.current?.click()
  }
  return (
    <Card
      className="min-w-0"
      data-media-kind={kind}
      role="group"
      aria-label={title}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline">
            {kind === 'source' ? '9:16 video' : '9:16 cover'}
          </Badge>
        </div>
        <CardDescription>
          {kind === 'source'
            ? 'Upload the original file. HLS streaming is prepared after upload.'
            : 'A consistent vertical cover for this content.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        {role.current ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Attached media</p>
            <MediaProcessingStatus role={role} kind={kind} />
          </div>
        ) : (
          <Empty className="border p-6">
            <EmptyHeader>
              <EmptyTitle>
                No {kind === 'source' ? 'source video' : 'cover'} attached
              </EmptyTitle>
              <EmptyDescription>Choose a file to get started.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {view.previewUrl && (
          <img
            src={view.previewUrl}
            alt="Selected cover preview"
            className="aspect-[9/16] w-24 rounded-xl object-cover"
          />
        )}
        {kind === 'poster' && frameSource && canChoose && (
          <CoverFramePicker
            file={frameSource}
            disabled={working}
            onPick={(frame) => {
              setSelectionError(undefined)
              try {
                describeCoverCropSource(frame, inventory)
                setPendingCover({ ownerKey, file: frame })
              } catch (cause) {
                setSelectionError(
                  cause instanceof Error
                    ? cause.message
                    : 'This frame cannot be used as a cover.',
                )
              }
            }}
          />
        )}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={id}>{title} file</FieldLabel>
            <input
              ref={input}
              id={id}
              type="file"
              hidden
              tabIndex={-1}
              className="sr-only"
              disabled={!canChoose}
              accept={inventory.config[kind].formats
                .map((format) => '.' + format.extension)
                .join(',')}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                setSelectionError(undefined)
                if (!file) return
                if (kind === 'poster') {
                  try {
                    describeCoverCropSource(file, inventory)
                    setPendingCover({ ownerKey, file })
                  } catch (cause) {
                    setSelectionError(
                      cause instanceof Error
                        ? cause.message
                        : 'This image cannot be used as a cover.',
                    )
                  }
                  return
                }
                manager?.select(kind, file)
              }}
            />
            <FieldDescription>
              {kind === 'source'
                ? `${inventory.config.source.formats.map((f) => f.extension.toUpperCase()).join(', ')} · Max ${bytes(Number(inventory.config.source.maxBytes))} · ${inventory.config.maxDurationSeconds / 60} minutes · 480–1080p, 9:16. Codec, duration and dimensions are verified after upload.`
                : `Still JPG, PNG, or WebP · Crop to vertical 9:16 · Recommended crop resolution: 1080 × 1920 or higher · Saved at 1080 × 1920 · Output max ${bytes(Number(inventory.config.poster.maxBytes))}. Animated images are not supported.`}
            </FieldDescription>
            {selectionError && (
              <p className="text-sm text-destructive" role="alert">
                {selectionError}
              </p>
            )}
            {canChoose && (
              <Button
                variant="outline"
                className="min-h-11 w-fit"
                onClick={choose}
              >
                {role.active
                  ? 'Select same file'
                  : kind === 'poster' && frameSource
                    ? 'Upload an image instead'
                    : role.current
                      ? 'Replace file'
                      : 'Choose file'}
              </Button>
            )}
          </Field>
        </FieldGroup>
        <div
          className="flex min-w-0 flex-col gap-2"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-sm font-medium">
            {kind === 'poster' && view.phase === 'completed'
              ? 'Cover prepared'
              : kind === 'poster' && view.phase === 'failed'
                ? 'Cover preparation failed'
                : phaseLabels[view.phase]}
          </p>
          {view.filename && (
            <p className="break-all text-sm text-muted-foreground">
              {view.filename}
            </p>
          )}
          {view.phase === 'checking' ? (
            <Progress
              value={
                view.progress.total
                  ? Math.floor((view.hashBytes / view.progress.total) * 100)
                  : 0
              }
            >
              <ProgressLabel>File check</ProgressLabel>
              <ProgressValue />
            </Progress>
          ) : (
            view.progress.total > 0 && (
              <>
                <Progress value={percent}>
                  <ProgressLabel>Sent</ProgressLabel>
                  <ProgressValue />
                </Progress>
                <p className="text-xs text-muted-foreground">
                  {bytes(view.progress.sent)} sent ·{' '}
                  {bytes(view.progress.verified)} verified ·{' '}
                  {bytes(view.progress.total)} total
                </p>
              </>
            )
          )}
          {view.descriptor?.status === 'pending' && (
            <p className="break-words text-xs text-muted-foreground">
              Session expires:{' '}
              <time dateTime={view.descriptor.expiresAt}>
                {new Date(view.descriptor.expiresAt).toLocaleString('en-US')}
              </time>
              .{' '}
              {kind === 'poster' && view.descriptor.processingMode === 'request'
                ? 'Resume requires the exact same cropped file. If it is unavailable after refresh, cancel this upload and crop again.'
                : 'Resume requires the same file.'}
            </p>
          )}
        </div>
        {view.error && (
          <Alert variant="destructive">
            <AlertTitle>
              {kind === 'poster'
                ? 'Cover needs attention'
                : 'Upload needs attention'}
            </AlertTitle>
            <AlertDescription>{view.error.message}</AlertDescription>
          </Alert>
        )}
        {unavailable && (
          <Alert>
            <AlertTitle>Another upload is active</AlertTitle>
            <AlertDescription>
              Check status before starting a new upload.
            </AlertDescription>
          </Alert>
        )}
        {!inventory.canUpload && (
          <p className="text-sm text-muted-foreground">
            Uploads are available only for active drafts. This content is read
            only.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button
              className="min-h-11"
              onClick={() => void manager?.start(kind)}
            >
              {view.descriptor ? 'Resume upload' : 'Upload file'}
            </Button>
          )}
          {working && view.phase !== 'cancelling' && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => manager?.pause(kind)}
            >
              Pause
            </Button>
          )}
          {!working &&
            (view.descriptor ||
              view.phase === 'unknown' ||
              view.phase === 'needs-prepare' ||
              view.phase === 'preparing' ||
              (kind === 'source' && view.phase === 'completed')) && (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => void manager?.checkStatus(kind)}
              >
                Check status
              </Button>
            )}
          {canFinishCover && (
            <Button
              className="min-h-11"
              onClick={() => void manager?.finishCover()}
            >
              Finish cover
            </Button>
          )}
          {inventory.canUpload &&
            ((view.descriptor?.status === 'pending' &&
              (view.descriptor.canResume ||
                working ||
                view.phase === 'unknown')) ||
              view.phase === 'selected' ||
              (view.phase === 'paused' && !view.descriptor) ||
              (view.phase === 'unknown' && !view.descriptor)) &&
            view.phase !== 'cancelling' && (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setDialog('cancel')}
              >
                Cancel upload
              </Button>
            )}
        </div>
        <MediaConfirmDialog
          open={!!dialog}
          onOpenChange={(open) => {
            if (!open) setDialog(undefined)
          }}
          title={
            dialog === 'replace'
              ? 'Replace attached media?'
              : 'Cancel this upload?'
          }
          description={
            dialog === 'replace'
              ? 'The current file remains attached until the replacement upload is completed. Choose a new file to continue.'
              : 'This stops this upload and asks the server to cancel it. If completion has already won, the completed result is retained.'
          }
          confirmLabel={
            dialog === 'replace' ? 'Choose replacement' : 'Cancel upload'
          }
          onConfirm={() => {
            const action = dialog
            setDialog(undefined)
            if (action === 'replace') input.current?.click()
            else void manager?.cancel(kind)
          }}
        />
        {kind === 'poster' && (
          <CoverCropDialog
            open={!!cropSource}
            onOpenChange={(open) => {
              if (!open) setPendingCover(undefined)
            }}
            sourceFile={cropSource}
            ownerKey={ownerKey}
            maxBytes={Number(inventory.config.poster.maxBytes)}
            onUse={(file) => {
              // The cover uploads and is prepared as soon as the crop is used.
              if (manager) selectAndStart(manager, 'poster', file)
              setPendingCover(undefined)
              setSelectionError(undefined)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

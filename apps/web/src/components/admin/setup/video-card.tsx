import { useEffect, useId, useRef, useState } from 'react'
import { RiCheckLine, RiFilmLine, RiUploadCloud2Line } from '@remixicon/react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '#/components/ui/progress'
import { MediaConfirmDialog } from '../media-confirm-dialog'
import type { OwnerMedia } from '#/lib/admin/media-client'
import type { UploadManager } from '#/lib/admin/upload-manager'
import { selectAndStart } from '#/lib/admin/auto-upload'
import { emptyUpload, isUploadWorking } from '#/lib/admin/upload-state'
import {
  VIDEO_STEP_HINT,
  formatBytes,
  videoStatus,
} from '#/lib/admin/video-status'

// One card for the whole video story: pick a file, upload starts by itself, and
// a single status moves Uploading → Processing → Ready. It drives the existing
// UploadManager unchanged (hashing, multipart, resume, recovery, auth cleanup).
export function VideoCard({
  inventory,
  manager,
}: {
  inventory: OwnerMedia
  manager?: UploadManager
}) {
  const role = inventory.source
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<'replace' | 'cancel'>()
  const ownerKey = `${inventory.ownerType}:${inventory.ownerId}`
  useEffect(() => setDialog(undefined), [ownerKey])
  if (!role) return null

  const view = manager?.snapshot('source') ?? emptyUpload()
  const working = manager?.busy('source') ?? isUploadWorking(view)
  const status = videoStatus(view, role)
  const unavailable = role.busy && !role.active
  const canChoose =
    inventory.canUpload &&
    !working &&
    !unavailable &&
    (!role.active || role.active.canResume)
  const canResume = manager?.canStart('source') ?? false
  const canCancel =
    inventory.canUpload &&
    view.phase !== 'cancelling' &&
    ((view.descriptor?.status === 'pending' &&
      (view.descriptor.canResume || working || view.phase === 'unknown')) ||
      view.phase === 'selected' ||
      (view.phase === 'paused' && !view.descriptor) ||
      (view.phase === 'unknown' && !view.descriptor))
  const formats = inventory.config.source.formats.map(
    (format) => '.' + format.extension,
  )
  const filename = view.filename

  const pick = (file: File | undefined) => {
    // Upload starts as soon as the file passes the local checks.
    if (manager) selectAndStart(manager, 'source', file)
  }
  const choose = () => {
    if (role.current && !role.active && status.stage === 'ready')
      setDialog('replace')
    else input.current?.click()
  }
  const chooseLabel =
    status.stage === 'needs-file' || status.stage === 'paused'
      ? 'Select same file'
      : status.stage === 'ready'
        ? 'Replace video'
        : status.stage === 'failed'
          ? 'Choose another file'
          : 'Choose video'

  return (
    <Card
      className="min-w-0"
      role="group"
      aria-label="Video"
      data-media-kind="source"
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Video</CardTitle>
          <Badge variant={status.stage === 'ready' ? 'default' : 'outline'}>
            {status.stage === 'ready' && (
              <RiCheckLine data-icon="inline-start" aria-hidden="true" />
            )}
            {status.stage === 'empty' ? 'Not added' : status.title}
          </Badge>
        </div>
        <CardDescription>
          Your original file. Streaming copies are prepared automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <input
          ref={input}
          id={inputId}
          type="file"
          hidden
          tabIndex={-1}
          className="sr-only"
          aria-label="Video file"
          disabled={!canChoose}
          accept={formats.join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            pick(file)
          }}
        />
        {status.stage === 'empty' ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (canChoose) pick(event.dataTransfer.files[0])
            }}
          >
            <RiUploadCloud2Line
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-base font-medium">Drag a video here, or</p>
            {canChoose && (
              <Button className="min-h-11" onClick={choose}>
                Choose video
              </Button>
            )}
            <p className="max-w-sm text-sm text-muted-foreground">
              {formats.map((f) => f.slice(1).toUpperCase()).join(', ')} · up to{' '}
              {formatBytes(Number(inventory.config.source.maxBytes))} ·{' '}
              {inventory.config.maxDurationSeconds / 60} minutes · portrait 9:16
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
              <RiFilmLine
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="break-all font-medium">
                {filename ?? 'Your video'}
              </p>
              {view.progress.total > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatBytes(view.progress.total)}
                </p>
              )}
            </div>
          </div>
        )}

        {status.percent !== undefined && (
          <div aria-live="polite" className="flex flex-col gap-2">
            <Progress value={status.percent}>
              <ProgressLabel>
                {status.stage === 'checking' ? 'Checking file' : 'Sent'}
              </ProgressLabel>
              <ProgressValue />
            </Progress>
            {status.stage === 'uploading' && (
              <p className="text-sm text-muted-foreground">
                {formatBytes(view.progress.sent)} of{' '}
                {formatBytes(view.progress.total)}
              </p>
            )}
          </div>
        )}

        {status.stage === 'uploading' && (
          <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
            Keep this tab open while the file uploads. If the connection drops,
            pick the same file again and the upload resumes where it stopped.
          </p>
        )}
        {status.stage === 'needs-file' && (
          <p className="text-sm text-muted-foreground">
            This upload was started earlier. Select the same file to continue.
          </p>
        )}
        {status.stage === 'unknown' && (
          <p className="text-sm text-muted-foreground">
            We could not confirm the upload. Check again before starting over.
          </p>
        )}
        {view.error && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Upload needs attention</AlertTitle>
            <AlertDescription>{view.error.message}</AlertDescription>
          </Alert>
        )}
        {status.stage === 'failed' && !view.error && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>The video could not be processed</AlertTitle>
            <AlertDescription>
              {status.detail ?? 'Choose another file to try again.'}
            </AlertDescription>
          </Alert>
        )}
        {unavailable && (
          <Alert>
            <AlertTitle>Another upload is active</AlertTitle>
            <AlertDescription>
              It will finish on its own. You can continue once it is done.
            </AlertDescription>
          </Alert>
        )}
        {!inventory.canUpload && (
          <p className="text-sm text-muted-foreground">
            Uploads are available only for active drafts.
          </p>
        )}

        <ol
          aria-label="Video status"
          className="grid grid-cols-3 gap-3 border-t pt-5"
        >
          {status.steps.map((step) => (
            <li key={step.id} className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className={
                  'h-1.5 rounded-full ' +
                  (step.state === 'todo' ? 'bg-border' : 'bg-primary')
                }
              />
              <span
                className={
                  'text-sm ' +
                  (step.state === 'todo'
                    ? 'text-muted-foreground'
                    : 'font-semibold')
                }
              >
                {step.label}
                <span className="sr-only">
                  {step.state === 'done'
                    ? ' (done)'
                    : step.state === 'current'
                      ? ' (in progress)'
                      : ''}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {VIDEO_STEP_HINT[step.id][step.state]}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          {canResume && !working && status.stage !== 'empty' && (
            <Button
              className="min-h-11"
              onClick={() => void manager?.start('source')}
            >
              {view.descriptor ? 'Resume upload' : 'Start upload'}
            </Button>
          )}
          {working &&
            (status.stage === 'uploading' || status.stage === 'checking') && (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => manager?.pause('source')}
              >
                Pause
              </Button>
            )}
          {status.stage !== 'empty' && canChoose && !canResume && (
            <Button variant="outline" className="min-h-11" onClick={choose}>
              {chooseLabel}
            </Button>
          )}
          {status.stage === 'unknown' && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => void manager?.checkStatus('source')}
            >
              Check again
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              className="min-h-11 text-destructive"
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
            dialog === 'replace' ? 'Replace the video?' : 'Cancel this upload?'
          }
          description={
            dialog === 'replace'
              ? 'The current video stays attached until the new one is uploaded and ready. Choose a new file to continue.'
              : 'This stops the upload and asks the server to cancel it. If it already finished, the finished video is kept.'
          }
          confirmLabel={
            dialog === 'replace' ? 'Choose replacement' : 'Cancel upload'
          }
          onConfirm={() => {
            const action = dialog
            setDialog(undefined)
            if (action === 'replace') input.current?.click()
            else void manager?.cancel('source')
          }}
        />
      </CardContent>
    </Card>
  )
}

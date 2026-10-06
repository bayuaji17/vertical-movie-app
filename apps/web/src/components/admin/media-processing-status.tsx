import type { RoleInventory } from '#/lib/admin/media-client'
import { mediaState } from '#/lib/admin/media-state'
import { Badge } from '#/components/ui/badge'
import { Progress, ProgressLabel } from '#/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'

export function MediaProcessingStatus({
  role,
  kind,
}: {
  role: RoleInventory
  kind: 'source' | 'poster'
}) {
  const state = mediaState(role, kind),
    requestPoster =
      kind === 'poster' &&
      (role.canProcessPoster ||
        role.active?.processingMode === 'request' ||
        role.lastAttempt?.processingMode === 'request'),
    processing = role.current?.processing
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <Badge variant={state.ready ? 'default' : 'secondary'} className="w-fit">
        {state.label}
      </Badge>
      {state.pending && (
        <Progress value={null}>
          <ProgressLabel>
            {requestPoster ? 'Preparing cover' : 'Media processing'}
          </ProgressLabel>
        </Progress>
      )}
      {processing?.jobState && (
        <p className="text-xs text-muted-foreground">
          {requestPoster ? 'Cover processing' : 'Job'}: {processing.jobState} ·
          Attempt {processing.attempts}
          {processing.progressSeconds > 0
            ? ` · ${Math.floor(processing.progressSeconds)} seconds of media processed`
            : ''}
        </p>
      )}
      {(role.current?.state === 'failed' || role.lastAttempt?.failureCode) && (
        <Alert variant="destructive">
          <AlertTitle>
            {kind === 'poster'
              ? 'Cover processing needs attention'
              : 'Media processing needs attention'}
          </AlertTitle>
          <AlertDescription>
            {kind === 'poster'
              ? 'The cover could not be prepared. Choose a new supported image, crop it, and upload it again.'
              : 'Processing or file verification failed. On an active draft, cancel any pending upload and choose a new supported file.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

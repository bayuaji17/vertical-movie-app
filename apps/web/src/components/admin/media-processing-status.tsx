import type { RoleInventory } from '#/lib/admin/media-client'
import { mediaState } from '#/lib/admin/media-state'
import { Badge } from '#/components/ui/badge'
import { Progress, ProgressLabel } from '#/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'

export function MediaProcessingStatus({ role }: { role: RoleInventory }) {
  const state = mediaState(role),
    processing = role.current?.processing
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <Badge variant={state.ready ? 'default' : 'secondary'} className="w-fit">
        {state.label}
      </Badge>
      {state.pending && (
        <Progress value={null}>
          <ProgressLabel>Media processing</ProgressLabel>
        </Progress>
      )}
      {processing?.jobState && (
        <p className="text-xs text-muted-foreground">
          Job: {processing.jobState} · Attempt {processing.attempts}
          {processing.progressSeconds > 0
            ? ` · ${Math.floor(processing.progressSeconds)} seconds of media processed`
            : ''}
        </p>
      )}
      {(role.current?.state === 'failed' || role.lastAttempt?.failureCode) && (
        <Alert variant="destructive">
          <AlertTitle>Media processing needs attention</AlertTitle>
          <AlertDescription>
            Processing or file verification failed. On an active draft, cancel
            any pending upload and choose a new supported file.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

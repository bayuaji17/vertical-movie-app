import { useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type {
  PublicationController,
  PublicationState,
} from '#/lib/admin/publication-state'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '#/components/ui/alert-dialog'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'

export function PublishVideoDialog({
  controller,
  state,
  returnFocus,
}: {
  controller: PublicationController
  state: PublicationState
  returnFocus: RefObject<HTMLButtonElement | null>
}) {
  const [acknowledged, setAcknowledged] = useState(false),
    checkboxId = useId(),
    cancel = useRef<HTMLButtonElement>(null)
  const pending = state.phase !== 'review'
  return (
    <AlertDialog
      open
      onOpenChange={(open, event) => {
        if (pending) {
          event.cancel()
          return
        }
        if (!open) controller.cancel()
      }}
    >
      <AlertDialogContent
        initialFocus={cancel}
        finalFocus={returnFocus}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Publish video?</AlertDialogTitle>
          <AlertDialogDescription>
            This video will be available to visitors without signing in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="break-words font-medium">
            {state.snapshot?.detail.data.title}
          </p>
          <p className="text-sm text-muted-foreground">
            Content rights: Confirmed
          </p>
          <FieldGroup>
            <Field orientation="horizontal" data-disabled={pending}>
              <Checkbox
                id={checkboxId}
                checked={acknowledged}
                onCheckedChange={setAcknowledged}
                disabled={pending}
              />
              <FieldLabel htmlFor={checkboxId} className="min-h-11">
                I have reviewed the preview and want to publish this video.
              </FieldLabel>
            </Field>
          </FieldGroup>
          <p role="status" aria-live="polite" className="text-sm">
            {pending
              ? state.phase === 'pending'
                ? 'Publishing…'
                : 'Checking current status…'
              : ''}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            ref={cancel}
            disabled={pending}
            className="min-h-11"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || !acknowledged}
            className="min-h-11"
            onClick={() => void controller.confirm(acknowledged)}
          >
            {state.phase === 'pending' ? 'Publishing…' : 'Publish video'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

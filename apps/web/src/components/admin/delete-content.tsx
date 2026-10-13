import { useId, useState } from 'react'
import { RiDeleteBinLine } from '@remixicon/react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '#/components/ui/alert-dialog'
import { Alert, AlertTitle, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { toast } from '#/components/ui/toast'
import { useDeleteContent } from '#/hooks/use-delete-content'
import { deleteFailure } from '#/lib/admin/delete-client'
import type { DeleteResult } from '#/lib/admin/delete-client'
import {
  deleteBlock,
  deleteConsequences,
  deleteKindLabel,
  deleteSummaryText,
  requiresTypedTitle,
  titleMatches,
} from '#/lib/admin/delete-state'
import type { DeleteTarget } from '#/lib/admin/delete-state'

/**
 * "Delete" button with a confirmation dialog. Published content shows why it
 * cannot be deleted instead; the server enforces the same rule.
 */
export function DeleteContent({
  target,
  onDeleted,
  compact = false,
}: {
  target: DeleteTarget
  onDeleted?: (result: DeleteResult) => void | Promise<void>
  compact?: boolean
}) {
  const [open, setOpen] = useState(false),
    [typed, setTyped] = useState('')
  const remove = useDeleteContent()
  const block = deleteBlock(target),
    reason = useId(),
    input = useId()
  const label = deleteKindLabel(target.kind)
  const typedRequired = requiresTypedTitle(target.kind)
  const ready = !typedRequired || titleMatches(target.title, typed)
  const failure = remove.error ? deleteFailure(remove.error) : undefined
  function close(next: boolean) {
    if (remove.pending) return
    setOpen(next)
    if (!next) {
      setTyped('')
      remove.reset()
    }
  }
  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="destructive"
          className="min-h-11"
          aria-disabled={block ? true : undefined}
          aria-describedby={block ? reason : undefined}
          onClick={() => {
            if (!block) setOpen(true)
          }}
        >
          <RiDeleteBinLine data-icon="inline-start" aria-hidden="true" />
          Delete {compact ? '' : label}
        </Button>
        {block && !compact && (
          <p id={reason} className="text-sm text-muted-foreground">
            {block}
          </p>
        )}
        {block && compact && (
          <span id={reason} className="sr-only">
            {block}
          </span>
        )}
      </div>
      <AlertDialog open={open} onOpenChange={close}>
        <AlertDialogContent className="w-[calc(100vw-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              Delete “{target.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              <ul className="list-disc space-y-1 pl-5 text-left">
                {deleteConsequences(target.kind).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {typedRequired && (
            <div className="space-y-2">
              <Label htmlFor={input}>
                Type <strong className="break-words">{target.title}</strong> to
                confirm
              </Label>
              <Input
                id={input}
                autoComplete="off"
                className="min-h-11"
                value={typed}
                disabled={remove.pending}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
          )}
          {failure && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>
                {failure.unconfirmed
                  ? 'Could not confirm the result'
                  : 'Could not delete'}
              </AlertTitle>
              <AlertDescription>{failure.message}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={remove.pending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={remove.pending || !ready}
              onClick={() => {
                void remove
                  .run(target, async (result) => {
                    toast.add({
                      title: 'Deleted',
                      description: deleteSummaryText(
                        target.title,
                        result.removed,
                      ),
                    })
                    setOpen(false)
                    await onDeleted?.(result)
                  })
                  .catch(() => undefined)
              }}
            >
              {remove.pending ? 'Deleting...' : `Delete ${label}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

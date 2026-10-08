import { UnsavedChangesGuard } from './unsaved-changes'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { AdminPageHeading } from './page-heading'
import { ContentForm } from './content-form'
import {
  emptyContentValues,
  createContentCommand,
} from '#/lib/admin/content-form-state'
import type { ContentValues } from '#/lib/admin/content-form-state'
import { createContentOptions } from '#/lib/admin/content-queries'
import { useContentEditor } from '#/hooks/use-content-editor'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'

export function CreateContentView() {
  const editor = useContentEditor(),
    mutation = useMutation(createContentOptions(editor.client, editor.identity))
  const pending = useRef(false)
  const [initial] = useState(() => emptyContentValues())
  async function submit(values: ContentValues) {
    if (pending.current) return
    pending.current = true
    editor.setError(undefined)
    try {
      const result = await mutation.mutateAsync(createContentCommand(values))
      await editor.finishSave(result.type, result.id)
    } catch (error) {
      editor.setError(error)
    } finally {
      pending.current = false
    }
  }
  return (
    <>
      <UnsavedChangesGuard dirty={editor.dirty} />
      <AdminPageHeading
        title="Create draft"
        description="Save initial metadata for a film, standalone video, or series."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <ContentForm
          initialValues={initial}
          onSubmit={submit}
          onDirtyChange={editor.setDirty}
          error={editor.error}
        />
        <Card>
          <CardHeader>
            <CardTitle>About drafts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              A title is enough to get started. You can complete optional
              metadata later.
            </p>
            <p>Drafts are private and are not visible in the public catalog.</p>
            <p>
              Video and cover upload, processing, and publication follow in a
              separate workflow.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

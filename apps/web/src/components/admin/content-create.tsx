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
      await editor.finishSave(result.type, result.id, 'setup')
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
        title="Add a video"
        description="Three short steps. You can leave any time; your draft is saved."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <ContentForm
          initialValues={initial}
          onSubmit={submit}
          onDirtyChange={editor.setDirty}
          error={editor.error}
          variant="quick"
        />
        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Media.</strong> Choose your
              video and cover; upload starts by itself.
            </p>
            <p>
              <strong className="text-foreground">Review.</strong> Check the
              processed video, then publish.
            </p>
            <p>Drafts stay private until you publish.</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

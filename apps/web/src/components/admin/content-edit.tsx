import { useState, useMemo, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import type { ContentDetail } from '#/lib/admin/content-client'
import type { ContentValues } from '#/lib/admin/content-form-state'
import {
  valuesFromDetail,
  isEditableContent,
  patchContentCommand,
} from '#/lib/admin/content-form-state'
import { patchContentOptions, contentKeys } from '#/lib/admin/content-queries'
import { useContentEditor } from '#/lib/admin/use-content-editor'
import { ContentApiError } from '#/lib/admin/content-client'
import { ContentForm } from './content-form'
import { ContentDetailView } from './content-detail'
import { DiscardDialog } from './discard-dialog'
import { AdminPageHeading } from './page-heading'
import { contentHref } from './content-resource'
import { Button } from '#/components/ui/button'

export function EditContentView({ detail }: { detail: ContentDetail }) {
  const [baseline, setBaseline] = useState(detail),
    [revision, setRevision] = useState(0),
    [confirmReload, setConfirmReload] = useState(false),
    [reloading, setReloading] = useState(false)
  const initial = useMemo(() => valuesFromDetail(baseline), [baseline])
  const editor = useContentEditor(),
    mutation = useMutation(patchContentOptions(editor.client))
  const pending = useRef(false)
  async function reload() {
    if (reloading || pending.current) return
    setReloading(true)
    try {
      if (!editor.client)
        throw new ContentApiError(
          0,
          'CONFIG_UNAVAILABLE',
          'API configuration unavailable.',
        )
      const fresh = await editor.client.detail(baseline.type, baseline.data.id)
      editor.queryClient.setQueryData(
        contentKeys.detail(editor.identity, baseline.type, baseline.data.id),
        fresh,
      )
      setBaseline(fresh)
      setRevision((value) => value + 1)
      editor.setDirty(false)
      editor.setError(undefined)
      setConfirmReload(false)
    } catch (error) {
      editor.setError(error)
      setConfirmReload(false)
    } finally {
      setReloading(false)
    }
  }
  async function submit(values: ContentValues) {
    const command = patchContentCommand(values, baseline)
    if (!command || pending.current || reloading) return
    pending.current = true
    editor.setError(undefined)
    try {
      await mutation.mutateAsync(command)
      await editor.finishSave(baseline.type, baseline.data.id)
    } catch (error) {
      editor.setError(error)
    } finally {
      pending.current = false
    }
  }
  if (!isEditableContent(baseline))
    return <ContentDetailView detail={baseline} />
  return (
    <>
      <AdminPageHeading
        title="Edit draft"
        description="Update metadata. Your changes are saved only when you submit."
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              className="min-h-11"
              render={
                <Link to={contentHref(baseline.type, baseline.data.id)} />
              }
            >
              View details
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={reloading || mutation.isPending}
              onClick={() => {
                if (editor.dirty) setConfirmReload(true)
                else void reload()
              }}
            >
              Reload latest version
            </Button>
          </>
        }
      />
      <ContentForm
        key={revision}
        initialValues={initial}
        baseline={baseline}
        onSubmit={submit}
        error={editor.error}
        onDirtyChange={editor.setDirty}
        locked={reloading}
      />
      <DiscardDialog
        open={confirmReload}
        onOpenChange={setConfirmReload}
        title="Reload latest version?"
        description="This replaces your unsaved input with the current saved metadata. Keep editing to retain your input."
        confirmLabel="Reload and discard"
        onConfirm={() => void reload()}
        pending={reloading}
      />
    </>
  )
}

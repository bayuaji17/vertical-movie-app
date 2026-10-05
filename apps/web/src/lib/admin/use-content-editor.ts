import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { ContentType } from './content-client'
import { invalidateContent } from './content-queries'
import { useContentApi } from './use-content-api'
import { toast } from '#/components/ui/toast'

export function useContentEditor() {
  const api = useContentApi(),
    router = useRouter()
  const [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState<unknown>()
  async function finishSave(type: ContentType, id: string) {
    setSaved(true)
    setDirty(false)
    setError(undefined)
    toast.add({
      title: 'Content saved',
      description: 'Your draft metadata has been saved.',
      type: 'success',
    })
    await invalidateContent(api.queryClient, api.identity, type, id)
    await router.navigate({ to: `/admin/content/${type}/${id}` })
  }
  return {
    ...api,
    dirty: dirty && !saved,
    setDirty,
    error,
    setError,
    finishSave,
  }
}

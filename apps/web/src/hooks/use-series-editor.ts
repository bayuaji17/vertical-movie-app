import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useAdminPrincipal } from './use-admin-principal'
import { usePublicOnline } from './use-public-online'
import { browserSeriesClient } from '#/lib/admin/series-client'
import { invalidateSeries } from '#/lib/admin/series-queries'
import { SeriesEditorScope } from '#/lib/admin/series-editor-scope'
import { registerPrivateEffect } from '#/lib/auth/private-effects'
import { toast } from '#/components/ui/toast'

export function useSeriesEditor(seriesId: string, recordId: string) {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    router = useRouter(),
    online = usePublicOnline()
  const client = useMemo(() => browserSeriesClient(cache), [cache])
  const scope = useMemo(
    () => new SeriesEditorScope(),
    [user.id, seriesId, recordId],
  )
  useEffect(() => {
    scope.activate()
    const release = registerPrivateEffect(cache, () => scope.stop())
    return () => {
      release()
      scope.stop()
    }
  }, [cache, scope])
  const [dirty, setDirty] = useState(false),
    [error, setError] = useState<unknown>()
  async function finish(signal: AbortSignal, href: string, episodeId?: string) {
    if (!scope.accepts(signal)) return
    await invalidateSeries(cache, user.id, seriesId, episodeId)
    if (!scope.accepts(signal)) return
    setDirty(false)
    setError(undefined)
    toast.add({ title: 'Metadata saved', type: 'success' })
    await router.navigate({ to: href, ignoreBlocker: true })
  }
  return {
    cache,
    identity: user.id,
    client,
    scope,
    online,
    dirty,
    setDirty,
    error,
    setError,
    finish,
  }
}

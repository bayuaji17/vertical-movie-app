import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminPrincipal } from './use-admin-principal'
import { usePublicOnline } from './use-public-online'
import { browserSettingsClient } from '#/lib/admin/settings-client'
import {
  acceptConfirmedSettings,
  saveSettingsMutation,
  adminSettingsKey,
  adminSettingsOptions,
} from '#/lib/admin/settings-queries'
import { SettingsEditorScope } from '#/lib/admin/settings-editor-scope'
import { registerPrivateEffect } from '#/lib/auth/private-effects'

export function useSettingsEditor() {
  const cache = useQueryClient(),
    { user } = useAdminPrincipal(),
    identity = user.id,
    online = usePublicOnline()
  const client = useMemo(() => browserSettingsClient(cache), [cache]),
    scope = useMemo(() => new SettingsEditorScope(), [identity])
  const state = useSyncExternalStore(
    scope.subscribe,
    scope.snapshot,
    scope.snapshot,
  )
  useEffect(() => {
    scope.activate()
    const release = registerPrivateEffect(cache, () => scope.stop())
    return () => {
      release()
      scope.stop()
      void cache.cancelQueries({
        queryKey: adminSettingsKey(identity),
        exact: true,
      })
    }
  }, [cache, identity, scope])
  const query = useQuery({
    ...adminSettingsOptions(cache, client, identity, scope.signal),
    enabled: typeof window !== 'undefined' && scope.isActive && online,
  })
  useEffect(() => {
    if (query.data) scope.observe(query.data)
  }, [query.data, scope])
  const accept = (
    data: Parameters<typeof acceptConfirmedSettings>[2],
    signal: AbortSignal,
  ) => acceptConfirmedSettings(cache, identity, data, signal)
  return {
    state,
    scope,
    query,
    online,
    dirty: scope.dirty || state.pending || state.phase === 'unknown',
    errors: scope.errors,
    save: () => {
      if (client)
        void scope.save(
          {
            ...client,
            save: (input, signal) =>
              saveSettingsMutation(cache, identity, client, input, signal),
          },
          accept,
          online,
        )
    },
    reload: (check = false) => {
      if (client && online) void scope.reload(client, accept, check)
    },
    refresh: () => {
      if (online && !query.isFetching) void query.refetch()
    },
  }
}

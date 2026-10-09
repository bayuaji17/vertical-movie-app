import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { readPublicSettings } from './reader'
import { settingsTtlMs } from './model'
import type { PublicSettingsData } from './model'

export const publicSettingsKey = ['site-settings', 'public', 1] as const
const epochs = new WeakMap<QueryClient, number>()
export const settingsRemaining = (expiry: number, updatedAt: number) =>
  Math.max(0, Math.min(settingsTtlMs, expiry - updatedAt))
export function publicSettingsOptions(
  cache: QueryClient,
  read = readPublicSettings,
) {
  return queryOptions({
    queryKey: publicSettingsKey,
    queryFn: async ({ signal }) => {
      const epoch = epochs.get(cache) ?? 0,
        result = await read(signal)
      signal.throwIfAborted()
      const current = cache.getQueryData<PublicSettingsData>(publicSettingsKey)
      if (
        current &&
        ((epochs.get(cache) ?? 0) !== epoch || current.version > result.version)
      )
        return current
      return result
    },
    retry: false,
    retryOnMount: false,
    gcTime: settingsTtlMs,
    staleTime: (q) =>
      settingsRemaining(q.state.data?.expiresAt ?? 0, q.state.dataUpdatedAt),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
export function primePublicSettings(
  cache: QueryClient,
  incoming: PublicSettingsData,
) {
  epochs.set(cache, (epochs.get(cache) ?? 0) + 1)
  const current = cache.getQueryData<PublicSettingsData>(publicSettingsKey)
  if (!current || incoming.version >= current.version)
    cache.setQueryData(publicSettingsKey, incoming)
}
export async function updatePublicSettings(
  cache: QueryClient,
  incoming: PublicSettingsData,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted()
  epochs.set(cache, (epochs.get(cache) ?? 0) + 1)
  await cache.cancelQueries({ queryKey: publicSettingsKey, exact: true })
  signal?.throwIfAborted()
  primePublicSettings(cache, incoming)
}
export async function bootstrapPublicSettings(
  cache: QueryClient,
  read = readPublicSettings,
) {
  try {
    if (typeof window === 'undefined' || navigator.onLine)
      await cache.query(publicSettingsOptions(cache, read))
  } catch {
    /* Presentation defaults are never stored as a successful snapshot. */
  }
  return cache.getQueryData<PublicSettingsData>(publicSettingsKey)
}

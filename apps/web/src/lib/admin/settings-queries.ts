import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { PrivateApiError } from '../api/private-result'
import {
  settingsRemaining,
  primePublicSettings,
  publicSettingsKey,
} from '../settings/queries'
import { settingsTtlMs } from '../settings/model'
import type {
  SettingsClient,
  PrivateSettingsData,
  SettingsSaveInput,
} from './settings-client'

export const adminSettingsKey = (identity: string) =>
  ['admin', identity, 'settings'] as const
export function publicSettingsProjection(data: PrivateSettingsData) {
  const { siteName, tagline, description, footerText, rowVersion } = data.item
  return {
    item: { siteName, tagline, description, footerText },
    version: rowVersion,
    expiresAt: data.expiresAt,
  }
}
export function adminSettingsOptions(
  cache: QueryClient,
  client: SettingsClient | undefined,
  identity: string,
  ownerSignal?: AbortSignal,
) {
  return queryOptions<PrivateSettingsData>({
    queryKey: adminSettingsKey(identity),
    enabled: typeof window !== 'undefined',
    retry: false,
    retryOnMount: false,
    gcTime: settingsTtlMs,
    staleTime: (q) =>
      settingsRemaining(q.state.data?.expiresAt ?? 0, q.state.dataUpdatedAt),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async ({ signal }) => {
      if (!client)
        throw new PrivateApiError(
          0,
          'CONFIG_UNAVAILABLE',
          'Site settings configuration is unavailable.',
        )
      const scoped = ownerSignal
          ? AbortSignal.any([signal, ownerSignal])
          : signal,
        result = await client.read(scoped)
      scoped.throwIfAborted()
      const current = cache.getQueryData<PrivateSettingsData>(
        adminSettingsKey(identity),
      )
      return current && current.item.rowVersion > result.item.rowVersion
        ? current
        : result
    },
  })
}
export async function acceptConfirmedSettings(
  cache: QueryClient,
  identity: string,
  incoming: PrivateSettingsData,
  signal: AbortSignal,
) {
  const key = adminSettingsKey(identity)
  await Promise.all([
    cache.cancelQueries({ queryKey: key, exact: true }),
    cache.cancelQueries({ queryKey: publicSettingsKey, exact: true }),
  ])
  signal.throwIfAborted()
  const current = cache.getQueryData<PrivateSettingsData>(key)
  const accepted =
    current && current.item.rowVersion > incoming.item.rowVersion
      ? current
      : incoming
  primePublicSettings(cache, publicSettingsProjection(accepted))
  cache.setQueryData(key, accepted)
  return accepted
}

export async function saveSettingsMutation(
  cache: QueryClient,
  identity: string,
  client: SettingsClient,
  input: SettingsSaveInput,
  signal?: AbortSignal,
) {
  try {
    return await client.save(input, signal)
  } catch (error) {
    if (
      !(error instanceof PrivateApiError) ||
      ![401, 403, 409, 422].includes(error.status)
    )
      await cache.invalidateQueries({
        queryKey: adminSettingsKey(identity),
        exact: true,
        refetchType: 'none',
      })
    throw error
  }
}

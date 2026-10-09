import { createPrivateApiClient, getBrowserApiBaseUrl } from '../api/client'
import type { ApiFetcher } from '../api/client'
import { PrivateApiError, unwrapPrivateResult } from '../api/private-result'
import { privateSettingsSchema } from '../settings/model'
import type { PrivateSettingsDto, SiteSettings } from '../settings/model'
import type { QueryClient } from '@tanstack/react-query'

export type PrivateSettingsData = {
  item: PrivateSettingsDto['item']
  expiresAt: number
}
export type SettingsSaveInput = SiteSettings & { expectedVersion: number }
export function createSettingsClient(
  base: string,
  cache: QueryClient,
  fetcher?: ApiFetcher,
  now = Date.now,
) {
  const transport = fetcher ?? fetch
  const api = createPrivateApiClient(base, cache, (input, init) =>
    transport(input, {
      ...init,
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        AbortSignal.timeout(15_000),
      ]),
    }),
  )
  const policy = {
    fallbackCode: 'SETTINGS_REQUEST_FAILED',
    failureMessage: 'Site settings could not be confirmed.',
    networkMessage: 'Site settings could not be reached.',
    error: (status: number, code: string, message: string) =>
      new PrivateApiError(status, code, message),
  }
  function receipt(
    value: unknown,
    started: number,
    signal?: AbortSignal,
  ): PrivateSettingsData {
    signal?.throwIfAborted()
    const p = privateSettingsSchema.safeParse(value)
    if (!p.success)
      throw new PrivateApiError(
        0,
        'INVALID_RESPONSE',
        'Site settings response could not be confirmed.',
      )
    return { item: p.data.item, expiresAt: started + p.data.freshForMs }
  }
  return {
    async read(signal?: AbortSignal, fresh = false) {
      const started = now()
      return receipt(
        await unwrapPrivateResult(
          api.admin.settings.get({
            query: fresh ? { fresh: '1' } : {},
            fetch: { signal },
          }),
          policy,
        ),
        started,
        signal,
      )
    },
    async save(fields: SettingsSaveInput, signal?: AbortSignal) {
      const started = now()
      return receipt(
        await unwrapPrivateResult(
          api.admin.settings.patch(fields, { fetch: { signal } }),
          policy,
        ),
        started,
        signal,
      )
    },
  }
}
export type SettingsClient = ReturnType<typeof createSettingsClient>
export function browserSettingsClient(cache: QueryClient) {
  const base = getBrowserApiBaseUrl()
  return base ? createSettingsClient(base, cache) : undefined
}

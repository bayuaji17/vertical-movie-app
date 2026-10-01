import { treaty } from '@elysia/eden'
import type { Elysia } from 'elysia'
import type { App } from 'api/types'

export type ApiFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

type ApiRoutes = App extends { '~Routes': infer Routes } ? Routes : never
type EdenApi = Elysia & { '~Routes': ApiRoutes }

export function normalizeApiBaseUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username !== '' ||
      url.password !== '' ||
      url.pathname !== '/api' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return undefined
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

export function apiBaseUrlFromOrigin(value: string): string | undefined {
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username !== '' ||
      url.password !== '' ||
      url.pathname !== '/' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return undefined
    }
    return `${url.origin}/api`
  } catch {
    return undefined
  }
}

export function getBrowserApiBaseUrl(): string | undefined {
  const configuredOrigin = import.meta.env.VITE_API_URL
  if (!configuredOrigin) return undefined
  return apiBaseUrlFromOrigin(configuredOrigin)
}

export function createApiClient(baseUrl: string, fetcher?: ApiFetcher) {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl)
  if (!normalizedBaseUrl) throw new Error('Invalid API base URL.')

  return treaty<EdenApi>(normalizedBaseUrl, {
    parseDate: false,
    fetch: { credentials: 'include', cache: 'no-store' },
    ...(fetcher ? { fetcher: fetcher as typeof fetch } : {}),
  })
}

export type AdminSessionDto = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createApiClient>['admin']['session']['get']>
  >['data']
>

import { treaty } from '@elysia/eden'
import type { Elysia } from 'elysia'
import type { App } from 'api/types'
import type { QueryClient } from '@tanstack/react-query'
import { handlePrivateApiFailure } from '../auth/transitions'

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
      !['/', '/api'].includes(url.pathname) ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return undefined
    }
    return url.pathname === '/' ? url.origin : `${url.origin}/api`
  } catch {
    return undefined
  }
}

export function apiOriginFromOrigin(value: string): string | undefined {
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
    return url.origin
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


/** Use only for private admin business routes; public clients keep their normal behavior. */
export function createPrivateApiClient(
  baseUrl: string,
  queryClient: QueryClient,
  fetcher: ApiFetcher = fetch,
) {
  return createApiClient(baseUrl, privateApiFetcher(queryClient, fetcher))
}

export function privateApiFetcher(
  queryClient: QueryClient,
  fetcher: ApiFetcher = fetch,
): ApiFetcher {
  return async (input, init) => {
    const response = await fetcher(input, init)
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status >= 500
    )
      await handlePrivateApiFailure(queryClient, response.status)
    return response
  }
}

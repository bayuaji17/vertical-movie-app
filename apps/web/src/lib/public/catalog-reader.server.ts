import { createServerOnlyFn } from '@tanstack/react-start'
import {
  getRequest,
  setResponseHeader,
  setResponseStatus,
} from '@tanstack/react-start/server'
import { apiOriginFromOrigin } from '../api/client'
import { CatalogRequestError } from '../catalog/catalog-client'
import { createPublicVideoClient } from './catalog-client'
import type { CatalogType } from './catalog-model'

const reader = createServerOnlyFn((signal: AbortSignal) => {
  setResponseHeader('cache-control', 'private, no-store')
  const origin = apiOriginFromOrigin(process.env.API_INTERNAL_URL ?? '')
  if (!origin) throw new CatalogRequestError(503)
  const combined = AbortSignal.any([
    signal,
    getRequest().signal,
    AbortSignal.timeout(10_000),
  ])
  return createPublicVideoClient(origin, (input, init) =>
    fetch(input, {
      ...init,
      signal: combined,
      headers: { accept: 'application/json' },
      credentials: 'omit',
      redirect: 'error',
    }),
  )
})
export const readPublicVideosOnServer = createServerOnlyFn(
  (type: CatalogType, cursor: string | null, signal: AbortSignal) =>
    reader(signal).page(type, cursor, signal),
)
export const readPublicVideoOnServer = createServerOnlyFn(
  (slug: string, signal: AbortSignal) => reader(signal).detail(slug, signal),
)
export const setPublicStatusOnServer = createServerOnlyFn(
  (status: number | null) =>
    setResponseStatus(
      status === 404 || status === 422 ? 404 : status ? 503 : 200,
    ),
)

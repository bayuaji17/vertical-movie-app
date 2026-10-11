import { createServerOnlyFn } from '@tanstack/react-start'
import {
  getRequest,
  setResponseHeader,
  setResponseStatus,
} from '@tanstack/react-start/server'
import { apiOriginFromOrigin } from '../api/client'
import { observeServerRead, ssrRequestId } from '../server/log.server'
import { CatalogRequestError } from '../catalog/catalog-client'
import { createPublicVideoClient } from './catalog-client'

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
      headers: {
        accept: 'application/json',
        'x-request-id': ssrRequestId(),
      },
      credentials: 'omit',
      redirect: 'error',
    }),
  )
})
export const readPublicVideoOnServer = createServerOnlyFn(
  (slug: string, signal: AbortSignal) =>
    observeServerRead('video.detail', () =>
      reader(signal).detail(slug, signal),
    ),
)
export const setPublicStatusOnServer = createServerOnlyFn(
  (status: number | null) =>
    setResponseStatus(
      status === 404 || status === 422 ? 404 : status ? 503 : 200,
    ),
)

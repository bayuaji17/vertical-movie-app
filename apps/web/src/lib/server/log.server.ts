import { getRequest } from '@tanstack/react-start/server'
import { errorFields, requestIdFrom } from '@repo/log'
import { CatalogRequestError } from '../catalog/catalog-client'
import { webLog } from './web-log'

const ids = new WeakMap<Request, string>()
/** One request ID per incoming page request; SSR reads forward it to the API. */
export function ssrRequestId() {
  const request = getRequest()
  let id = ids.get(request)
  if (!id) {
    id = requestIdFrom(request.headers)
    ids.set(request, id)
  }
  return id
}
/** Log failures of a server-side API read; the error is rethrown untouched. */
export async function observeServerRead<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  const started = performance.now()
  const fields = () => ({
    requestId: ssrRequestId(),
    operation,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
  })
  try {
    const result = await run()
    webLog.debug('ssr.api', fields())
    return result
  } catch (error) {
    const status =
      error instanceof CatalogRequestError ? error.status : undefined
    const aborted = error instanceof Error && error.name === 'AbortError'
    const level = aborted
      ? 'debug'
      : status !== undefined && status < 500
        ? 'info'
        : 'warn'
    webLog[level]('ssr.api_error', {
      ...fields(),
      status,
      // Expected 4xx answers need no stack; unknown failures keep it outside production.
      ...errorFields(
        error,
        process.env.NODE_ENV !== 'production' &&
          (status === undefined || status >= 500),
      ),
    })
    throw error
  }
}

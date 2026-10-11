import { createStart, createMiddleware } from '@tanstack/react-start'
import {
  getResponseStatus,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { requestIdHeader } from '@repo/log'
import { ssrRequestId } from './lib/server/log.server'

// Router rendering can replace the status selected by server-side adapters.
// Preserve auth failures and public content's unavailable/not-found responses.
const responseStatus = createMiddleware().server(async ({ next }) => {
  // Page responses carry the ID that SSR reads forward to the API.
  setResponseHeader(requestIdHeader, ssrRequestId())
  const result = await next()
  const status = getResponseStatus()
  if (status !== 403 && status !== 404 && status !== 503) return result
  return {
    ...result,
    response: new Response(result.response.body, {
      status,
      headers: new Headers([
        ...result.response.headers,
        [requestIdHeader, ssrRequestId()],
      ]),
    }),
  }
})
export const startInstance = createStart(() => ({
  requestMiddleware: [responseStatus],
}))

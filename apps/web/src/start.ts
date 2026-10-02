import { createStart, createMiddleware } from '@tanstack/react-start'
import { getResponseStatus } from '@tanstack/react-start/server'

// Router renders thrown beforeLoad errors with 500 in this installed version.
// Preserve the explicit status selected by our server-side auth adapter.
const responseStatus = createMiddleware().server(async ({ next }) => {
  const result = await next()
  const status = getResponseStatus()
  if (status !== 403 && status !== 503) return result
  return {
    ...result,
    response: new Response(result.response.body, {
      status,
      headers: result.response.headers,
    }),
  }
})
export const startInstance = createStart(() => ({
  requestMiddleware: [responseStatus],
}))

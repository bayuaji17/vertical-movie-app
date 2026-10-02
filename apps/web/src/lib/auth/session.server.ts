import { createServerOnlyFn } from '@tanstack/react-start'
import {
  getRequest,
  getResponseHeaders,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { readServerSession } from '@repo/auth/server'

export const readSessionOnServer = createServerOnlyFn(
  async (options: { signal?: AbortSignal } = {}) => {
    const request = getRequest()
    setResponseHeader('cache-control', 'private, no-store')
    return readServerSession({
      apiOrigin: process.env.API_INTERNAL_URL,
      cookie: request.headers.get('cookie') ?? undefined,
      signal: options.signal
        ? AbortSignal.any([request.signal, options.signal])
        : request.signal,
      onSetCookie: (cookies) => {
        const headers = getResponseHeaders()
        for (const cookie of cookies) headers.append('set-cookie', cookie)
      },
    })
  },
)

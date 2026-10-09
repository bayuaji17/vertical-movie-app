import { createApiClient } from '../api/client'
import type { ApiFetcher } from '../api/client'
import {
  settingsReceipt,
  verifiedPublicSettings,
  SettingsRequestError,
} from './model'

/** Bound the DTO before Eden parses JSON. Fill cancellation also covers the body. */
export async function boundedSettingsResponse(
  response: Response,
  signal: AbortSignal,
) {
  const reader = response.body?.getReader()
  if (!reader) return response
  const chunks: Uint8Array[] = []
  let size = 0
  const abort = () => {
    void reader.cancel().catch(() => undefined)
  }
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })
  try {
    for (;;) {
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      size += value.byteLength
      if (size > 16_384) {
        await reader.cancel()
        throw new SettingsRequestError(502)
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new Response(bytes, {
      status: response.status,
      headers: response.headers,
    })
  } finally {
    signal.removeEventListener('abort', abort)
    reader.releaseLock()
  }
}
export function createPublicSettingsClient(
  base: string,
  fetcher: ApiFetcher = fetch,
  now = Date.now,
) {
  const api = createApiClient(base, async (input, init) => {
    const signal = AbortSignal.any([
      ...(init?.signal ? [init.signal] : []),
      AbortSignal.timeout(10_000),
    ])
    const response = await fetcher(input, {
      ...init,
      headers: { accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal,
    })
    return boundedSettingsResponse(response, signal)
  })
  return {
    async read(signal: AbortSignal) {
      signal.throwIfAborted()
      const started = now()
      const r = await api['site-settings'].get({ fetch: { signal } })
      signal.throwIfAborted()
      if (r.error || r.status !== 200)
        throw new SettingsRequestError(r.status || 503)
      return settingsReceipt(verifiedPublicSettings(r.data), started)
    },
  }
}

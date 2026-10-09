import { createPublicSettingsClient } from './client'
import {
  publicSettingsDto,
  settingsReceipt,
  verifiedPublicSettings,
  SettingsRequestError,
} from './model'
import type { PublicSettingsData, PublicSettingsDto } from './model'
import type { ApiFetcher } from '../api/client'
import { apiOriginFromOrigin } from '../api/client'

function waiter<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const cleanup = () => signal.removeEventListener('abort', abort)
    if (signal.aborted) {
      void promise.catch(() => undefined)
      abort()
      return
    }
    signal.addEventListener('abort', abort, { once: true })
    promise.then(
      (v) => {
        cleanup()
        resolve(v)
      },
      (e) => {
        cleanup()
        reject(e)
      },
    )
  })
}
export class SettingsServerCache {
  private origin?: string
  private generation = 0
  private highestVersion = 0
  private entry?: PublicSettingsData
  private flight?: Promise<PublicSettingsDto>
  private failureUntil = 0
  constructor(
    private readonly options: {
      fetcher?: ApiFetcher
      now?: () => number
      timeoutMs?: number
    } = {},
  ) {}
  private now() {
    return (this.options.now ?? Date.now)()
  }
  useOrigin(value: string) {
    const origin = apiOriginFromOrigin(value)
    if (!origin) throw new SettingsRequestError(503)
    if (origin !== this.origin) {
      this.expire()
      this.origin = origin
      this.highestVersion = 0
    }
    return origin
  }
  expire(origin?: string) {
    if (origin && origin !== this.origin) return
    this.generation++
    this.entry = undefined
    this.flight = undefined
    this.failureUntil = 0
  }
  private current() {
    return this.entry ? publicSettingsDto(this.entry, this.now()) : undefined
  }
  prime(origin: string, value: unknown, started = this.now()) {
    if (origin !== this.origin) return
    const dto = verifiedPublicSettings(value)
    this.generation++
    this.flight = undefined
    this.failureUntil = 0
    if (dto.version < this.highestVersion) return
    this.highestVersion = dto.version
    const data = settingsReceipt(dto, started)
    this.entry = Object.freeze({
      ...data,
      item: Object.freeze({ ...data.item }),
    })
  }
  get(value: string, signal?: AbortSignal): Promise<PublicSettingsDto> {
    const origin = this.useOrigin(value),
      current = this.current()
    if (current && current.freshForMs > 0)
      return waiter(Promise.resolve(current), signal)
    if (this.flight) return waiter(this.flight, signal)
    if (this.now() < this.failureUntil)
      return waiter(Promise.reject(new SettingsRequestError(503)), signal)
    const generation = this.generation,
      controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 10_000,
    )
    const read = waiter(
      createPublicSettingsClient(
        origin,
        this.options.fetcher,
        this.options.now,
      ).read(controller.signal),
      controller.signal,
    )
    const flight = read
      .then((data) => {
        if (generation === this.generation) {
          if (data.version < this.highestVersion) {
            const latest = this.current()
            if (latest) return latest
            throw new SettingsRequestError(503)
          }
          this.highestVersion = data.version
          this.entry = Object.freeze({
            ...data,
            item: Object.freeze({ ...data.item }),
          })
          this.failureUntil = 0
        }
        const latest = this.current()
        if (latest && latest.version >= data.version) return latest
        return { ...publicSettingsDto(data, this.now()), freshForMs: 0 }
      })
      .catch(() => {
        if (generation === this.generation)
          this.failureUntil = this.now() + 5000
        else {
          const latest = this.current()
          if (latest && latest.freshForMs > 0) return latest
        }
        throw new SettingsRequestError(503)
      })
      .finally(() => {
        clearTimeout(timer)
        if (this.flight === flight) this.flight = undefined
      })
    this.flight = flight
    return waiter(flight, signal)
  }
}
// Public immutable DTO only. Each SSR request still owns its own QueryClient.
export const settingsServerCache = new SettingsServerCache()

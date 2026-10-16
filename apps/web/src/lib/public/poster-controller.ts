import type { SignedPoster } from './catalog-model'

// Wait before the n-th consecutive retry, in ms; the last value repeats.
export const posterRetryDelaysMs = [2_000, 5_000, 15_000, 30_000, 60_000]
// A new URL is requested once this share of the current URL's lifetime is used.
export const posterRenewShare = 0.8

export type PosterView = {
  /** The poster to show. Once set it is never removed, only replaced. */
  src: string | undefined
  /** True only while no poster has ever been shown and loading keeps failing. */
  failed: boolean
  busy: boolean
}
export type PosterControllerDeps = {
  /** Asks the API for a fresh poster URL. */
  request: (signal: AbortSignal) => Promise<SignedPoster>
  /** Resolves when the image at `url` has loaded; rejects if it cannot. */
  preload: (url: string, signal: AbortSignal) => Promise<void>
  onChange: (view: PosterView) => void
  now?: () => number
  setTimer?: (run: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}
type Current = { src: string; expiresAt: number; renewAt: number }

/**
 * Keeps one poster on screen for as long as the page lives. The URL it uses is
 * temporary, so a new one is fetched and preloaded in the background and only
 * swapped in once it works. A displayed poster is never cleared because of time
 * or because a refresh failed.
 */
export class PosterController {
  private current: Current | undefined
  private failures = 0
  private active = false
  private inflight: AbortController | undefined
  private timer: unknown
  private disposed = false
  private view: PosterView = { src: undefined, failed: false, busy: false }
  private readonly now: () => number
  private readonly setTimer: (run: () => void, ms: number) => unknown
  private readonly clearTimer: (handle: unknown) => void
  constructor(private readonly deps: PosterControllerDeps) {
    this.now = deps.now ?? (() => Date.now())
    this.setTimer = deps.setTimer ?? ((run, ms) => setTimeout(run, ms))
    this.clearTimer =
      deps.clearTimer ??
      ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  }
  get snapshot() {
    return this.view
  }
  /** Run while the poster is on screen and the browser is online. */
  setActive(active: boolean) {
    if (this.disposed || this.active === active) return
    this.active = active
    if (active) this.check()
    else {
      this.cancelTimer()
      // A request that is already running may finish: it only swaps on success.
    }
  }
  /** Something happened that may mean the URL needs renewing (focus, visibility, online). */
  check() {
    if (this.disposed || !this.active || this.inflight) return
    if (!this.current || this.now() >= this.current.renewAt) void this.load()
    else this.schedule(this.current.renewAt - this.now())
  }
  /** The displayed image failed to load again (e.g. cache cleared): get a new URL now. */
  imageFailed() {
    if (this.current) this.current = { ...this.current, renewAt: 0 }
    this.check()
  }
  /** User action after a visible failure. */
  retry() {
    this.failures = 0
    this.cancelTimer()
    if (this.active && !this.inflight) void this.load()
  }
  dispose() {
    this.disposed = true
    this.cancelTimer()
    this.inflight?.abort()
  }
  private emit(patch: Partial<PosterView>) {
    this.view = { ...this.view, ...patch }
    this.deps.onChange(this.view)
  }
  private cancelTimer() {
    if (this.timer !== undefined) this.clearTimer(this.timer)
    this.timer = undefined
  }
  private schedule(ms: number) {
    this.cancelTimer()
    this.timer = this.setTimer(
      () => {
        this.timer = undefined
        this.check()
      },
      Math.max(0, ms),
    )
  }
  private async load() {
    const controller = new AbortController()
    this.inflight = controller
    this.cancelTimer()
    this.emit({ busy: true })
    try {
      const packet = await this.deps.request(controller.signal)
      const expiresAt = Date.parse(packet.expiresAt),
        issued = this.now()
      if (!Number.isFinite(expiresAt) || expiresAt <= issued)
        throw new Error('Poster URL is already expired.')
      await this.deps.preload(packet.posterUrl, controller.signal)
      controller.signal.throwIfAborted()
      this.current = {
        src: packet.posterUrl,
        expiresAt,
        renewAt: issued + (expiresAt - issued) * posterRenewShare,
      }
      this.failures = 0
      this.inflight = undefined
      this.emit({ src: packet.posterUrl, failed: false, busy: false })
      if (this.active) this.schedule(this.current.renewAt - this.now())
    } catch {
      if (this.inflight === controller) this.inflight = undefined
      if (controller.signal.aborted || this.disposed) {
        this.emit({ busy: false })
        return
      }
      this.failures++
      // Showing nothing is the only visible failure; a poster on screen stays.
      this.emit({ busy: false, failed: !this.current })
      if (this.active)
        this.schedule(
          posterRetryDelaysMs[
            Math.min(this.failures, posterRetryDelaysMs.length) - 1
          ],
        )
    }
  }
}

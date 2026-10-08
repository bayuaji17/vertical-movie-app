import type { PublicVideo, SignedPoster } from './catalog-model'

type Consumer = {
  resolve: (value: SignedPoster) => void
  reject: (reason: unknown) => void
  signal: AbortSignal
  abort: () => void
}
type Job = {
  key: string
  video: PublicVideo
  controller: AbortController
  consumers: Set<Consumer>
  started: boolean
}
const keyFor = (video: PublicVideo) => video.id + ':' + video.slug

/** Ephemeral browser capability cache. It never enters QueryClient, SSR or persistence. */
export class PosterQueue {
  private readonly cache = new Map<string, SignedPoster>()
  private readonly jobs = new Map<string, Job>()
  private readonly waiting: Job[] = []
  private active = 0
  constructor(
    private readonly read: (
      video: PublicVideo,
      signal: AbortSignal,
    ) => Promise<SignedPoster>,
    private readonly now = () => Date.now(),
  ) {}
  invalidate(video: PublicVideo) {
    this.cache.delete(keyFor(video))
  }
  request(video: PublicVideo, signal: AbortSignal): Promise<SignedPoster> {
    if (signal.aborted) return Promise.reject(signal.reason)
    const key = keyFor(video),
      cached = this.cache.get(key)
    if (cached && Date.parse(cached.expiresAt) > this.now())
      return Promise.resolve(cached)
    this.cache.delete(key)
    let job = this.jobs.get(key)
    if (!job) {
      job = {
        key,
        video,
        controller: new AbortController(),
        consumers: new Set(),
        started: false,
      }
      this.jobs.set(key, job)
      this.waiting.push(job)
    }
    const target = job
    const result = new Promise<SignedPoster>((resolve, reject) => {
      const consumer: Consumer = {
        resolve,
        reject,
        signal,
        abort: () => {
          target.consumers.delete(consumer)
          signal.removeEventListener('abort', consumer.abort)
          reject(signal.reason)
          if (!target.consumers.size) {
            target.controller.abort(signal.reason)
            if (this.jobs.get(key) === target) this.jobs.delete(key)
          }
        },
      }
      target.consumers.add(consumer)
      signal.addEventListener('abort', consumer.abort, { once: true })
    })
    this.drain()
    return result
  }
  private drain() {
    while (this.active < 4 && this.waiting.length) {
      const job = this.waiting.shift()!
      if (!job.consumers.size) continue
      job.started = true
      this.active++
      void this.run(job)
    }
  }
  private async run(job: Job) {
    try {
      const value = await this.read(job.video, job.controller.signal)
      job.controller.signal.throwIfAborted()
      if (Date.parse(value.expiresAt) <= this.now())
        throw new Error('Poster expired before display.')
      if (job.consumers.size) {
        if (this.cache.size >= 100) this.cache.clear()
        this.cache.set(job.key, value)
      }
      for (const c of job.consumers) c.resolve(value)
    } catch (error) {
      for (const c of job.consumers) c.reject(error)
    } finally {
      for (const c of job.consumers)
        c.signal.removeEventListener('abort', c.abort)
      job.consumers.clear()
      if (this.jobs.get(job.key) === job) this.jobs.delete(job.key)
      this.active--
      this.drain()
    }
  }
}

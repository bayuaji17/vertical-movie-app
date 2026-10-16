import { expect, test } from 'bun:test'
import {
  PosterController,
  posterRenewShare,
  posterRetryDelaysMs,
} from '../src/lib/public/poster-controller'
import type { PosterView } from '../src/lib/public/poster-controller'
import type { SignedPoster } from '../src/lib/public/catalog-model'

const hour = 3_600_000
// A manual clock: timers run only when time is advanced.
function rig(options: { lifetimeMs?: number } = {}) {
  const lifetimeMs = options.lifetimeMs ?? 24 * hour
  let now = 1_000_000
  let sequence = 0
  const timers = new Map<number, { at: number; run: () => void }>()
  const views: PosterView[] = []
  const requests: number[] = []
  const preloads: string[] = []
  const plan = { requestFails: 0, preloadFails: 0 }
  const controller = new PosterController({
    now: () => now,
    setTimer: (run, ms) => {
      const id = ++sequence
      timers.set(id, { at: now + ms, run })
      return id
    },
    clearTimer: (id) => void timers.delete(id as number),
    request: async () => {
      requests.push(now)
      if (plan.requestFails > 0) {
        plan.requestFails--
        throw new Error('offline')
      }
      return {
        videoId: 'v',
        posterUrl: `https://storage.test/poster.webp?n=${requests.length}`,
        expiresAt: new Date(now + lifetimeMs).toISOString(),
      } satisfies SignedPoster
    },
    preload: async (url) => {
      preloads.push(url)
      if (plan.preloadFails > 0) {
        plan.preloadFails--
        throw new Error('image failed')
      }
    },
    onChange: (view) => views.push(view),
  })
  const settle = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  }
  const advance = async (ms: number) => {
    const target = now + ms
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, t]) => t.at <= target)
        .sort((a, b) => a[1].at - b[1].at)
        .at(0)
      if (!due) break
      timers.delete(due[0])
      now = Math.max(now, due[1].at)
      due[1].run()
      await settle()
    }
    now = target
    await settle()
  }
  return {
    controller,
    views,
    requests,
    preloads,
    plan,
    advance,
    settle,
    timers,
    clock: () => now,
  }
}

test('the first poster is shown only after it has loaded, then renewed before it expires', async () => {
  const t = rig()
  t.controller.setActive(true)
  await t.settle()
  expect(t.controller.snapshot).toEqual({
    src: 'https://storage.test/poster.webp?n=1',
    failed: false,
    busy: false,
  })
  expect(t.preloads).toEqual(['https://storage.test/poster.webp?n=1'])
  // Nothing happens until 80 % of the lifetime has passed…
  await t.advance(24 * hour * posterRenewShare - 1000)
  expect(t.requests).toHaveLength(1)
  // …then a new URL is fetched, preloaded and swapped in.
  await t.advance(2000)
  expect(t.requests).toHaveLength(2)
  expect(t.controller.snapshot.src).toBe('https://storage.test/poster.webp?n=2')
})
test('a displayed poster is never removed, however long the page stays open', async () => {
  const t = rig({ lifetimeMs: 120_000 }) // the old two-minute lifetime
  t.controller.setActive(true)
  await t.settle()
  for (let step = 0; step < 200; step++) await t.advance(60_000)
  expect(
    t.views.every(
      (view) => view.src === undefined || view.src.startsWith('https://'),
    ),
  ).toBe(true)
  // Once something was shown, no later state is without a source or "failed".
  const firstShown = t.views.findIndex((view) => view.src)
  expect(
    t.views.slice(firstShown).every((view) => view.src && !view.failed),
  ).toBe(true)
  expect(t.requests.length).toBeGreaterThan(50)
})
test('a failed refresh keeps the poster, retries with backoff and swaps when it works', async () => {
  const t = rig()
  t.controller.setActive(true)
  await t.settle()
  const shown = t.controller.snapshot.src
  await t.advance(24 * hour * posterRenewShare + 1)
  // The renewal is under way; make it fail four times in a row.
  t.plan.requestFails = 4
  const before = t.requests.length
  await t.advance(60 * hour)
  expect(t.controller.snapshot.src).toBeDefined()
  expect(t.controller.snapshot.failed).toBe(false)
  expect(t.requests.length).toBeGreaterThan(before)
  expect(shown).toBeDefined()
  // The retry gaps follow the backoff table.
  const gaps = t.requests
    .slice(before - 0)
    .map((at, i, all) => (i ? at - all[i - 1] : 0))
    .filter(Boolean)
  expect(
    gaps.slice(0, 3).every((gap, i) => gap >= posterRetryDelaysMs[i]),
  ).toBe(true)
})
test('without any poster yet, failures show the fallback and keep retrying quietly', async () => {
  const t = rig()
  t.plan.requestFails = 3
  t.controller.setActive(true)
  await t.settle()
  expect(t.controller.snapshot).toMatchObject({ src: undefined, failed: true })
  await t.advance(posterRetryDelaysMs[0])
  await t.advance(posterRetryDelaysMs[1])
  await t.advance(posterRetryDelaysMs[2])
  expect(t.controller.snapshot).toMatchObject({ failed: false })
  expect(t.controller.snapshot.src).toBeDefined()
  expect(t.requests).toHaveLength(4)
})
test('an image that fails to preload is not swapped in', async () => {
  const t = rig()
  t.controller.setActive(true)
  await t.settle()
  const shown = t.controller.snapshot.src
  t.plan.preloadFails = 1
  await t.advance(24 * hour * posterRenewShare + 1)
  expect(t.controller.snapshot.src).toBe(shown)
  await t.advance(posterRetryDelaysMs[0] + 1)
  expect(t.controller.snapshot.src).not.toBe(shown)
})
test('being hidden or offline pauses work; coming back renews a stale URL at once', async () => {
  const t = rig()
  t.controller.setActive(true)
  await t.settle()
  t.controller.setActive(false)
  expect(t.timers.size).toBe(0)
  await t.advance(3 * 24 * hour)
  expect(t.requests).toHaveLength(1)
  expect(t.controller.snapshot.src).toBeDefined()
  t.controller.setActive(true)
  await t.settle()
  expect(t.requests).toHaveLength(2)
  // A check while the URL is still fresh does nothing.
  t.controller.check()
  await t.settle()
  expect(t.requests).toHaveLength(2)
})
test('a displayed image that fails again asks for a new URL immediately', async () => {
  const t = rig()
  t.controller.setActive(true)
  await t.settle()
  const shown = t.controller.snapshot.src
  t.controller.imageFailed()
  await t.settle()
  expect(t.requests).toHaveLength(2)
  expect(t.controller.snapshot.src).not.toBe(shown)
})
test('retry restarts after a visible failure; dispose cancels everything', async () => {
  const t = rig()
  t.plan.requestFails = 1
  t.controller.setActive(true)
  await t.settle()
  expect(t.controller.snapshot.failed).toBe(true)
  t.controller.retry()
  await t.settle()
  expect(t.controller.snapshot.failed).toBe(false)
  t.controller.dispose()
  expect(t.timers.size).toBe(0)
  const requests = t.requests.length
  await t.advance(100 * hour)
  expect(t.requests).toHaveLength(requests)
})
test('an expired packet is rejected instead of shown', async () => {
  const t = rig({ lifetimeMs: -1000 })
  t.controller.setActive(true)
  await t.settle()
  expect(t.controller.snapshot).toMatchObject({ src: undefined, failed: true })
  expect(t.preloads).toHaveLength(0)
})

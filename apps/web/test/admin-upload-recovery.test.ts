import { expect, test } from 'bun:test'
import {
  UploadCoordinator,
  UploadManager,
} from '../src/lib/admin/upload-manager'
import { fingerprintFile } from '../src/lib/admin/file-fingerprint-core'
import type { MediaClient, MediaInitiate } from '../src/lib/admin/media-client'
import { MediaApiError } from '../src/lib/admin/media-errors'
import {
  inventoryFixture,
  uploadFixture,
  descriptorFixture,
} from './admin-media-fixture'

function fixture(coordinator = new UploadCoordinator()) {
  const inventory = inventoryFixture(),
    status = uploadFixture(3),
    requests: MediaInitiate[] = [],
    file = new File(['abc'], 'video.mp4', { type: 'video/mp4' })
  let puts = 0,
    commits = 0,
    posterProcesses = 0,
    statusCalls = 0
  const client: MediaClient = {
    owner: async () => inventory,
    status: async () => {
      statusCalls++
      return structuredClone(status)
    },
    initiate: async (input) => {
      requests.push(input)
      return structuredClone(status)
    },
    signPart: async (_id, n) => ({
      partNumber: n,
      url: 'http://storage.test/' + n,
      expiresAt: status.expiresAt,
      alreadyUploaded: false,
    }),
    complete: async () => {
      status.status = 'completed'
      if (status.processingMode === 'request') {
        status.canProcessPoster = true
        status.processing.state = 'uploaded'
        status.processing.jobState = 'queued'
      }
      return structuredClone(status)
    },
    processPoster: async (id) => {
      posterProcesses++
      expect(id).toBe(status.id)
      status.status = 'completed'
      status.processingMode = 'request'
      status.canProcessPoster = false
      status.processing.state = 'ready'
      status.processing.jobState = 'succeeded'
      status.processing.verifiedReadyAt = new Date().toISOString()
      return structuredClone(status)
    },
    abort: async () => {
      status.status = 'aborted'
      return structuredClone(status)
    },
  }
  const manager = new UploadManager({
    client,
    coordinator,
    changed: () => {},
    committed: async () => {
      commits++
    },
    hash: async (f) => fingerprintFile(f),
    lock: async (_name, op) => op(),
    put: async (_url, blob) => {
      puts++
      status.parts = [
        { partNumber: 1, etag: 'etag', sizeBytes: String(blob.size) },
      ]
      status.uploadedBytes = String(blob.size)
    },
  })
  manager.observe(inventory)
  return {
    manager,
    inventory,
    status,
    requests,
    file,
    client,
    puts: () => puts,
    commits: () => commits,
    posterProcesses: () => posterProcesses,
    statusCalls: () => statusCalls,
  }
}
test('normal upload confirms completion; unknown initiation retries the same immutable key', async () => {
  const f = fixture()
  let failed = true
  const original = f.client.initiate
  f.client.initiate = async (input) => {
    await original(input)
    if (failed) {
      failed = false
      throw Error('response lost')
    }
    return structuredClone(f.status)
  }
  f.manager.select('source', f.file)
  await f.manager.start('source')
  expect(f.manager.snapshot('source').phase).toBe('unknown')
  expect(f.puts()).toBe(0)
  await f.manager.start('source')
  expect(f.requests.length).toBe(2)
  expect(f.requests[0].idempotencyKey).toBe(f.requests[1].idempotencyKey)
  expect(f.manager.snapshot('source').phase).toBe('completed')
  expect(f.puts()).toBe(1)
  expect(f.commits()).toBe(1)
})
test('refresh recovery rejects a different same-name same-size file before status or PUT', async () => {
  const f = fixture(),
    descriptor = descriptorFixture()
  descriptor.expectedSha256 = await fingerprintFile(f.file)
  f.inventory.source!.active = descriptor
  f.manager.observe(f.inventory)
  f.manager.select(
    'source',
    new File(['abd'], 'video.mp4', { type: 'video/mp4' }),
  )
  await f.manager.start('source')
  expect(f.manager.snapshot('source').error?.code).toBe('FILE_MISMATCH')
  expect(f.puts()).toBe(0)
  expect(f.requests.length).toBe(0)
  f.manager.select('source', f.file)
  await f.manager.start('source')
  expect(f.puts()).toBe(1)
  expect(f.manager.snapshot('source').phase).toBe('completed')
})
test('poster upload automatically prepares the completed crop through the request endpoint', async () => {
  const f = fixture(),
    cover = new File(['abc'], 'cover.webp', { type: 'image/webp' })
  f.status.processingMode = 'request'
  f.manager.select('poster', cover)
  await f.manager.start('poster')
  expect(f.puts()).toBe(1)
  expect(f.posterProcesses()).toBe(1)
  expect(f.manager.snapshot('poster').phase).toBe('completed')
  expect(f.manager.snapshot('poster').status?.processing.state).toBe('ready')
  expect(f.commits()).toBe(1)
})
test('refresh recovery refuses a different crop before status or PUT and gives the explicit cancel-and-recrop path', async () => {
  const f = fixture(),
    expected = new File(['one'], 'cover.webp', { type: 'image/webp' }),
    wrong = new File(['two'], 'cover.webp', { type: 'image/webp' }),
    descriptor = descriptorFixture()
  descriptor.filename = expected.name
  descriptor.contentType = expected.type
  descriptor.sizeBytes = String(expected.size)
  descriptor.expectedSha256 = await fingerprintFile(expected)
  descriptor.processingMode = 'request'
  f.status.processingMode = 'request'
  f.inventory.poster.active = descriptor
  f.manager.observe(f.inventory)
  f.manager.select('poster', wrong)
  await f.manager.start('poster')
  expect(f.manager.snapshot('poster').error?.code).toBe('COVER_CROP_MISMATCH')
  expect(f.puts()).toBe(0)
  expect(f.posterProcesses()).toBe(0)
  expect(f.statusCalls()).toBe(0)
  expect(f.requests).toHaveLength(0)
  f.client.abort = async () => {
    f.status.status = 'aborted'
    return structuredClone(f.status)
  }
  await f.manager.cancel('poster')
  expect(f.manager.snapshot('poster').phase).toBe('idle')
})
test('Finish cover recovers an eligible completed session without retaining its File', async () => {
  const f = fixture(),
    descriptor = descriptorFixture()
  f.status.status = 'completed'
  f.status.processingMode = 'request'
  f.status.processing.state = 'uploaded'
  f.status.processing.jobState = 'queued'
  f.status.canProcessPoster = true
  descriptor.status = 'completed'
  descriptor.processingMode = 'request'
  descriptor.canResume = false
  descriptor.canProcessPoster = true
  f.inventory.poster.lastAttempt = descriptor
  f.inventory.poster.canProcessPoster = true
  f.inventory.poster.current = {
    id: f.status.assetId,
    state: 'uploaded',
    sizeBytes: f.status.sizeBytes,
    contentType: 'image/webp',
    originalAvailable: true,
    verifiedReadyAt: null,
    width: null,
    height: null,
    durationMs: null,
    processing: structuredClone(f.status.processing),
  }
  f.manager.observe(f.inventory)
  expect(f.manager.snapshot('poster').phase).toBe('needs-prepare')
  expect(f.manager.snapshot('poster').status).toBeUndefined()
  await f.manager.finishCover()
  expect(f.posterProcesses()).toBe(1)
  expect(f.manager.snapshot('poster').phase).toBe('completed')
  expect(f.puts()).toBe(0)
})
test('lost Prepare cover response is reconciled by status without replaying the POST', async () => {
  const f = fixture(),
    descriptor = descriptorFixture()
  f.status.status = 'completed'
  f.status.processingMode = 'request'
  f.status.canProcessPoster = true
  descriptor.status = 'completed'
  descriptor.processingMode = 'request'
  descriptor.canResume = false
  descriptor.canProcessPoster = true
  f.inventory.poster.lastAttempt = descriptor
  f.inventory.poster.canProcessPoster = true
  f.manager.observe(f.inventory)
  let processCalls = 0
  f.client.processPoster = async () => {
    processCalls++
    f.status.canProcessPoster = false
    f.status.processing.state = 'ready'
    f.status.processing.jobState = 'succeeded'
    f.status.processing.verifiedReadyAt = new Date().toISOString()
    throw Error('response lost')
  }
  await f.manager.finishCover()
  expect(processCalls).toBe(1)
  expect(f.manager.snapshot('poster').phase).toBe('completed')
  expect(f.manager.snapshot('poster').error).toBeUndefined()
})
test('busy Prepare cover reconciles to pending server work without holding a browser operation', async () => {
  const f = fixture(),
    descriptor = descriptorFixture()
  f.status.status = 'completed'
  f.status.processingMode = 'request'
  f.status.processing.state = 'processing'
  f.status.processing.jobState = 'running'
  descriptor.status = 'completed'
  descriptor.processingMode = 'request'
  descriptor.canResume = false
  descriptor.canProcessPoster = true
  f.inventory.poster.lastAttempt = descriptor
  f.inventory.poster.canProcessPoster = true
  f.manager.observe(f.inventory)
  let processCalls = 0
  f.client.processPoster = async () => {
    processCalls++
    throw new MediaApiError(
      409,
      'POSTER_PROCESSING_BUSY',
      'Processing is already running.',
    )
  }
  await f.manager.finishCover()
  expect(processCalls).toBe(1)
  expect(f.statusCalls()).toBe(1)
  expect(f.manager.snapshot('poster').phase).toBe('preparing')
  expect(f.manager.snapshot('poster').error).toBeUndefined()
  expect(f.manager.busy('poster')).toBe(false)
  await f.manager.checkStatus('poster')
  expect(f.statusCalls()).toBe(2)
})
test('lost completion response and cancel-vs-complete retain the completed result', async () => {
  const f = fixture()
  f.client.complete = async () => {
    f.status.status = 'completed'
    throw Error('response lost')
  }
  f.manager.select('source', f.file)
  await f.manager.start('source')
  expect(f.manager.snapshot('source').phase).toBe('completed')
  const g = fixture()
  g.inventory.source!.active = descriptorFixture()
  g.manager.observe(g.inventory)
  g.client.abort = async () => {
    g.status.status = 'completed'
    throw Error('complete won')
  }
  await g.manager.cancel('source')
  expect(g.manager.snapshot('source').phase).toBe('completed')
  expect(g.commits()).toBe(1)
})
test('ambiguous abort never reports cancellation; explicit status and terminal abort are recoverable', async () => {
  const f = fixture()
  f.inventory.source!.active = descriptorFixture()
  f.manager.observe(f.inventory)
  f.client.abort = async () => {
    throw Error('not confirmed')
  }
  await f.manager.cancel('source')
  expect(f.manager.snapshot('source').phase).toBe('unknown')
  expect(f.manager.snapshot('source').descriptor?.id).toBe(f.status.id)
  await f.manager.checkStatus('source')
  expect(f.manager.snapshot('source').phase).toBe('needs-file')
  f.client.abort = async () => {
    f.status.status = 'aborted'
    return structuredClone(f.status)
  }
  await f.manager.cancel('source')
  expect(f.manager.snapshot('source').phase).toBe('idle')
})
test('confirmed completed status releases retained files without auto-preparing a request cover', async () => {
  const source = fixture(),
    sourceDescriptor = descriptorFixture()
  source.status.status = 'completed'
  sourceDescriptor.expectedSha256 = await fingerprintFile(source.file)
  source.inventory.source!.active = sourceDescriptor
  source.manager.observe(source.inventory)
  source.manager.select('source', source.file)
  await source.manager.checkStatus('source')
  expect(source.manager.snapshot('source').phase).toBe('completed')
  expect(source.manager.snapshot('source').descriptor).toBeUndefined()
  expect(source.manager.canStart('source')).toBe(false)

  const poster = fixture(),
    cover = new File(['cover'], 'cover.webp', { type: 'image/webp' }),
    posterDescriptor = descriptorFixture()
  poster.status.status = 'completed'
  poster.status.processingMode = 'request'
  poster.status.canProcessPoster = true
  poster.status.processing.state = 'uploaded'
  poster.status.processing.jobState = 'queued'
  posterDescriptor.processingMode = 'request'
  posterDescriptor.canProcessPoster = true
  poster.inventory.poster.canProcessPoster = true
  poster.inventory.poster.lastAttempt = posterDescriptor
  poster.manager.observe(poster.inventory)
  poster.manager.select('poster', cover)
  await poster.manager.checkStatus('poster')
  expect(poster.manager.snapshot('poster').phase).toBe('needs-prepare')
  expect(poster.manager.snapshot('poster').previewUrl).toBeUndefined()
  expect(poster.manager.canStart('poster')).toBe(false)
  expect(poster.posterProcesses()).toBe(0)
  await poster.manager.finishCover()
  expect(poster.posterProcesses()).toBe(1)
  expect(poster.manager.snapshot('poster').phase).toBe('completed')
})
test('pause/dispose suppress late hash replies and the coordinator permits only one file operation', async () => {
  const coordinator = new UploadCoordinator(),
    a = fixture(coordinator),
    b = fixture(coordinator)
  let release!: () => void, started!: () => void
  const begun = new Promise<void>((r) => (started = r)),
    held = new Promise<void>((r) => (release = r))
  a.client.initiate = async (input) => {
    a.requests.push(input)
    started()
    await held
    return structuredClone(a.status)
  }
  a.manager.select('source', a.file)
  b.manager.select('source', b.file)
  const first = a.manager.start('source')
  await begun
  const second = b.manager.start('source')
  await Bun.sleep(5)
  expect(b.requests.length).toBe(0)
  b.manager.dispose()
  a.manager.pause('source')
  release()
  await Promise.all([first, second])
  expect(a.puts()).toBe(0)
  expect(b.puts()).toBe(0)
  expect(b.requests.length).toBe(0)
  expect(a.manager.snapshot('source').phase).toBe('paused')
})

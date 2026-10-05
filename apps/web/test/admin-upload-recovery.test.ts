import { expect, test } from 'bun:test'
import {
  UploadCoordinator,
  UploadManager,
} from '../src/lib/admin/upload-manager'
import { fingerprintFile } from '../src/lib/admin/file-fingerprint-core'
import type { MediaClient, MediaInitiate } from '../src/lib/admin/media-client'
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
    commits = 0
  const client: MediaClient = {
    owner: async () => inventory,
    status: async () => structuredClone(status),
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

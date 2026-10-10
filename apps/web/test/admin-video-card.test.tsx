import { expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { VideoCard } from '../src/components/admin/setup/video-card'
import { selectAndStart } from '../src/lib/admin/auto-upload'
import type { RoleInventory } from '../src/lib/admin/media-client'
import type { UploadPhase, UploadView } from '../src/lib/admin/upload-state'
import { emptyUpload } from '../src/lib/admin/upload-state'
import { videoStage, videoStatus } from '../src/lib/admin/video-status'
import { inventoryFixture } from './admin-media-fixture'

const empty = (): RoleInventory => inventoryFixture().source!
const withCurrent = (current: Record<string, unknown>): RoleInventory => ({
  ...empty(),
  current: current as never,
})
const ready = () =>
  withCurrent({
    state: 'ready',
    verifiedReadyAt: '2026-10-10T00:00:00.000Z',
    processing: { jobState: 'succeeded' },
  })
const view = (
  phase: UploadPhase,
  over: Partial<UploadView> = {},
): UploadView => ({
  ...emptyUpload(),
  phase,
  ...over,
})

test('manager phases and server state collapse into one story', () => {
  const stage = (v: UploadView, role = empty()) => videoStage(v, role)
  expect(stage(emptyUpload())).toBe('empty')
  for (const phase of ['selected', 'checking'] as const)
    expect(stage(view(phase))).toBe('checking')
  for (const phase of ['queued', 'starting', 'uploading'] as const)
    expect(stage(view(phase))).toBe('uploading')
  expect(stage(view('finalizing'))).toBe('finishing')
  expect(stage(view('paused'))).toBe('paused')
  expect(stage(view('needs-file'))).toBe('needs-file')
  expect(stage(view('unknown'))).toBe('unknown')
  expect(stage(view('failed'))).toBe('failed')
  expect(stage(view('cancelling'))).toBe('cancelling')
  // After the upload completes the server drives the rest.
  expect(stage(view('completed'))).toBe('processing')
  expect(
    stage(
      emptyUpload(),
      withCurrent({ state: 'processing', processing: { jobState: 'running' } }),
    ),
  ).toBe('processing')
  expect(stage(emptyUpload(), ready())).toBe('ready')
  expect(
    stage(
      emptyUpload(),
      withCurrent({ state: 'failed', processing: { jobState: 'failed' } }),
    ),
  ).toBe('failed')
})

test('steps and percent reflect Uploading → Processing → Ready', () => {
  const states = (s: ReturnType<typeof videoStatus>) =>
    s.steps.map((step) => step.state)
  expect(states(videoStatus(emptyUpload(), empty()))).toEqual([
    'todo',
    'todo',
    'todo',
  ])
  const uploading = videoStatus(
    view('uploading', { progress: { sent: 538, verified: 538, total: 842 } }),
    empty(),
  )
  expect(states(uploading)).toEqual(['current', 'todo', 'todo'])
  expect(uploading.percent).toBe(63)
  const checking = videoStatus(
    view('checking', {
      hashBytes: 50,
      progress: { sent: 0, verified: 0, total: 200 },
    }),
    empty(),
  )
  expect(checking.percent).toBe(25)
  const processing = videoStatus(view('completed'), empty())
  expect(states(processing)).toEqual(['done', 'current', 'todo'])
  expect(processing.percent).toBeUndefined()
  expect(states(videoStatus(emptyUpload(), ready()))).toEqual([
    'done',
    'done',
    'done',
  ])
  expect(videoStatus(view('uploading'), empty()).percent).toBe(0)
})

test('selecting a file starts the upload only when the file was accepted', () => {
  const calls: string[] = []
  const manager = (accept: boolean) => ({
    select: (kind: string) => void calls.push(`select:${kind}`),
    canStart: () => accept,
    start: (kind: string) => {
      calls.push(`start:${kind}`)
      return Promise.resolve()
    },
  })
  const file = new File(['x'], 'film.mp4', { type: 'video/mp4' })
  expect(selectAndStart(manager(true) as never, 'source', file)).toBe(true)
  expect(calls).toEqual(['select:source', 'start:source'])
  calls.length = 0
  expect(selectAndStart(manager(false) as never, 'source', file)).toBe(false)
  expect(calls).toEqual(['select:source'])
  calls.length = 0
  expect(selectAndStart(manager(true) as never, 'source', undefined)).toBe(
    false,
  )
  expect(calls).toEqual([])
})

function render(role: RoleInventory, canUpload = true) {
  const inventory = { ...inventoryFixture(), source: role, canUpload }
  return renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <VideoCard inventory={inventory} />
    </QueryClientProvider>,
  ).replaceAll('<!-- -->', '')
}

test('empty video card offers one choose action with the format limits and no manual status buttons', () => {
  const html = render(empty())
  expect(html).toContain('Choose video')
  expect(html).toContain('MP4, MOV, MKV, WEBM')
  expect(html).toContain('portrait 9:16')
  expect(html).toContain('aria-label="Video status"')
  for (const manual of ['Check status', 'Refresh media', 'Upload file'])
    expect(html).not.toContain(manual)
})

test('ready, processing and read-only states render the right summary', () => {
  const readyHtml = render(ready())
  expect(readyHtml).toContain('Ready')
  expect(readyHtml).toContain('Replace video')
  expect(readyHtml).toContain('You can preview it')
  const processing = render(
    withCurrent({ state: 'processing', processing: { jobState: 'running' } }),
  )
  expect(processing).toContain('Processing')
  expect(processing).not.toContain('Replace video')
  const readOnly = render(empty(), false)
  expect(readOnly).toContain('Uploads are available only for active drafts.')
  expect(readOnly).not.toContain('Choose video')
})

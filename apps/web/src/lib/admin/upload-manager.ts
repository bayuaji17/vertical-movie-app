import type {
  MediaClient,
  MediaInitiate,
  MediaKind,
  OwnerMedia,
  UploadDescriptor,
  UploadStatus,
} from './media-client'
import { MediaApiError, mediaFailure } from './media-errors'
import { describeMediaFile, verifyReselectedFile } from './media-file'
import { hashFile } from './file-fingerprint'
import { scheduleUpload } from './upload-scheduler'
import type { PartPut } from './upload-transport'
import { emptyUpload, isUploadWorking, sessionPhase } from './upload-state'
import type { UploadView } from './upload-state'

export class UploadCoordinator {
  private tail = Promise.resolve()
  run(operation: () => Promise<void>, signal: AbortSignal) {
    const pending = this.tail.then(async () => {
      if (signal.aborted) throw new DOMException('Upload paused', 'AbortError')
      await operation()
    })
    this.tail = pending.catch(() => {})
    return pending
  }
}
type Slot = {
  view: UploadView
  file?: File
  request?: MediaInitiate
  controller?: AbortController
  epoch: number
}
type BrowserLock = (
  name: string,
  operation: () => Promise<void>,
) => Promise<void>
function coverPhase(status: UploadStatus): UploadView['phase'] {
  if (status.processing.state === 'ready' && status.processing.verifiedReadyAt)
    return 'completed'
  if (status.processing.state === 'failed') return 'failed'
  if (status.canProcessPoster) return 'needs-prepare'
  if (
    ['uploaded', 'processing'].includes(status.processing.state) ||
    ['queued', 'running', 'retry'].includes(status.processing.jobState ?? '')
  )
    return 'preparing'
  return 'unknown'
}
function statusDescriptor(
  previous: UploadDescriptor | undefined,
  status: UploadStatus,
): UploadDescriptor | undefined {
  if (!previous) return undefined
  return {
    ...previous,
    status: status.status,
    expiresAt: status.expiresAt,
    completedAt: status.completedAt,
    failureCode: status.failureCode,
    canResume: false,
    processingMode: status.processingMode,
    canProcessPoster: status.canProcessPoster,
  }
}
export const uploadBrowserLock: BrowserLock = async (name, operation) => {
  if (typeof navigator === 'undefined') return operation()
  const locks = (navigator as Partial<Navigator>).locks
  if (!locks) return operation()
  await locks.request(name, { ifAvailable: true }, async (lock) => {
    if (!lock)
      throw new MediaApiError(
        409,
        'ANOTHER_TAB',
        'Another tab is managing this upload.',
      )
    await operation()
  })
}
export class UploadManager {
  private slots: Record<MediaKind, Slot> = {
    source: { view: emptyUpload(), epoch: 0 },
    poster: { view: emptyUpload(), epoch: 0 },
  }
  private inventory?: OwnerMedia
  private disposed = false
  private progressAt = { source: 0, poster: 0 }
  constructor(
    private readonly options: {
      client: MediaClient
      coordinator: UploadCoordinator
      changed: () => void
      committed: () => Promise<void>
      hash?: typeof hashFile
      put?: PartPut
      lock?: BrowserLock
      online?: () => boolean
    },
  ) {}
  snapshot(kind: MediaKind) {
    return this.slots[kind].view
  }
  activate() {
    this.disposed = false
    if (this.inventory) this.observe(this.inventory)
  }
  private releasePreview(kind: MediaKind) {
    const url = this.slots[kind].view.previewUrl
    if (url) URL.revokeObjectURL(url)
    this.slots[kind].view = { ...this.slots[kind].view, previewUrl: undefined }
  }
  working() {
    return (['source', 'poster'] as const).some((kind) => this.busy(kind))
  }
  busy(kind: MediaKind) {
    return !!this.slots[kind].controller
  }
  private update(kind: MediaKind, patch: Partial<UploadView>) {
    if (this.disposed) return
    this.slots[kind].view = { ...this.slots[kind].view, ...patch }
    this.options.changed()
  }
  observe(inventory: OwnerMedia) {
    if (this.disposed) return
    this.inventory = inventory
    if (!inventory.canUpload) this.pause(undefined, true)
    for (const kind of ['source', 'poster'] as const) {
      const role = inventory[kind],
        slot = this.slots[kind]
      if (this.busy(kind)) continue
      const active = role?.active
      const recoverablePoster =
        kind === 'poster' &&
        role?.canProcessPoster &&
        !slot.file &&
        slot.view.phase !== 'selected'
          ? role.lastAttempt
          : null
      const candidate = active ?? recoverablePoster
      if (
        candidate &&
        (!slot.view.descriptor || slot.view.descriptor.id === candidate.id)
      ) {
        this.update(kind, {
          descriptor: candidate,
          filename: candidate.filename,
          phase:
            candidate.status === 'completed'
              ? 'needs-prepare'
              : slot.file && candidate.canResume
                ? 'paused'
                : candidate.canResume
                  ? 'needs-file'
                  : 'unknown',
          progress: {
            ...slot.view.progress,
            total: Number(candidate.sizeBytes),
          },
        })
      } else if (
        kind === 'poster' &&
        (role?.canProcessPoster ||
          role?.active?.processingMode === 'request' ||
          role?.lastAttempt?.processingMode === 'request') &&
        slot.view.phase !== 'selected' &&
        slot.view.phase !== 'needs-file' &&
        !(slot.view.phase === 'paused' && slot.file) &&
        role.current
      ) {
        const phase =
          role.current.state === 'ready' && role.current.verifiedReadyAt
            ? 'completed'
            : role.current.state === 'failed'
              ? 'failed'
              : ['uploaded', 'processing'].includes(role.current.state) ||
                  ['queued', 'running', 'retry'].includes(
                    role.current.processing.jobState ?? '',
                  )
                ? 'preparing'
                : undefined
        if (phase)
          this.update(kind, {
            phase,
            ...(phase === 'preparing' || phase === 'completed'
              ? { error: undefined }
              : {}),
          })
      }
    }
  }
  select(kind: MediaKind, file: File) {
    const slot = this.slots[kind],
      inventory = this.inventory
    if (this.disposed || !inventory?.canUpload || this.busy(kind)) return
    try {
      describeMediaFile(file, kind, inventory)
      const active = inventory[kind]?.active
      const descriptor =
        active ??
        (slot.view.descriptor?.status === 'pending'
          ? slot.view.descriptor
          : undefined)
      if (slot.view.descriptor?.status === 'completed') slot.request = undefined
      // Preserve an ambiguous initiation key until the server confirms its outcome.
      slot.file = file
      this.releasePreview(kind)
      this.update(kind, {
        phase: 'selected',
        filename: file.name,
        previewUrl: kind === 'poster' ? URL.createObjectURL(file) : undefined,
        error: undefined,
        hashBytes: 0,
        descriptor,
        progress: { sent: 0, verified: 0, total: file.size },
      })
    } catch (error) {
      this.update(kind, { error: mediaFailure(error) })
    }
  }
  clear(kind: MediaKind) {
    const slot = this.slots[kind]
    if (isUploadWorking(slot.view) || slot.view.descriptor) return
    this.releasePreview(kind)
    slot.file = undefined
    slot.request = undefined
    slot.view = emptyUpload()
    this.options.changed()
  }
  canStart(kind: MediaKind) {
    const slot = this.slots[kind]
    return (
      !!slot.file &&
      !!this.inventory?.canUpload &&
      !this.busy(kind) &&
      (!slot.view.descriptor || slot.view.descriptor.canResume)
    )
  }
  pause(kind?: MediaKind, dropFiles = false) {
    for (const key of kind ? [kind] : (['source', 'poster'] as const)) {
      const slot = this.slots[key]
      slot.epoch++
      slot.controller?.abort()
      slot.controller = undefined
      if (dropFiles) {
        slot.file = undefined
        this.releasePreview(key)
      }
      if (isUploadWorking(slot.view) || dropFiles)
        this.update(key, {
          phase: slot.view.descriptor
            ? dropFiles
              ? 'needs-file'
              : 'paused'
            : dropFiles
              ? 'idle'
              : 'paused',
        })
    }
  }
  dispose() {
    this.pause(undefined, true)
    for (const slot of Object.values(this.slots)) {
      slot.file = undefined
      slot.request = undefined
      slot.view = emptyUpload()
    }
    this.disposed = true
  }
  private alive(kind: MediaKind, epoch: number, signal: AbortSignal) {
    return !this.disposed && this.slots[kind].epoch === epoch && !signal.aborted
  }
  async start(kind: MediaKind) {
    const slot = this.slots[kind]
    if (
      this.disposed ||
      this.busy(kind) ||
      !slot.file ||
      !this.inventory?.canUpload
    )
      return
    if (!(
      this.options.online?.() ??
      (typeof navigator === 'undefined' || navigator.onLine !== false)
    )) {
      this.update(kind, {
        phase: 'paused',
        error: mediaFailure(
          new MediaApiError(0, 'OFFLINE', 'Reconnect before resuming.'),
        ),
      })
      return
    }
    const controller = new AbortController(),
      epoch = ++slot.epoch
    slot.controller = controller
    this.update(kind, { phase: 'queued', error: undefined })
    try {
      await this.options.coordinator.run(
        () =>
          (this.options.lock ?? uploadBrowserLock)(
            `admin-upload:${this.inventory!.ownerType}:${this.inventory!.ownerId}:${kind}`,
            () => this.run(kind, epoch, controller.signal),
          ),
        controller.signal,
      )
    } catch (error) {
      if (this.alive(kind, epoch, controller.signal))
        this.update(kind, {
          phase: slot.view.descriptor || slot.request ? 'unknown' : 'failed',
          error: mediaFailure(error),
        })
    } finally {
      if (slot.controller === controller) slot.controller = undefined
    }
  }
  private async run(kind: MediaKind, epoch: number, signal: AbortSignal) {
    const slot = this.slots[kind],
      inventory = this.inventory!,
      file = slot.file!
    const check = () => {
      if (!this.alive(kind, epoch, signal))
        throw new DOMException('Upload paused', 'AbortError')
    }
    const owner = { ownerType: inventory.ownerType, ownerId: inventory.ownerId }
    check()
    this.update(kind, { phase: 'checking' })
    const progress = {
      signal,
      onProgress: (hashBytes: number) => {
        if (this.alive(kind, epoch, signal)) this.update(kind, { hashBytes })
      },
    }
    const descriptor = slot.view.descriptor
    let digest: string
    try {
      digest = descriptor
        ? await verifyReselectedFile(
            file,
            descriptor,
            progress,
            this.options.hash ?? hashFile,
          )
        : await (this.options.hash ?? hashFile)(file, progress)
    } catch (error) {
      if (
        kind === 'poster' &&
        descriptor?.processingMode === 'request' &&
        error instanceof MediaApiError &&
        error.code === 'FILE_MISMATCH'
      )
        throw new MediaApiError(
          422,
          'COVER_CROP_MISMATCH',
          'The selected crop differs from the uploaded cover.',
        )
      throw error
    }
    check()
    let status: UploadStatus
    if (descriptor)
      status = await this.options.client.status(descriptor.id, signal)
    else {
      const metadata = describeMediaFile(file, kind, inventory)
      slot.request ??= {
        ...owner,
        kind,
        ...metadata,
        expectedSha256: digest,
        idempotencyKey: crypto.randomUUID(),
      }
      if (
        slot.request.expectedSha256 !== digest ||
        slot.request.filename !== file.name ||
        slot.request.sizeBytes !== String(file.size)
      )
        throw new MediaApiError(
          422,
          'FILE_MISMATCH',
          'Check the previous upload before selecting another file.',
        )
      this.update(kind, { phase: 'starting' })
      try {
        status = await this.options.client.initiate(slot.request, signal)
      } catch (error) {
        check()
        const fresh = await this.options.client.owner(owner, signal)
        check()
        const found = fresh[kind]?.active
        if (
          found &&
          found.expectedSha256 === digest &&
          found.filename === file.name &&
          found.sizeBytes === String(file.size) &&
          found.status === 'pending'
        )
          status = await this.options.client.status(found.id, signal)
        else throw error
      }
      check()
      const bound: UploadDescriptor = {
        id: status.id,
        assetId: status.assetId,
        status: status.status,
        ...metadata,
        partSizeBytes: status.partSizeBytes,
        partCount: status.partCount,
        expiresAt: status.expiresAt,
        completedAt: status.completedAt,
        failureCode: status.failureCode,
        expectedSha256: digest,
        canResume: status.status === 'pending',
        processingMode: status.processingMode,
        canProcessPoster: status.canProcessPoster,
      }
      this.update(kind, { descriptor: bound, status })
    }
    check()
    if (status.status === 'completed') {
      await this.uploadCompleted(kind, status, epoch, signal)
      return
    }
    this.update(kind, { phase: 'uploading', status })
    await scheduleUpload({
      file,
      id: status.id,
      client: this.options.client,
      signal,
      onProgress: (bytes) => {
        if (!this.alive(kind, epoch, signal)) return
        // Keep the latest snapshot without announcing every parallel XHR event.
        slot.view = { ...slot.view, progress: bytes }
        const now = Date.now()
        if (
          now - this.progressAt[kind] >= 200 ||
          bytes.verified === bytes.total
        ) {
          this.progressAt[kind] = now
          this.options.changed()
        }
      },
      put: this.options.put,
    })
    check()
    this.update(kind, { phase: 'finalizing' })
    try {
      status = await this.options.client.complete(status.id, signal)
    } catch (error) {
      check()
      status = await this.options.client.status(status.id, signal)
      check()
      if (status.status !== 'completed') throw error
    }
    check()
    await this.uploadCompleted(kind, status, epoch, signal)
  }
  private async uploadCompleted(
    kind: MediaKind,
    status: UploadStatus,
    epoch: number,
    signal: AbortSignal,
  ) {
    const slot = this.slots[kind]
    const coverStatusPhase =
      kind === 'poster' && status.processingMode === 'request'
        ? coverPhase(status)
        : undefined
    this.releasePreview(kind)
    slot.file = undefined
    slot.request = undefined
    this.update(kind, {
      phase: coverStatusPhase ?? 'completed',
      status,
      error: undefined,
      descriptor: coverStatusPhase
        ? statusDescriptor(slot.view.descriptor, status)
        : undefined,
      progress: {
        sent: Number(status.sizeBytes),
        verified: Number(status.sizeBytes),
        total: Number(status.sizeBytes),
      },
    })
    if (
      coverStatusPhase &&
      coverStatusPhase !== 'completed' &&
      coverStatusPhase !== 'failed'
    )
      await this.processCover(status.id, epoch, signal, false)
    if (this.alive(kind, epoch, signal)) await this.options.committed()
  }
  async finishCover() {
    const slot = this.slots.poster,
      status = slot.view.status,
      role = this.inventory?.poster,
      id = status?.canProcessPoster
        ? status.id
        : slot.view.descriptor?.canProcessPoster
          ? slot.view.descriptor.id
          : role?.canProcessPoster
            ? role.lastAttempt?.id
            : undefined
    if (this.disposed || this.busy('poster') || !id) return
    const controller = new AbortController(),
      epoch = ++slot.epoch
    slot.controller = controller
    try {
      await this.processCover(id, epoch, controller.signal)
    } finally {
      if (slot.controller === controller) slot.controller = undefined
    }
  }
  private async processCover(
    id: string,
    epoch: number,
    signal: AbortSignal,
    invalidate = true,
  ) {
    const check = () => {
      if (!this.alive('poster', epoch, signal))
        throw new DOMException('Cover processing paused', 'AbortError')
    }
    check()
    this.update('poster', { phase: 'preparing', error: undefined })
    try {
      const status = await this.options.client.processPoster(id, signal)
      check()
      this.presentCoverStatus(status)
      if (invalidate) await this.options.committed()
    } catch (error) {
      if (!this.alive('poster', epoch, signal)) return
      let status: UploadStatus | undefined
      try {
        status = await this.options.client.status(id, signal)
        check()
      } catch {
        if (!this.alive('poster', epoch, signal)) return
      }
      if (!status) {
        this.update('poster', {
          phase: 'unknown',
          error: mediaFailure(error),
        })
        if (invalidate) await this.options.committed()
        return
      }
      this.presentCoverStatus(status, error)
      if (invalidate) await this.options.committed()
    }
  }
  private presentCoverStatus(status: UploadStatus, cause?: unknown) {
    const slot = this.slots.poster,
      phase = coverPhase(status),
      descriptor = statusDescriptor(slot.view.descriptor, status),
      processingFailure = status.processing.failureCode,
      error =
        phase === 'completed' || phase === 'preparing'
          ? undefined
          : cause
            ? mediaFailure(cause)
            : processingFailure
              ? mediaFailure(new MediaApiError(422, processingFailure, ''))
              : undefined
    this.update('poster', {
      status,
      descriptor:
        phase === 'failed' || phase === 'completed' ? undefined : descriptor,
      phase,
      error,
    })
  }
  async checkStatus(kind: MediaKind) {
    const slot = this.slots[kind]
    if (this.disposed || this.busy(kind)) return
    const controller = new AbortController(),
      epoch = ++slot.epoch
    slot.controller = controller
    try {
      let id = slot.view.descriptor?.id
      if (!id && this.inventory) {
        const fresh = await this.options.client.owner(
          {
            ownerType: this.inventory.ownerType,
            ownerId: this.inventory.ownerId,
          },
          controller.signal,
        )
        if (!this.alive(kind, epoch, controller.signal)) return
        this.observe(fresh)
        const last = fresh[kind]?.lastAttempt
        id =
          fresh[kind]?.active?.id ??
          (kind === 'poster' && fresh.poster.canProcessPoster
            ? fresh.poster.lastAttempt?.id
            : undefined) ??
          (!slot.request || last?.expectedSha256 === slot.request.expectedSha256
            ? last?.id
            : undefined)
      }
      if (!id) return
      const status = await this.options.client.status(id, controller.signal)
      if (!this.alive(kind, epoch, controller.signal)) return
      if (status.status === 'completed') {
        if (kind === 'poster' && status.processingMode === 'request') {
          this.releasePreview(kind)
          slot.file = undefined
          slot.request = undefined
          this.update(kind, {
            progress: {
              sent: Number(status.sizeBytes),
              verified: Number(status.sizeBytes),
              total: Number(status.sizeBytes),
            },
          })
          this.presentCoverStatus(status)
          await this.options.committed()
        } else
          await this.uploadCompleted(kind, status, epoch, controller.signal)
      } else {
        this.update(kind, {
          status,
          phase:
            status.status === 'pending' && slot.file
              ? 'paused'
              : sessionPhase(status),
          error: undefined,
        })
        if (['aborted', 'expired', 'failed'].includes(status.status)) {
          this.releasePreview(kind)
          slot.file = undefined
          slot.request = undefined
          this.update(kind, { descriptor: undefined })
        }
      }
    } catch (error) {
      if (this.alive(kind, epoch, controller.signal))
        this.update(kind, { phase: 'unknown', error: mediaFailure(error) })
    } finally {
      if (slot.controller === controller) slot.controller = undefined
    }
  }
  async cancel(kind: MediaKind): Promise<void> {
    this.pause(kind)
    const slot = this.slots[kind],
      id = slot.view.descriptor?.id
    if (!id) {
      if (slot.request) {
        await this.checkStatus(kind)
        if (slot.view.descriptor) return this.cancel(kind)
        this.update(kind, { phase: 'unknown' })
        return
      }
      this.releasePreview(kind)
      slot.file = undefined
      slot.view = emptyUpload()
      this.options.changed()
      return
    }
    const controller = new AbortController(),
      epoch = ++slot.epoch
    slot.controller = controller
    this.update(kind, { phase: 'cancelling', error: undefined })
    try {
      let status: UploadStatus
      try {
        status = await this.options.client.abort(id, controller.signal)
      } catch {
        status = await this.options.client.status(id, controller.signal)
      }
      if (!this.alive(kind, epoch, controller.signal)) return
      if (status.status === 'completed')
        await this.uploadCompleted(kind, status, epoch, controller.signal)
      else if (status.status === 'aborted' || status.status === 'expired') {
        this.releasePreview(kind)
        slot.file = undefined
        slot.request = undefined
        slot.view = emptyUpload()
        this.options.changed()
        await this.options.committed()
      } else this.update(kind, { phase: 'unknown', status })
    } catch (error) {
      if (this.alive(kind, epoch, controller.signal))
        this.update(kind, { phase: 'unknown', error: mediaFailure(error) })
    } finally {
      if (slot.controller === controller) slot.controller = undefined
    }
  }
}

import type { ContentDetail } from './content-client'
import type { OwnerMedia } from './media-client'
import type {
  PublicationClient,
  PublicationReadiness,
  PublishVideoInput,
} from './publication-client'
import { PublicationApiError, publicationFailure } from './publication-errors'

export type PublicationAction = 'publish' | 'archive'
export type PublicationSnapshot = {
  detail: ContentDetail
  readiness: PublicationReadiness
  media: OwnerMedia
}
export type PublicationIntent = {
  action: PublicationAction
  expectedVersion: number
  idempotencyKey?: string
}
export type PublicationState = {
  phase:
    | 'idle'
    | 'loading'
    | 'review'
    | 'pending'
    | 'unknown'
    | 'retryable'
    | 'confirmed'
    | 'conflict'
    | 'error'
  action?: PublicationAction
  snapshot?: PublicationSnapshot
  message?: string
  refreshUnavailable?: boolean
}
export function snapshotMatches(s: PublicationSnapshot, id: string) {
  const d = s.detail
  return (
    d.type !== 'series' &&
    d.data.kind !== 'episode' &&
    d.data.id === id &&
    s.readiness.videoId === id &&
    s.readiness.kind === d.data.kind &&
    s.media.ownerType === 'video' &&
    s.media.ownerId === id &&
    d.data.rowVersion === s.readiness.rowVersion &&
    d.data.rowVersion === s.media.rowVersion &&
    d.data.publicationStatus === s.readiness.publicationStatus &&
    d.data.publicationStatus === s.media.status &&
    d.data.archivedAt === s.readiness.archivedAt
  )
}
function eligible(s: PublicationSnapshot, action: PublicationAction) {
  const status = s.readiness.publicationStatus
  return (
    !s.readiness.archivedAt &&
    (action === 'archive'
      ? status === 'published'
      : status === 'draft' &&
        s.readiness.canPublish &&
        s.media.canPreview &&
        !s.media.source?.busy &&
        !s.media.poster.busy)
  )
}
function fingerprint(s: PublicationSnapshot) {
  const asset = (role: OwnerMedia['source']) =>
    role
      ? [
          role.current?.id,
          role.current?.state,
          role.current?.verifiedReadyAt,
          role.current?.durationMs,
          role.active?.id,
          role.busy,
        ]
      : null
  return JSON.stringify([
    s.readiness.rowVersion,
    s.readiness.publicationStatus,
    s.readiness.canPublish,
    s.readiness.checks,
    s.media.canPreview,
    asset(s.media.source),
    asset(s.media.poster),
  ])
}
export class PublicationController {
  private state: PublicationState = { phase: 'idle' }
  private intent?: PublicationIntent
  private generation = 0
  private abort?: AbortController
  private stopped = false
  private working = false
  constructor(
    private readonly options: {
      id: string
      read: (signal: AbortSignal) => Promise<PublicationSnapshot>
      client: Pick<PublicationClient, 'publish' | 'archive'>
      invalidate: () => Promise<void>
      changed: () => void
      online: () => boolean
      uploadBusy: () => boolean
      uuid?: () => string
    },
  ) {}
  snapshot() {
    return this.state
  }
  activate() {
    this.stopped = false
  }
  dispose() {
    this.stopped = true
    this.generation++
    this.abort?.abort()
    this.abort = undefined
    this.intent = undefined
    this.state = { phase: 'idle' }
    this.working = false
  }
  cancel() {
    if (this.working || ['unknown', 'retryable'].includes(this.state.phase))
      return
    this.intent = undefined
    this.state = { phase: 'idle' }
    this.options.changed()
  }
  private update(state: PublicationState) {
    if (this.stopped) return
    this.state = state
    this.options.changed()
  }
  private guard() {
    if (!this.options.online())
      throw new PublicationApiError(0, 'OFFLINE', 'Offline')
    if (this.options.uploadBusy())
      throw new PublicationApiError(0, 'LOCAL_UPLOAD_BUSY', 'Upload busy')
  }
  private async run(
    task: (signal: AbortSignal, live: () => boolean) => Promise<void>,
    readOnly = false,
  ) {
    if (this.stopped || this.working) return
    this.working = true
    const generation = this.generation
    const abort = new AbortController()
    this.abort = abort
    const live = () =>
      !this.stopped && generation === this.generation && !abort.signal.aborted
    try {
      if (readOnly) {
        if (!this.options.online())
          throw new PublicationApiError(0, 'OFFLINE', 'Offline')
      } else this.guard()
      await task(abort.signal, live)
    } catch (error) {
      if (live())
        this.update({
          ...this.state,
          phase: this.intent ? 'unknown' : 'error',
          message: publicationFailure(error).message,
        })
    } finally {
      if (live()) {
        this.working = false
        this.abort = undefined
      }
    }
  }
  async prepare(action: PublicationAction) {
    if (this.intent || this.working) return
    await this.run(async (signal, live) => {
      this.update({ phase: 'loading', action })
      const s = await this.options.read(signal)
      if (!live()) return
      this.guard()
      if (!snapshotMatches(s, this.options.id) || !eligible(s, action)) {
        this.update({
          phase: 'conflict',
          snapshot: s,
          message:
            'Content or media has changed. Refresh status and review again.',
        })
        return
      }
      this.update({ phase: 'review', action, snapshot: s })
    })
  }
  async confirm(previewAcknowledged = false) {
    const review = this.state
    if (
      review.phase !== 'review' ||
      !review.action ||
      !review.snapshot ||
      (review.action === 'publish' && !previewAcknowledged)
    )
      return
    await this.run(async (signal, live) => {
      this.update({ ...review, phase: 'loading' })
      const s = await this.options.read(signal)
      if (!live()) return
      this.guard()
      if (
        !snapshotMatches(s, this.options.id) ||
        !eligible(s, review.action!) ||
        fingerprint(s) !== fingerprint(review.snapshot!)
      ) {
        this.update({
          phase: 'conflict',
          snapshot: s,
          message:
            'Content or media has changed. Refresh status and review again.',
        })
        return
      }
      this.intent = {
        action: review.action!,
        expectedVersion: s.readiness.rowVersion,
        ...(review.action === 'publish'
          ? { idempotencyKey: this.options.uuid?.() ?? crypto.randomUUID() }
          : {}),
      }
      await this.send(signal, live)
    })
  }
  private async send(signal: AbortSignal, live: () => boolean) {
    const intent = this.intent!
    this.update({
      ...this.state,
      phase: 'pending',
      action: intent.action,
      message: undefined,
    })
    let confirmed = false
    try {
      if (intent.action === 'publish')
        await this.options.client.publish(
          this.options.id,
          {
            expectedVersion: intent.expectedVersion,
            idempotencyKey: intent.idempotencyKey!,
          } satisfies PublishVideoInput,
          signal,
        )
      else
        await this.options.client.archive(
          this.options.id,
          { expectedVersion: intent.expectedVersion },
          signal,
        )
      confirmed = true
    } catch (error) {
      if (!live()) return
      const failure = publicationFailure(error)
      this.update({
        ...this.state,
        phase: failure.unknown ? 'unknown' : 'conflict',
        message: failure.message,
      })
      if (!failure.unknown) this.intent = undefined
    }
    if (!live()) return
    await this.options.invalidate().catch(() => {})
    if (!live()) return
    try {
      const s = await this.options.read(signal)
      if (!live()) return
      this.reconcile(s, confirmed)
    } catch {
      if (!live()) return
      if (confirmed) {
        this.intent = undefined
        this.update({
          phase: 'confirmed',
          action: intent.action,
          refreshUnavailable: true,
          message:
            intent.action === 'publish'
              ? 'Published. Status refresh is unavailable.'
              : 'Archived. Status refresh is unavailable.',
        })
      } else
        this.update({
          ...this.state,
          phase: this.intent ? 'unknown' : 'conflict',
          refreshUnavailable: true,
        })
    }
  }
  private reconcile(s: PublicationSnapshot, confirmed = false) {
    const intent = this.intent
    if (!snapshotMatches(s, this.options.id)) {
      if (confirmed) {
        this.intent = undefined
        this.update({
          phase: 'confirmed',
          action: intent?.action,
          refreshUnavailable: true,
          message: 'The operation completed. Status refresh is unavailable.',
        })
      } else
        this.update({
          ...this.state,
          phase: this.intent ? 'unknown' : 'conflict',
          message:
            'Showing previously loaded status. Refresh before continuing.',
        })
      return
    }
    const status = s.readiness.publicationStatus
    if (
      status === 'archived' ||
      (intent?.action === 'publish' && status === 'published')
    ) {
      this.intent = undefined
      this.update({
        phase: 'confirmed',
        snapshot: s,
        message:
          status === 'archived'
            ? 'This video is archived.'
            : 'This video is published.',
      })
      return
    }
    if (confirmed) {
      this.intent = undefined
      this.update({
        phase: 'confirmed',
        snapshot: s,
        message: 'The operation completed. The current state is shown.',
      })
      return
    }
    if (
      intent &&
      s.readiness.rowVersion === intent.expectedVersion &&
      eligible(s, intent.action)
    ) {
      this.update({
        phase: 'retryable',
        action: intent.action,
        snapshot: s,
        message:
          'The result remains unconfirmed. You can retry the same request explicitly.',
      })
      return
    }
    this.intent = undefined
    this.update({
      phase: 'idle',
      snapshot: s,
      message: 'Current publication status refreshed.',
    })
  }
  async check() {
    await this.run(async (signal, live) => {
      const old = this.state
      this.update({ ...old, phase: 'loading' })
      try {
        const s = await this.options.read(signal)
        if (live()) this.reconcile(s)
      } catch (error) {
        if (live())
          this.update({
            ...old,
            message: publicationFailure(error).message,
            refreshUnavailable: true,
          })
      }
    }, true)
  }
  async retry() {
    if (this.state.phase !== 'retryable' || !this.intent) return
    await this.run(async (signal, live) => {
      const s = await this.options.read(signal)
      if (!live()) return
      this.guard()
      const intent = this.intent!
      if (
        !snapshotMatches(s, this.options.id) ||
        s.readiness.rowVersion !== intent.expectedVersion ||
        !eligible(s, intent.action)
      ) {
        this.reconcile(s)
        return
      }
      await this.send(signal, live)
    })
  }
}

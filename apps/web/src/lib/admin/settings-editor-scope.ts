import { PrivateApiError } from '../api/private-result'
import {
  normalizedSettings,
  settingsFieldsSchema,
  settingsLimits,
} from '../settings/model'
import type { SiteSettings } from '../settings/model'
import type { PrivateSettingsData, SettingsClient } from './settings-client'

export type SettingsEditorState = {
  baseline?: PrivateSettingsData
  draft?: SiteSettings
  pending: boolean
  phase: 'loading' | 'ready' | 'saved' | 'conflict' | 'unknown'
  message: string
  remoteVersion?: number
}
const fields = (data: PrivateSettingsData): SiteSettings => {
  const { siteName, tagline, description, footerText } = data.item
  return { siteName, tagline, description, footerText }
}
const same = (a: SiteSettings, b: SiteSettings) =>
  Object.keys(settingsLimits).every(
    (k) => a[k as keyof SiteSettings] === b[k as keyof SiteSettings],
  )
export function settingsFieldErrors(draft?: SiteSettings) {
  const result: Partial<Record<keyof SiteSettings, string>> = {}
  if (!draft) return result
  const normalized = normalizedSettings(draft)
  for (const key of Object.keys(settingsLimits) as (keyof SiteSettings)[]) {
    const value = draft[key],
      trimmed = normalized[key]
    if (
      !settingsFieldsSchema.shape[key].safeParse(trimmed).success ||
      [...value].some((c) => {
        const n = c.codePointAt(0)!
        return n < 32 || (n >= 127 && n <= 159) || n === 0x2028 || n === 0x2029
      })
    )
      result[key] =
        key === 'siteName'
          ? `Use 1–${settingsLimits[key]} characters of single-line text.`
          : `Use up to ${settingsLimits[key]} characters of single-line text.`
  }
  return result
}
/** A mounted identity owns draft/attempt/abort state; auth loss destroys that scope. */
export class SettingsEditorScope {
  private controller = new AbortController()
  private active = false
  private listeners = new Set<() => void>()
  private state: SettingsEditorState = {
    pending: false,
    phase: 'loading',
    message: '',
  }
  private attempt?: { fields: SiteSettings; expectedVersion: number }
  get signal() {
    return this.controller.signal
  }
  get isActive() {
    return this.active && !this.signal.aborted
  }
  snapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private update(change: Partial<SettingsEditorState>) {
    this.state = { ...this.state, ...change }
    for (const listener of this.listeners) listener()
  }
  activate() {
    if (this.signal.aborted) this.controller = new AbortController()
    this.active = true
    this.update({})
  }
  stop() {
    this.active = false
    this.controller.abort()
    this.attempt = undefined
    this.state = { pending: false, phase: 'loading', message: '' }
    for (const listener of this.listeners) listener()
  }
  accepts(signal: AbortSignal) {
    return this.isActive && signal === this.signal
  }
  get dirty() {
    return !!(
      this.state.draft &&
      this.state.baseline &&
      !same(normalizedSettings(this.state.draft), fields(this.state.baseline))
    )
  }
  get errors() {
    return settingsFieldErrors(this.state.draft)
  }
  private adopt(data: PrivateSettingsData, message = '') {
    this.update({
      baseline: data,
      draft: fields(data),
      remoteVersion: undefined,
      pending: false,
      phase: 'ready',
      message,
    })
  }
  observe(data: PrivateSettingsData) {
    if (
      !this.isActive ||
      this.state.pending ||
      (this.state.baseline &&
        data.item.rowVersion < this.state.baseline.item.rowVersion)
    )
      return
    if (
      this.dirty ||
      this.state.phase === 'conflict' ||
      this.state.phase === 'unknown'
    ) {
      if (data.item.rowVersion > (this.state.baseline?.item.rowVersion ?? 0))
        this.update({ remoteVersion: data.item.rowVersion })
      return
    }
    if (this.state.baseline?.item.rowVersion === data.item.rowVersion) {
      if (this.state.baseline.expiresAt !== data.expiresAt)
        this.update({ baseline: data })
      return
    }
    this.adopt(data)
  }
  edit(key: keyof SiteSettings, value: string) {
    if (this.state.pending || !this.isActive || !this.state.draft) return
    this.update({
      draft: { ...this.state.draft, [key]: value },
      phase: this.state.phase === 'saved' ? 'ready' : this.state.phase,
      message: '',
    })
  }
  cancel() {
    if (this.state.baseline && !this.state.pending) {
      this.attempt = undefined
      this.adopt(this.state.baseline, 'Changes discarded.')
    }
  }
  async save(
    client: SettingsClient,
    accept: (
      data: PrivateSettingsData,
      signal: AbortSignal,
    ) => Promise<PrivateSettingsData>,
    online = true,
  ) {
    if (
      !this.isActive ||
      this.state.pending ||
      !online ||
      !this.dirty ||
      Object.keys(this.errors).length ||
      this.state.phase === 'unknown' ||
      this.state.phase === 'conflict' ||
      !this.state.draft ||
      !this.state.baseline
    )
      return
    const signal = this.signal,
      attempt = {
        fields: normalizedSettings(this.state.draft),
        expectedVersion: this.state.baseline.item.rowVersion,
      }
    this.attempt = attempt
    this.update({ pending: true, message: '' })
    try {
      const result = await client.save(
        { ...attempt.fields, expectedVersion: attempt.expectedVersion },
        signal,
      )
      if (!this.accepts(signal)) return
      const accepted = await accept(result, signal)
      if (!this.accepts(signal)) return
      this.adopt(accepted)
      this.attempt = undefined
      this.update({ phase: 'saved', message: 'Site settings saved.' })
    } catch (error) {
      if (!this.accepts(signal)) return
      const status = error instanceof PrivateApiError ? error.status : 0
      this.update({
        phase:
          status === 409 ? 'conflict' : status === 422 ? 'ready' : 'unknown',
        message:
          status === 409
            ? 'Saved values changed. Reload them before saving again.'
            : status === 422
              ? 'Settings were rejected. Review the fields.'
              : 'Save outcome is unknown. Check saved values before trying again.',
      })
    } finally {
      if (this.accepts(signal)) this.update({ pending: false })
    }
  }
  async reload(
    client: SettingsClient,
    accept: (
      data: PrivateSettingsData,
      signal: AbortSignal,
    ) => Promise<PrivateSettingsData>,
    checkAttempt = false,
  ) {
    if (!this.isActive || this.state.pending) return
    const signal = this.signal,
      attempt = this.attempt
    this.update({ pending: true, message: '' })
    try {
      const observed = await client.read(signal, true)
      if (!this.accepts(signal)) return
      const accepted = await accept(observed, signal)
      if (!this.accepts(signal)) return
      if (checkAttempt && attempt) {
        if (
          same(fields(accepted), attempt.fields) &&
          accepted.item.rowVersion > attempt.expectedVersion
        ) {
          this.adopt(accepted, 'Saved values match your last attempt.')
          this.attempt = undefined
        } else
          this.update({
            remoteVersion: accepted.item.rowVersion,
            phase:
              accepted.item.rowVersion > attempt.expectedVersion
                ? 'conflict'
                : 'ready',
            message:
              'Saved values differ from your last attempt. Your draft is retained.',
          })
      } else {
        this.adopt(accepted, 'Saved values reloaded.')
        this.attempt = undefined
      }
    } catch {
      if (this.accepts(signal))
        this.update({
          message: 'Saved values could not be checked. Your draft is retained.',
        })
    } finally {
      if (this.accepts(signal)) this.update({ pending: false })
    }
  }
}

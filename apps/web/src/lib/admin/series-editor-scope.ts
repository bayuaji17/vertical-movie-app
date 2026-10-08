// A mounted editor owns one generation. Auth loss, owner change and unmount
// invalidate every read/write/reload continuation before it can touch UI/cache.
export class SeriesEditorScope {
  private controller = new AbortController()
  private active = false
  activate() {
    if (this.controller.signal.aborted) this.controller = new AbortController()
    this.active = true
  }
  stop() {
    this.active = false
    this.controller.abort()
  }
  get signal() {
    return this.controller.signal
  }
  accepts(signal: AbortSignal) {
    return this.active && signal === this.signal && !signal.aborted
  }
}

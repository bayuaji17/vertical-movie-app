import { SETTINGS_TTL_MS, settingsUnavailable, verifiedRow } from "./model";
import type { SettingsRow } from "./model";
export type SettingsSnapshot = { item: SettingsRow; freshForMs: number };
export function waitFor<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) {
      void promise.catch(() => undefined);
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (v) => {
        cleanup();
        resolve(v);
      },
      (e) => {
        cleanup();
        reject(e);
      },
    );
  });
}
/** One immutable slot; authorisation and request cancellation are outside shared I/O. */
export class SettingsCache {
  private entry?: { item: SettingsRow; expiresAt: number };
  private generation = 0;
  private highestVersion = 0;
  private failureUntil = 0;
  private normal?: Promise<SettingsSnapshot>;
  private fresh?: Promise<SettingsSnapshot>;
  constructor(
    private readonly read: () => Promise<unknown>,
    private readonly now = Date.now,
  ) {}
  peek(): SettingsSnapshot | undefined {
    if (!this.entry) return;
    return {
      item: this.entry.item,
      freshForMs: Math.max(
        0,
        Math.min(SETTINGS_TTL_MS, this.entry.expiresAt - this.now()),
      ),
    };
  }
  expire() {
    this.generation++;
    this.entry = undefined;
    this.normal = undefined;
    this.fresh = undefined;
    this.failureUntil = 0;
  }
  prime(value: unknown, started = this.now()): SettingsSnapshot {
    const item = verifiedRow(value);
    this.generation++;
    this.normal = undefined;
    this.fresh = undefined;
    this.failureUntil = 0;
    if (item.rowVersion >= this.highestVersion) {
      this.highestVersion = item.rowVersion;
      this.entry = { item, expiresAt: started + SETTINGS_TTL_MS };
    }
    return this.peek() ?? { item, freshForMs: 0 };
  }
  get(forceFresh = false, signal?: AbortSignal): Promise<SettingsSnapshot> {
    const current = this.peek();
    if (!forceFresh && current && current.freshForMs > 0)
      return waitFor(Promise.resolve(current), signal);
    const slot = forceFresh ? "fresh" : "normal";
    if (this[slot]) return waitFor(this[slot]!, signal);
    if (this.now() < this.failureUntil)
      return waitFor(
        Promise.reject(new Error("Settings unavailable during read cooldown.")),
        signal,
      ).catch((e) => {
        if (e?.name === "AbortError") throw e;
        return settingsUnavailable();
      });
    const generation = this.generation,
      started = this.now();
    const flight = Promise.resolve()
      .then(() => this.read())
      .then((value) => {
        const item = verifiedRow(value);
        if (generation === this.generation) {
          if (item.rowVersion < this.highestVersion)
            return this.peek() ?? settingsUnavailable();
          this.highestVersion = item.rowVersion;
          this.entry = { item, expiresAt: started + SETTINGS_TTL_MS };
          this.failureUntil = 0;
        }
        const latest = this.peek();
        if (latest && latest.item.rowVersion >= item.rowVersion) return latest;
        return { item, freshForMs: 0 };
      })
      .catch(() => {
        if (generation === this.generation)
          this.failureUntil = this.now() + 5000;
        else {
          const latest = this.peek();
          if (latest && latest.freshForMs > 0) return latest;
        }
        return settingsUnavailable();
      })
      .finally(() => {
        if (this[slot] === flight) this[slot] = undefined;
      });
    this[slot] = flight;
    return waitFor(flight, signal);
  }
}

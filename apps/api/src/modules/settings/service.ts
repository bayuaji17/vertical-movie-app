import { SettingsCache } from "./cache";
import { ContentError } from "../../shared/content-error";
import { saveInput, settingsUnavailable, verifiedRow } from "./model";
import type { SettingsRow } from "./model";
import type { SettingsRepository } from "./repository";
export class SettingsService {
  readonly cache: SettingsCache;
  constructor(
    private readonly repository?: SettingsRepository,
    private readonly now = Date.now,
  ) {
    this.cache = new SettingsCache(() => this.readStored(), now);
  }
  snapshot(fresh = false, signal?: AbortSignal) {
    return this.cache.get(fresh, signal);
  }
  async read(): Promise<SettingsRow> {
    return (await this.snapshot()).item;
  }
  private async readStored(): Promise<SettingsRow> {
    try {
      return verifiedRow(
        await (this.repository ?? settingsUnavailable()).read(),
      );
    } catch {
      return settingsUnavailable();
    }
  }
  async save(input: unknown): Promise<SettingsRow> {
    const { fields, expectedVersion } = saveInput(input);
    const started = this.now();
    try {
      const row = await (this.repository ?? settingsUnavailable()).save(
        fields,
        expectedVersion,
      );
      if (!row) {
        await this.readStored();
        throw new ContentError(
          "SETTINGS_VERSION_CONFLICT",
          "Settings changed. Reload saved values before saving again.",
          409,
        );
      }
      return this.cache.prime(verifiedRow(row), started).item;
    } catch (e) {
      if (!(e instanceof ContentError) || e.httpStatus !== 409)
        this.cache.expire();
      if (e instanceof ContentError) throw e;
      return settingsUnavailable();
    }
  }
}

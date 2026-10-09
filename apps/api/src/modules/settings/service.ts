import { ContentError } from "../../shared/content-error";
import { saveInput, settingsUnavailable, verifiedRow } from "./model";
import type { SettingsRow } from "./model";
import type { SettingsRepository } from "./repository";
export class SettingsService {
  constructor(private readonly repository?: SettingsRepository) {}
  async read(): Promise<SettingsRow> {
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
    try {
      const row = await (this.repository ?? settingsUnavailable()).save(
        fields,
        expectedVersion,
      );
      if (!row) {
        await this.read();
        throw new ContentError(
          "SETTINGS_VERSION_CONFLICT",
          "Settings changed. Reload saved values before saving again.",
          409,
        );
      }
      return verifiedRow(row);
    } catch (e) {
      if (e instanceof ContentError) throw e;
      return settingsUnavailable();
    }
  }
}
